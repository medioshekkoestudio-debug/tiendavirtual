-- Validación automática de pagos (planValidacionAutomatica.md): movimientos del banco, lecturas del OCR
-- y aprobación automática. Todo lo escribe el servicio pagos-api con la service role; el navegador
-- solo puede leer (y solo el Superadmin), nunca las credenciales del banco.

-- ---------------------------------------------------------------------
-- Cuentas bancarias que lee el servicio (Fase A: la de Linki App en Bancamiga)
-- ---------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id                 uuid primary key default gen_random_uuid(),
  label              text not null unique,
  bank               text not null check (bank in ('bancamiga')),
  account_masked     text not null default '',
  -- iv.tag.cifrado en base64 (AES-256-GCM); la clave solo está en el servicio (BANK_CREDENTIALS_KEY)
  credentials        text,
  active             boolean not null default true,
  paused_reason      text,
  login_failures     int not null default 0,
  last_scraped_at    timestamptz,
  last_error         text,
  created_at         timestamptz not null default now()
);

create table if not exists public.bank_movements (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.bank_accounts(id) on delete cascade,
  date           date not null,
  reference      text not null,
  reference_tail text generated always as (right(regexp_replace(reference, '\D', '', 'g'), 6)) stored,
  amount         numeric(14,2) not null,
  type           text not null check (type in ('credito','debito')),
  description    text,
  origin_bank    text,
  origin_id      text,
  scraped_at     timestamptz not null default now(),
  -- Reclamo: un movimiento paga una sola cosa ('suscripcion:<id>' o 'comision:<id>')
  used_at        timestamptz,
  used_by        text,
  unique (account_id, reference, date, amount)
);
create index if not exists bank_movements_tail_idx on public.bank_movements (reference_tail) where used_at is null and type = 'credito';
create index if not exists bank_movements_date_idx on public.bank_movements (account_id, date desc);

-- Diario de cada entrada al banco (para el semáforo y para diagnosticar)
create table if not exists public.bank_scrape_runs (
  id            bigint generated always as identity primary key,
  account_id    uuid not null references public.bank_accounts(id) on delete cascade,
  started_at    timestamptz not null default now(),
  duration_ms   int,
  result        text not null check (result in ('ok','login_failed','not_configured','error')),
  new_movements int not null default 0,
  error         text
);
create index if not exists bank_scrape_runs_idx on public.bank_scrape_runs (account_id, started_at desc);

-- ---------------------------------------------------------------------
-- Lectura del comprobante y resultado de la conciliación de cada pago
-- ---------------------------------------------------------------------
create table if not exists public.payment_validations (
  payment_kind       text not null check (payment_kind in ('suscripcion','comision')),
  payment_id         uuid not null,
  ocr_legible        boolean,
  ocr_reference      text,
  ocr_amount         numeric(14,2),
  ocr_date           date,
  ocr_bank           text,
  ocr_origin_bank    text,
  ocr_origin_id      text,
  ocr_raw            jsonb,
  ocr_error          text,
  ocr_at             timestamptz,
  expected_ves       numeric(14,2),
  rate               numeric(14,4),
  -- Por qué sigue pendiente (lo lee el Superadmin); el sistema nunca rechaza solo
  status_note        text,
  shadow_movement_id uuid references public.bank_movements(id) on delete set null,
  bank_movement_id   uuid unique references public.bank_movements(id) on delete set null,
  validated_by       text check (validated_by in ('auto','manual')),
  validated_at       timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (payment_kind, payment_id)
);

create table if not exists public.conciliation_runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  duration_ms int,
  pending     int not null default 0,
  approved    int not null default 0,
  shadow      int not null default 0,
  ocr_reads   int not null default 0,
  error       text
);
create index if not exists conciliation_runs_idx on public.conciliation_runs (started_at desc);

-- ---------------------------------------------------------------------
-- Permisos: Supabase da todo a anon/authenticated en tablas nuevas; se quita y se deja lectura al Superadmin
-- ---------------------------------------------------------------------
revoke all on public.bank_accounts, public.bank_movements, public.bank_scrape_runs,
              public.payment_validations, public.conciliation_runs from anon, authenticated;

alter table public.bank_accounts enable row level security;
alter table public.bank_movements enable row level security;
alter table public.bank_scrape_runs enable row level security;
alter table public.payment_validations enable row level security;
alter table public.conciliation_runs enable row level security;

drop policy if exists bank_accounts_select on public.bank_accounts;
create policy bank_accounts_select on public.bank_accounts for select using (is_superadmin());
-- Sin la columna credentials
grant select (id, label, bank, account_masked, active, paused_reason, login_failures, last_scraped_at, last_error, created_at)
  on public.bank_accounts to authenticated;

drop policy if exists bank_movements_select on public.bank_movements;
create policy bank_movements_select on public.bank_movements for select using (is_superadmin());
grant select on public.bank_movements to authenticated;

drop policy if exists bank_scrape_runs_select on public.bank_scrape_runs;
create policy bank_scrape_runs_select on public.bank_scrape_runs for select using (is_superadmin());
grant select on public.bank_scrape_runs to authenticated;

drop policy if exists payment_validations_select on public.payment_validations;
create policy payment_validations_select on public.payment_validations for select using (is_superadmin());
grant select on public.payment_validations to authenticated;

drop policy if exists conciliation_runs_select on public.conciliation_runs;
create policy conciliation_runs_select on public.conciliation_runs for select using (is_superadmin());
grant select on public.conciliation_runs to authenticated;

-- ---------------------------------------------------------------------
-- Aprobación automática: en una sola transacción bloquea el pago, comprueba que siga pendiente,
-- reclama el movimiento (si ya estaba usado falla y no se aprueba nada) y aprueba.
-- Solo la puede llamar el servicio (service_role).
-- ---------------------------------------------------------------------
create or replace function public.auto_approve_payment(p_kind text, p_id uuid, p_movement uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  sp subscription_payments;
  v_status text;
begin
  if p_kind = 'suscripcion' then
    select * into sp from subscription_payments where id = p_id for update;
    if not found then raise exception 'Pago no encontrado'; end if;
    v_status := sp.status;
  elsif p_kind = 'comision' then
    select status into v_status from commission_payments where id = p_id for update;
    if not found then raise exception 'Pago no encontrado'; end if;
  else
    raise exception 'Tipo de pago inválido';
  end if;
  if v_status <> 'pendiente' then raise exception 'El pago ya no está pendiente'; end if;

  update bank_movements set used_at = now(), used_by = p_kind || ':' || p_id
   where id = p_movement and used_at is null and type = 'credito';
  if not found then raise exception 'El movimiento ya fue usado'; end if;

  if p_kind = 'suscripcion' then
    update subscription_payments set status = 'aprobado', reviewed_at = now() where id = p_id;
    -- Igual que review_subscription_payment
    update stores
       set plan = sp.plan,
           plan_cycle = sp.cycle,
           plan_expires_at = greatest(coalesce(plan_expires_at, now()), now())
                             + case sp.cycle when 'anual' then interval '1 year' else interval '1 month' end,
           commission_rate = case sp.plan when 'emprendedor' then 0.015 when 'pro' then 0.01 else 0.005 end
     where id = sp.store_id;
  else
    update commission_payments set status = 'aprobado', reviewed_at = now() where id = p_id;
  end if;

  insert into payment_validations (payment_kind, payment_id, bank_movement_id, validated_by, validated_at, status_note, updated_at)
  values (p_kind, p_id, p_movement, 'auto', now(), coalesce(p_note, 'Aprobado automáticamente'), now())
  on conflict (payment_kind, payment_id) do update
     set bank_movement_id = excluded.bank_movement_id, validated_by = 'auto', validated_at = now(),
         status_note = excluded.status_note, updated_at = now();
end;
$$;
revoke execute on function public.auto_approve_payment(text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.auto_approve_payment(text, uuid, uuid, text) to service_role;
