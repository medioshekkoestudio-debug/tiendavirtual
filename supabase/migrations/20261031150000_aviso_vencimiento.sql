-- Avisos de vencimiento: 3 días antes de que venza el plan o el cupón, y cuando ya venció sin pagar.
-- Llegan a la campana del panel. Se generan cada día con pg_cron y también al abrir el panel
-- (por si pg_cron no está disponible). Cada aviso sale una sola vez por fecha de vencimiento.

alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

create or replace function public._notify_store_access(p_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s stores;
  v_until timestamptz;
  v_what text;
begin
  select * into s from stores where id = p_store;
  if not found then return; end if;
  -- greatest ignora los null: el acceso dura hasta la fecha más lejana entre plan y cupón
  v_until := greatest(case when s.plan is not null then s.plan_expires_at end, s.trial_ends_at);
  if v_until is null then return; end if;
  -- Con un pago de plan en revisión no se le pide pagar otra vez
  if exists (select 1 from subscription_payments where store_id = p_store and status = 'pendiente') then return; end if;
  v_what := case when s.plan is not null and s.plan_expires_at = v_until then 'tu plan' else 'tu cupón' end;

  if v_until > now() and v_until <= now() + interval '3 days' then
    insert into notifications (user_id, title, body, link, dedupe_key)
    values (s.owner_id,
            'Se vence ' || v_what || ' el ' || to_char(v_until at time zone 'America/Caracas', 'DD/MM'),
            'Paga tu plan antes de esa fecha para seguir usando tu app sin interrupciones.',
            '/suscripcion', 'por-vencer:' || (v_until at time zone 'America/Caracas')::date)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  elsif v_until <= now() then
    insert into notifications (user_id, title, body, link, dedupe_key)
    values (s.owner_id,
            initcap(left(v_what, 1)) || substr(v_what, 2) || ' venció',
            'Debes pagar tu plan para seguir usando tu app. Apenas aprobemos tu pago vuelves a tenerlo todo.',
            '/suscripcion', 'vencido:' || (v_until at time zone 'America/Caracas')::date)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
end;
$$;
revoke execute on function public._notify_store_access(uuid) from public, anon, authenticated;

/** Al abrir el panel: revisa solo la tienda del usuario */
create or replace function public.notify_my_access()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  select id into v_store from stores where owner_id = auth.uid();
  if v_store is not null then perform _notify_store_access(v_store); end if;
end;
$$;
revoke execute on function public.notify_my_access() from public, anon;
grant execute on function public.notify_my_access() to authenticated;

/** Una vez al día: todas las tiendas */
create or replace function public.notify_access_all()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in select id from stores loop
    perform _notify_store_access(r.id);
  end loop;
end;
$$;
revoke execute on function public.notify_access_all() from public, anon, authenticated;
grant execute on function public.notify_access_all() to service_role;

-- Todos los días a las 8:00 de Venezuela (12:00 UTC). Si pg_cron no se puede activar, solo avisa:
-- igual se revisa cada vez que el dueño abre su panel.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('linki-aviso-vencimiento', '0 12 * * *', 'select public.notify_access_all()');
exception when others then
  raise notice 'pg_cron no disponible: %', sqlerrm;
end $$;
