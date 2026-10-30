-- Cupones de acceso. Nada es gratis: una tienda puede usar la app mientras tenga un plan pagado y aprobado
-- (plan_expires_at) o un cupón vigente (trial_ends_at). Al vencer, la app le pide comprar un plan.
-- El Superadmin crea cupones y edita su código y sus días; cada tienda puede usar cada cupón una sola vez.

create table if not exists public.coupons (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (code ~ '^[A-Za-z0-9_-]{3,40}$'),
  free_days  int not null check (free_days between 1 and 3650),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists coupons_code_idx on public.coupons (lower(code));

insert into public.coupons (code, free_days) values ('linkicupon1', 15), ('linkicupon2', 60)
on conflict ((lower(code))) do nothing;

create table if not exists public.coupon_redemptions (
  coupon_id    uuid not null references public.coupons(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  access_until timestamptz not null,
  primary key (coupon_id, store_id)
);
create index if not exists coupon_redemptions_store_idx on public.coupon_redemptions (store_id);

-- Último cupón usado (para mostrarlo en el panel y el Superadmin)
alter table public.stores add column if not exists coupon_code text;
-- Sin días gratis al registrarse: el acceso llega con un cupón o con un plan aprobado.
-- Las tiendas que ya existen conservan su fecha.
alter table public.stores alter column trial_ends_at drop default;

-- Solo el Superadmin ve y edita los cupones; las tiendas los canjean con redeem_coupon
alter table public.coupons enable row level security;
revoke all on public.coupons from anon, authenticated;
drop policy if exists coupons_superadmin on public.coupons;
create policy coupons_superadmin on public.coupons for all using (is_superadmin()) with check (is_superadmin());
grant select, insert, update, delete on public.coupons to authenticated;

alter table public.coupon_redemptions enable row level security;
revoke all on public.coupon_redemptions from anon, authenticated;
drop policy if exists coupon_redemptions_select on public.coupon_redemptions;
create policy coupon_redemptions_select on public.coupon_redemptions for select
  using (owns_store(store_id) or is_superadmin());
grant select on public.coupon_redemptions to authenticated;

/** La tienda del usuario canjea un cupón: suma sus días desde hoy (o desde el fin de su cupón vigente). */
create or replace function public.redeem_coupon(p_code text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
  v_coupon coupons;
  v_until timestamptz;
begin
  select id into v_store from stores where owner_id = auth.uid() for update;
  if v_store is null then raise exception 'No autorizado'; end if;
  select * into v_coupon from coupons where lower(code) = lower(trim(p_code)) and active;
  if not found then raise exception 'Cupón inválido o vencido'; end if;
  if exists (select 1 from coupon_redemptions where coupon_id = v_coupon.id and store_id = v_store) then
    raise exception 'Tu tienda ya usó este cupón';
  end if;

  update stores
     set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => v_coupon.free_days),
         coupon_code = v_coupon.code
   where id = v_store
  returning trial_ends_at into v_until;
  insert into coupon_redemptions (coupon_id, store_id, access_until) values (v_coupon.id, v_store, v_until);
  return v_until;
end;
$$;
revoke execute on function public.redeem_coupon(text) from public, anon;
grant execute on function public.redeem_coupon(text) to authenticated;

/** ¿El cupón existe y está activo? (para validar antes de crear la cuenta; no revela nada más) */
create or replace function public.coupon_is_valid(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from coupons where lower(code) = lower(trim(p_code)) and active);
$$;
revoke execute on function public.coupon_is_valid(text) from public;
grant execute on function public.coupon_is_valid(text) to anon, authenticated;

-- La landing no dice «gratis» en ningún lado
update public.landing_content
   set content = jsonb_set(content, '{cta_text}', to_jsonb(trim(regexp_replace(content ->> 'cta_text', '\s*gratis\s*', ' ', 'gi'))))
 where content ->> 'cta_text' ilike '%gratis%';
