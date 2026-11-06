-- Plan de cada tienda y límite de productos por plan: Emprendedor 30, Pro 100, Business 500.
-- El plan es el mismo que decide el diseño de la página (siteTier en src/lib/site.ts):
--   1) el que fije el Superadmin o el sistema (site_plan: al aprobar un pago, al canjear un cupón con plan, a mano),
--   2) si no, el plan pagado vigente,
--   3) si no (prueba gratis, cupón o sin plan), Emprendedor.
-- Cuentan todos los productos de la tienda, activos u ocultos. Las tiendas que ya pasen el límite conservan
-- sus productos: solo no pueden crear nuevos hasta bajar del límite o subir de plan.

create or replace function public.store_plan_tier(p_store uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
           s.site_plan,
           case when s.plan is not null and s.plan_expires_at > now() then s.plan end,
           'emprendedor')
  from stores s where s.id = p_store;
$$;
revoke execute on function public.store_plan_tier(uuid) from public, anon;
grant execute on function public.store_plan_tier(uuid) to authenticated;

create or replace function public.store_product_limit(p_store uuid)
returns int language sql stable security definer set search_path = public as $$
  select case store_plan_tier(p_store) when 'business' then 500 when 'pro' then 100 else 30 end;
$$;
revoke execute on function public.store_product_limit(uuid) from public, anon;
grant execute on function public.store_product_limit(uuid) to authenticated;

create or replace function public.enforce_product_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_count int;
begin
  -- Bloquea la fila de la tienda: dos altas a la vez no pueden pasar el límite
  perform 1 from stores where id = new.store_id for update;
  v_limit := store_product_limit(new.store_id);
  select count(*) into v_count from products where store_id = new.store_id;
  if v_count >= v_limit then
    raise exception 'Llegaste al límite de % productos de tu plan. Sube de plan para cargar más.', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists products_limit on public.products;
create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();
