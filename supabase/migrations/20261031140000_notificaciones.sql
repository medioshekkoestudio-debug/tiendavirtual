-- Notificaciones dentro de la app (campana del panel). La base las crea sola al aprobar o rechazar un pago.
-- Además: quien pagó un plan ya puede iniciar sesión mientras su pago está en revisión (antes la cuenta
-- quedaba bloqueada hasta la aprobación).

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Aviso al dueño cuando su pago de plan o de comisiones se aprueba o se rechaza
create or replace function public.notify_payment_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_what text;
begin
  if new.status = old.status or new.status not in ('aprobado', 'rechazado') then return new; end if;
  select owner_id into v_owner from stores where id = new.store_id;
  if v_owner is null then return new; end if;
  v_what := case tg_table_name when 'subscription_payments' then 'de tu plan' else 'de comisiones' end;

  if new.status = 'aprobado' then
    insert into notifications (user_id, title, body, link) values (v_owner,
      '¡Tu pago ' || v_what || ' fue aprobado!',
      case tg_table_name when 'subscription_payments'
        then 'Ya puedes usar tu app sin restricciones.'
        else 'Gracias, tus comisiones quedaron pagadas.' end,
      case tg_table_name when 'subscription_payments' then '/panel' else '/panel/comisiones' end);
  else
    insert into notifications (user_id, title, body, link) values (v_owner,
      'Tu pago ' || v_what || ' no fue aprobado',
      'Revisa los datos del pago y envíalo de nuevo, o escríbenos.',
      case tg_table_name when 'subscription_payments' then '/suscripcion' else '/panel/comisiones' end);
  end if;
  return new;
end;
$$;

drop trigger if exists subscription_payments_notify on public.subscription_payments;
create trigger subscription_payments_notify after update of status on public.subscription_payments
  for each row execute function public.notify_payment_review();
drop trigger if exists commission_payments_notify on public.commission_payments;
create trigger commission_payments_notify after update of status on public.commission_payments
  for each row execute function public.notify_payment_review();

-- Desbloquear a quienes tienen un pago de plan en revisión (se bloqueaban al registrarse en la pasarela)
-- Si el rol de la migración no puede tocar auth.users, solo avisa: el resto de la migración sigue
do $$
begin
  update auth.users u
     set banned_until = null
   where u.banned_until is not null
     and exists (select 1 from public.stores s
                   join public.subscription_payments sp on sp.store_id = s.id
                  where s.owner_id = u.id and sp.status = 'pendiente');
exception when insufficient_privilege then
  raise notice 'No se pudo desbloquear cuentas con pago en revisión: %', sqlerrm;
end $$;
