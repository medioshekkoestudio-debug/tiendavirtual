-- Finanzas del Superadmin: totales de mensualidades y comisiones agrupados por método de pago, plan y estado.
-- Se suma en la base porque la API corta las lecturas en 1.000 filas y los agregados de PostgREST están apagados.

create or replace function public.superadmin_finance_summary()
returns table (kind text, method text, plan text, cycle text, status text, payments bigint, total numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select 'mensualidad'::text, sp.method, sp.plan, sp.cycle, sp.status, count(*), coalesce(sum(sp.amount_usd), 0)
    from subscription_payments sp
   group by sp.method, sp.plan, sp.cycle, sp.status
  union all
  select 'comision'::text, cp.method, null::text, null::text, cp.status, count(*), coalesce(sum(cp.amount_usd), 0)
    from commission_payments cp
   group by cp.method, cp.status;
end;
$$;
revoke execute on function public.superadmin_finance_summary() from public, anon;
grant execute on function public.superadmin_finance_summary() to authenticated;
