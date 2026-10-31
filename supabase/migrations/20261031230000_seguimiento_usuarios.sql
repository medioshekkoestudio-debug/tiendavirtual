-- Seguimiento de usuarios en el Superadmin: hasta qué paso llegó cada tienda y cuándo dio cada uno.
-- Pasos: registro → configuró la tienda → cargó productos → recibió un pedido → pagó un plan.
-- Las fechas salen de los datos reales (productos, pedidos, pagos), así sirven también para las tiendas
-- anteriores a activity_log; el último inicio de sesión sí depende de activity_log.

create or replace function public.superadmin_user_journey()
returns table (store_id uuid, onboarding_completed boolean, configured_at timestamptz, first_product_at timestamptz,
               orders bigint, first_order_at timestamptz, plan_paid_at timestamptz, last_login_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.onboarding_completed,
         (select min(a.created_at) from activity_log a where a.store_id = s.id and a.action = 'configuracion_terminada'),
         (select min(pr.created_at) from products pr where pr.store_id = s.id),
         (select count(*) from orders o where o.store_id = s.id),
         (select min(o.created_at) from orders o where o.store_id = s.id),
         (select min(coalesce(sp.reviewed_at, sp.created_at)) from subscription_payments sp where sp.store_id = s.id and sp.status = 'aprobado'),
         (select max(a.created_at) from activity_log a where a.store_id = s.id and a.action = 'inicio_sesion')
    from stores s;
end;
$$;
revoke execute on function public.superadmin_user_journey() from public, anon;
grant execute on function public.superadmin_user_journey() to authenticated;
