-- Pagos de comisiones de las tiendas a Linki App.
-- Cada venta pagada genera su comisión (orders.commission). La tienda paga una, varias o todas
-- con los métodos de la plataforma y el comprobante; el Superadmin aprueba o rechaza.
-- Estado de la comisión de un pedido: «pagada» si está en un pago aprobado, «en revisión» si está
-- en un pago pendiente y «por pagar» si no. Al rechazar un pago sus pedidos vuelven a «por pagar».

create table if not exists public.commission_payments (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  amount_usd   numeric(12,2) not null default 0,
  method       text not null check (method in ('pago_movil','paypal','binance')),
  reference    text not null default '',
  receipt_path text,
  status       text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index if not exists commission_payments_store_idx on public.commission_payments (store_id, created_at desc);
create index if not exists commission_payments_status_idx on public.commission_payments (status, created_at desc);

create table if not exists public.commission_payment_items (
  payment_id uuid not null references public.commission_payments(id) on delete cascade,
  order_id   uuid not null references public.orders(id) on delete cascade,
  amount     numeric(12,2) not null,
  primary key (payment_id, order_id)
);
create index if not exists commission_payment_items_order_idx on public.commission_payment_items (order_id);

-- Solo lectura desde el navegador; se crean y revisan con las funciones de abajo.
alter table public.commission_payments enable row level security;
drop policy if exists commission_payments_select on public.commission_payments;
create policy commission_payments_select on public.commission_payments for select
  using (owns_store(store_id) or is_superadmin());
grant select on public.commission_payments to authenticated;

alter table public.commission_payment_items enable row level security;
drop policy if exists commission_payment_items_select on public.commission_payment_items;
create policy commission_payment_items_select on public.commission_payment_items for select
  using (exists (select 1 from commission_payments cp
                  where cp.id = payment_id and (owns_store(cp.store_id) or is_superadmin())));
grant select on public.commission_payment_items to authenticated;

-- Pedidos cuya comisión aún está por pagar (venta pagada y fuera de pagos pendientes o aprobados).
create or replace function public.commission_due_orders(p_store uuid)
returns setof public.orders language sql stable security definer set search_path = public as $$
  select o.* from orders o
   where o.store_id = p_store
     and o.status in ('pagado','enviado','entregado')
     and o.commission > 0
     and not exists (select 1 from commission_payment_items i join commission_payments cp on cp.id = i.payment_id
                      where i.order_id = o.id and cp.status in ('pendiente','aprobado'));
$$;
revoke execute on function public.commission_due_orders(uuid) from public, anon, authenticated;

/**
 * La tienda registra el pago de sus comisiones. p_orders null = todas las que tiene por pagar.
 * El monto lo calcula la base de datos con las comisiones de esos pedidos.
 */
create or replace function public.create_commission_payment(p_orders uuid[], p_method text, p_reference text, p_receipt text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
  v_ids uuid[];
  v_total numeric;
  v_id uuid;
begin
  select id into v_store from stores where owner_id = auth.uid();
  if v_store is null then raise exception 'No autorizado'; end if;
  if p_method not in ('pago_movil','paypal','binance') then raise exception 'Elige un método de pago'; end if;
  if coalesce(trim(p_reference), '') = '' then raise exception 'Escribe el número de referencia'; end if;
  if p_receipt is null or p_receipt not like auth.uid()::text || '/%' then raise exception 'Adjunta el comprobante del pago'; end if;

  -- Bloquea la tienda para que dos envíos a la vez no cobren la misma comisión dos veces
  perform 1 from stores where id = v_store for update;

  select array_agg(d.id), coalesce(sum(d.commission), 0) into v_ids, v_total
    from commission_due_orders(v_store) d
   where p_orders is null or d.id = any(p_orders);

  if v_ids is null or v_total <= 0 then raise exception 'No hay comisiones por pagar en tu selección'; end if;
  if p_orders is not null and cardinality(v_ids) <> cardinality(array(select distinct unnest(p_orders))) then
    raise exception 'Alguna de las comisiones elegidas ya fue pagada o está en revisión. Recarga la página.';
  end if;

  insert into commission_payments (store_id, amount_usd, method, reference, receipt_path)
  values (v_store, v_total, p_method, left(trim(p_reference), 100), p_receipt)
  returning id into v_id;
  insert into commission_payment_items (payment_id, order_id, amount)
  select v_id, o.id, o.commission from orders o where o.id = any(v_ids);
  return v_id;
end;
$$;
revoke execute on function public.create_commission_payment(uuid[], text, text, text) from public, anon;
grant execute on function public.create_commission_payment(uuid[], text, text, text) to authenticated;

create or replace function public.review_commission_payment(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  select status into v_status from commission_payments where id = p_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if v_status <> 'pendiente' then raise exception 'Este pago ya fue revisado'; end if;
  update commission_payments
     set status = case when p_approve then 'aprobado' else 'rechazado' end, reviewed_at = now()
   where id = p_id;
end;
$$;
revoke execute on function public.review_commission_payment(uuid, boolean) from public, anon;
grant execute on function public.review_commission_payment(uuid, boolean) to authenticated;

-- Totales de comisiones de una tienda (sumar en SQL: PostgREST corta en 1.000 filas).
create or replace function public.store_commission_summary(p_store uuid)
returns table (generated numeric, paid numeric, in_review numeric, due numeric, due_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (owns_store(p_store) or is_superadmin()) then raise exception 'No autorizado'; end if;
  return query
  select (select coalesce(sum(o.commission), 0) from orders o
           where o.store_id = p_store and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(i.amount), 0) from commission_payment_items i join commission_payments cp on cp.id = i.payment_id
           where cp.store_id = p_store and cp.status = 'aprobado'),
         (select coalesce(sum(i.amount), 0) from commission_payment_items i join commission_payments cp on cp.id = i.payment_id
           where cp.store_id = p_store and cp.status = 'pendiente'),
         (select coalesce(sum(d.commission), 0) from commission_due_orders(p_store) d),
         (select count(*) from commission_due_orders(p_store) d);
end;
$$;
revoke execute on function public.store_commission_summary(uuid) from public, anon;
grant execute on function public.store_commission_summary(uuid) to authenticated;

-- Relación de cobros por tienda para el Superadmin: comisiones y pagos de suscripción.
create or replace function public.superadmin_billing()
returns table (store_id uuid, name text, slug text, owner_name text, owner_email text,
               plan text, plan_cycle text, plan_expires_at timestamptz, trial_ends_at timestamptz,
               commission_generated numeric, commission_paid numeric, commission_in_review numeric, commission_due numeric,
               subscription_paid numeric, subscription_pending numeric, subscription_last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.name, s.slug, p.full_name, p.email, s.plan, s.plan_cycle, s.plan_expires_at, s.trial_ends_at,
         c.generated, c.paid, c.in_review, c.due,
         (select coalesce(sum(sp.amount_usd), 0) from subscription_payments sp where sp.store_id = s.id and sp.status = 'aprobado'),
         (select coalesce(sum(sp.amount_usd), 0) from subscription_payments sp where sp.store_id = s.id and sp.status = 'pendiente'),
         (select max(sp.created_at) from subscription_payments sp where sp.store_id = s.id and sp.status = 'aprobado')
    from stores s
    join profiles p on p.id = s.owner_id
    cross join lateral store_commission_summary(s.id) c
   order by c.due desc, s.created_at desc;
end;
$$;
revoke execute on function public.superadmin_billing() from public, anon;
grant execute on function public.superadmin_billing() to authenticated;
