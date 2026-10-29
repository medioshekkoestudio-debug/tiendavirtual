-- Planes de suscripción de Linki App (Emprendedor, Pro, Business) y pagos de suscripción.
-- Precios y comisiones deben coincidir con PLANS en src/lib/constants.ts.

-- ---------------------------------------------------------------------
-- Datos de cobro de la plataforma (Pago móvil, PayPal, Binance), editables desde el Superadmin
-- ---------------------------------------------------------------------
create table if not exists public.platform_settings (
  id              int primary key default 1 check (id = 1),
  payment_methods jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
-- Formato de cada método: { enabled, details: [{ label, value }], image_url }
insert into public.platform_settings (id, payment_methods) values (1, jsonb_build_object(
  'pago_movil', jsonb_build_object('enabled', true, 'image_url', '/pagos/qr-pago-movil.jpg', 'details', jsonb_build_array(
    jsonb_build_object('label', 'Banco', 'value', 'Bancamiga'),
    jsonb_build_object('label', 'Cédula', 'value', '14172176'),
    jsonb_build_object('label', 'Teléfono', 'value', '0412-8364248'))),
  'binance', jsonb_build_object('enabled', true, 'image_url', '/pagos/qr-binance.jpg', 'details', jsonb_build_array(
    jsonb_build_object('label', 'Usuario', 'value', 'hpinacastillo'))),
  'paypal', jsonb_build_object('enabled', false, 'details', '[]'::jsonb)
)) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select using (true);
drop policy if exists platform_settings_update on public.platform_settings;
create policy platform_settings_update on public.platform_settings for update
  using (is_superadmin()) with check (is_superadmin());
grant select on public.platform_settings to anon, authenticated;
grant update (payment_methods, updated_at) on public.platform_settings to authenticated;

-- ---------------------------------------------------------------------
-- Plan de cada tienda. Sin grant de update: solo cambia al aprobar un pago (RPC) o por SQL.
-- ---------------------------------------------------------------------
alter table public.stores
  add column if not exists plan            text check (plan in ('emprendedor','pro','business')),
  add column if not exists plan_cycle      text check (plan_cycle in ('mensual','anual')),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists trial_ends_at   timestamptz;
update public.stores set trial_ends_at = created_at + interval '15 days' where trial_ends_at is null;
alter table public.stores alter column trial_ends_at set default now() + interval '15 days';

create or replace function public.plan_price(p_plan text, p_cycle text)
returns numeric language sql immutable as $$
  select case p_plan
           when 'emprendedor' then case p_cycle when 'anual' then 30 else 3 end
           when 'pro'         then case p_cycle when 'anual' then 70 else 7 end
           when 'business'    then case p_cycle when 'anual' then 150 else 15 end
         end::numeric;
$$;

-- ---------------------------------------------------------------------
-- Pagos de suscripción (el dueño adjunta el comprobante; el Superadmin aprueba o rechaza)
-- ---------------------------------------------------------------------
create table if not exists public.subscription_payments (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  plan         text not null check (plan in ('emprendedor','pro','business')),
  cycle        text not null check (cycle in ('mensual','anual')),
  amount_usd   numeric(10,2) not null default 0,
  method       text not null check (method in ('pago_movil','paypal','binance')),
  reference    text not null default '',
  receipt_path text,
  status       text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index if not exists subscription_payments_store_idx on public.subscription_payments (store_id, created_at desc);

-- El monto y el estado los fija el servidor, no el navegador.
create or replace function public.subscription_payment_defaults()
returns trigger language plpgsql as $$
begin
  new.amount_usd := plan_price(new.plan, new.cycle);
  new.status := 'pendiente';
  new.reviewed_at := null;
  return new;
end;
$$;
drop trigger if exists subscription_payment_defaults on public.subscription_payments;
create trigger subscription_payment_defaults before insert on public.subscription_payments
  for each row execute function public.subscription_payment_defaults();

alter table public.subscription_payments enable row level security;
drop policy if exists subscription_payments_select on public.subscription_payments;
create policy subscription_payments_select on public.subscription_payments for select
  using (owns_store(store_id) or is_superadmin());
drop policy if exists subscription_payments_insert on public.subscription_payments;
create policy subscription_payments_insert on public.subscription_payments for insert
  with check (owns_store(store_id));
grant select on public.subscription_payments to authenticated;
grant insert (store_id, plan, cycle, method, reference, receipt_path) on public.subscription_payments to authenticated;

-- Aprobar: activa el plan (o lo extiende desde su vencimiento) y ajusta la comisión del plan.
create or replace function public.review_subscription_payment(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  sp subscription_payments;
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  select * into sp from subscription_payments where id = p_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if sp.status <> 'pendiente' then raise exception 'Este pago ya fue revisado'; end if;

  update subscription_payments
     set status = case when p_approve then 'aprobado' else 'rechazado' end, reviewed_at = now()
   where id = p_id;

  if p_approve then
    update stores
       set plan = sp.plan,
           plan_cycle = sp.cycle,
           plan_expires_at = greatest(coalesce(plan_expires_at, now()), now())
                             + case sp.cycle when 'anual' then interval '1 year' else interval '1 month' end,
           commission_rate = case sp.plan when 'emprendedor' then 0.015 when 'pro' then 0.01 else 0.005 end
     where id = sp.store_id;
  end if;
end;
$$;
revoke execute on function public.review_subscription_payment(uuid, boolean) from public, anon;
grant execute on function public.review_subscription_payment(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Comprobantes: bucket PRIVADO (tienen datos bancarios). Cada dueño sube a su carpeta; lo ve él y el Superadmin.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880,
        array['image/png','image/jpeg','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "payment-receipts insert own" on storage.objects;
create policy "payment-receipts insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "payment-receipts read" on storage.objects;
create policy "payment-receipts read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and ((storage.foldername(name))[1] = auth.uid()::text or is_superadmin()));
