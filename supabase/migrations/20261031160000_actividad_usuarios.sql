-- Actividad de cada tienda para el Superadmin: lo que carga (productos, categorías), lo que cambia (ajustes,
-- pedidos, pagos), los pagos que envía, los cupones que usa, sus inicios de sesión y las pantallas que visita.
-- Además: estadísticas divididas por tipo de usuario (suscripción, cupón, sin plan).

create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  actor_id   uuid,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_store_idx on public.activity_log (store_id, created_at desc);

alter table public.activity_log enable row level security;
revoke all on public.activity_log from anon, authenticated;
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log for select using (is_superadmin());
grant select on public.activity_log to authenticated;

create or replace function public._log_activity(p_store uuid, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into activity_log (store_id, actor_id, action, detail) values (p_store, auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb));
$$;
revoke execute on function public._log_activity(uuid, text, jsonb) from public, anon, authenticated;

/** Desde la app: inicio de sesión y pantallas visitadas por el dueño (solo de su propia tienda) */
create or replace function public.log_my_activity(p_action text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  if p_action not in ('inicio_sesion', 'visita') then raise exception 'Acción no permitida'; end if;
  select id into v_store from stores where owner_id = auth.uid();
  if v_store is null then return; end if;
  perform _log_activity(v_store, p_action, jsonb_build_object('path', left(coalesce(p_detail ->> 'path', ''), 120)));
end;
$$;
revoke execute on function public.log_my_activity(text, jsonb) from public, anon;
grant execute on function public.log_my_activity(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Disparadores: registran solos lo que pasa en cada tabla
-- ---------------------------------------------------------------------
create or replace function public.trg_log_products()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform _log_activity(new.store_id, 'producto_creado', jsonb_build_object('nombre', new.name, 'precio', new.price, 'stock', new.stock));
  elsif tg_op = 'UPDATE' then
    if (new.name, new.description, new.price, new.stock, new.category_id, new.subcategory_id, new.image_url, new.is_active)
       is distinct from (old.name, old.description, old.price, old.stock, old.category_id, old.subcategory_id, old.image_url, old.is_active) then
      perform _log_activity(new.store_id, 'producto_editado', jsonb_build_object('nombre', new.name, 'precio', new.price, 'stock', new.stock));
    end if;
  else
    perform _log_activity(old.store_id, 'producto_eliminado', jsonb_build_object('nombre', old.name));
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists log_products on public.products;
create trigger log_products after insert or update or delete on public.products
  for each row execute function public.trg_log_products();

create or replace function public.trg_log_categories()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform _log_activity(new.store_id, 'categoria_creada', jsonb_build_object('nombre', new.name));
  elsif tg_op = 'DELETE' then
    perform _log_activity(old.store_id, 'categoria_eliminada', jsonb_build_object('nombre', old.name));
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists log_categories on public.categories;
create trigger log_categories after insert or delete on public.categories
  for each row execute function public.trg_log_categories();

-- Ajustes de la tienda: qué campos cambió (sin los que cambia el sistema)
create or replace function public.trg_log_stores()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_changed text[];
begin
  select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
   where n.value is distinct from o.value
     and n.key not in ('updated_at', 'plan', 'plan_cycle', 'plan_expires_at', 'trial_ends_at', 'coupon_code', 'commission_rate');
  if v_changed is not null then
    perform _log_activity(new.id, case when 'onboarding_completed' = any(v_changed) and new.onboarding_completed
                                       then 'configuracion_terminada' else 'ajustes_cambiados' end,
                          jsonb_build_object('campos', v_changed));
  end if;
  return new;
end;
$$;
drop trigger if exists log_stores on public.stores;
create trigger log_stores after update on public.stores
  for each row execute function public.trg_log_stores();

create or replace function public.trg_log_orders()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform _log_activity(new.store_id, 'venta_recibida', jsonb_build_object('pedido', new.order_number, 'total', new.total));
  elsif new.status is distinct from old.status then
    perform _log_activity(new.store_id, 'pedido_estado', jsonb_build_object('pedido', new.order_number, 'estado', new.status));
  end if;
  return new;
end;
$$;
drop trigger if exists log_orders on public.orders;
create trigger log_orders after insert or update of status on public.orders
  for each row execute function public.trg_log_orders();

create or replace function public.trg_log_payments_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('aprobado', 'rechazado') then
    perform _log_activity(new.store_id, 'pago_cliente_' || new.status, jsonb_build_object('referencia', new.reference));
  end if;
  return new;
end;
$$;
drop trigger if exists log_payments_review on public.payments;
create trigger log_payments_review after update of status on public.payments
  for each row execute function public.trg_log_payments_review();

create or replace function public.trg_log_own_payments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform _log_activity(new.store_id,
      case tg_table_name when 'subscription_payments' then 'pago_plan_enviado' else 'pago_comisiones_enviado' end,
      jsonb_build_object('monto', new.amount_usd, 'metodo', new.method, 'referencia', new.reference));
  elsif new.status is distinct from old.status then
    perform _log_activity(new.store_id,
      case tg_table_name when 'subscription_payments' then 'pago_plan_' else 'pago_comisiones_' end || new.status,
      jsonb_build_object('monto', new.amount_usd));
  end if;
  return new;
end;
$$;
drop trigger if exists log_subscription_payments on public.subscription_payments;
create trigger log_subscription_payments after insert or update of status on public.subscription_payments
  for each row execute function public.trg_log_own_payments();
drop trigger if exists log_commission_payments on public.commission_payments;
create trigger log_commission_payments after insert or update of status on public.commission_payments
  for each row execute function public.trg_log_own_payments();

create or replace function public.trg_log_coupon()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _log_activity(new.store_id, 'cupon_canjeado',
    jsonb_build_object('cupon', (select code from coupons where id = new.coupon_id), 'hasta', new.access_until));
  return new;
end;
$$;
drop trigger if exists log_coupon on public.coupon_redemptions;
create trigger log_coupon after insert on public.coupon_redemptions
  for each row execute function public.trg_log_coupon();

-- ---------------------------------------------------------------------
-- Estadísticas por tienda con su tipo de usuario
--   suscripcion: tiene o tuvo un plan pagado · cupon: entró con cupón y nunca pagó plan · sin_plan: ninguno
-- ---------------------------------------------------------------------
drop function if exists public.superadmin_store_stats();
create function public.superadmin_store_stats()
returns table (store_id uuid, name text, slug text, industry text, owner_email text, owner_name text, owner_phone text,
               is_active boolean, created_at timestamptz, segment text, plan text, plan_expires_at timestamptz,
               coupon_code text, trial_ends_at timestamptz, products bigint, sales bigint, revenue numeric,
               commission numeric, last_activity timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.name, s.slug, s.industry, p.email, p.full_name, p.phone, s.is_active, s.created_at,
         case when s.plan is not null then 'suscripcion' when s.coupon_code is not null then 'cupon' else 'sin_plan' end,
         s.plan, s.plan_expires_at, s.coupon_code, s.trial_ends_at,
         (select count(*) from products pr where pr.store_id = s.id),
         (select count(*) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.total), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.commission), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select max(a.created_at) from activity_log a where a.store_id = s.id)
    from stores s join profiles p on p.id = s.owner_id
   order by s.created_at desc;
end;
$$;
revoke execute on function public.superadmin_store_stats() from public, anon;
grant execute on function public.superadmin_store_stats() to authenticated;
