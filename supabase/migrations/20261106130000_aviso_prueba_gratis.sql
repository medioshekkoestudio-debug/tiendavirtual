-- Avisos de vencimiento: si el acceso viene de la prueba gratis (cupón prueba7dias, ver 20261106120000),
-- la campana dice «Tu prueba gratis venció» / «Se vence tu prueba gratis el …» en vez de hablar de cupones.
-- Copia de _notify_store_access (20261031150000) con solo ese cambio.

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
  v_what := case when s.plan is not null and s.plan_expires_at = v_until then 'tu plan'
                 when lower(s.coupon_code) = 'prueba7dias' then 'tu prueba gratis'
                 else 'tu cupón' end;

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
