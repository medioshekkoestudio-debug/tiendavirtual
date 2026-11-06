-- Comisión por venta según el plan de la tienda (store_plan_tier): Emprendedor 1,5 %, Pro 1 %, Business 0,5 %.
-- Días gratis (prueba gratis o cupón, sin plan pagado vigente): 0 %. Al terminar esos días se cobra la del plan.
-- La comisión de cada pedido se fija al crearlo (place_order) con la tasa de ese momento; stores.commission_rate
-- deja de usarse para calcular.

create or replace function public.store_commission_rate(p_store uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case
           when s.trial_ends_at > now() and not (s.plan is not null and s.plan_expires_at > now()) then 0
           else case store_plan_tier(s.id) when 'business' then 0.005 when 'pro' then 0.01 else 0.015 end
         end
  from stores s where s.id = p_store;
$$;
revoke execute on function public.store_commission_rate(uuid) from public, anon;
grant execute on function public.store_commission_rate(uuid) to authenticated;

-- place_order inserta el pedido y luego le pone total y comisión: aquí se recalcula la comisión con la tasa del plan
create or replace function public.order_commission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.commission := round(coalesce(new.total, 0) * coalesce(store_commission_rate(new.store_id), 0.015), 2);
  return new;
end;
$$;

drop trigger if exists orders_commission on public.orders;
create trigger orders_commission before insert or update of total, commission on public.orders
  for each row execute function public.order_commission();
