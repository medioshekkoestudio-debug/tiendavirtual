-- Tiendas solo para mayores de edad.
-- La tienda indica en el registro (y luego en Ajustes) si es apta para menores. Si no lo es, el cliente debe
-- confirmar que es mayor de edad antes de ver los artículos, y cada confirmación queda registrada para el panel.

-- false = apta para menores (las tiendas que ya existen siguen igual)
alter table public.stores add column if not exists adults_only boolean not null default false;
grant update (adults_only) on public.stores to authenticated;

create table if not exists public.store_age_confirmations (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  name       text,              -- del perfil si el cliente tenía sesión
  email      text,
  ip         text,              -- constancia; no se muestra a la tienda
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists store_age_confirmations_store_idx on public.store_age_confirmations (store_id, created_at desc);

-- Solo la ve la tienda dueña y el Superadmin. Se escribe desde el servidor (service role) al confirmar.
alter table public.store_age_confirmations enable row level security;
revoke all on public.store_age_confirmations from anon, authenticated;
grant select on public.store_age_confirmations to authenticated;
drop policy if exists store_age_confirmations_select on public.store_age_confirmations;
create policy store_age_confirmations_select on public.store_age_confirmations for select
  using (owns_store(store_id) or is_superadmin());
