-- Seguridad contra bots.
-- 1. Solo el servidor de Linki App puede crear cuentas. El registro público de Supabase (/auth/v1/signup con la clave
--    pública) quedaba abierto y además confiaba en user_metadata.role: cualquiera podía crear una tienda sin pasar
--    por la web. Ahora el disparador exige la marca app_metadata.origen = 'linki', que solo puede poner la
--    service role (admin.createUser), y toma el rol de app_metadata. Cualquier otro registro se rechaza.
-- 2. Límite de intentos por IP para registrarse, iniciar sesión, usar cupones y subir comprobantes.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
  company text := nullif(trim(new.raw_user_meta_data ->> 'company_name'), '');
  rubro text := nullif(trim(new.raw_user_meta_data ->> 'industry'), '');
begin
  if coalesce(new.raw_app_meta_data ->> 'origen', '') <> 'linki' then
    raise exception 'Registro no permitido';
  end if;
  if r not in ('store_owner', 'customer') then r := 'customer'; end if;
  if rubro not in ('automotriz','entretenimiento','ferreteria','hogar','mascotas','moda','panaderia',
                   'papeleria','salud','supermercados','tecnologia','telefonia') then rubro := null; end if;

  insert into profiles (id, role, full_name, email, phone, cedula)
  values (new.id, r,
          left(new.raw_user_meta_data ->> 'full_name', 120),
          new.email,
          left(new.raw_user_meta_data ->> 'phone', 30),
          left(new.raw_user_meta_data ->> 'cedula', 20));

  if r = 'store_owner' then
    insert into stores (owner_id, name, slug, industry)
    values (new.id, left(coalesce(company, 'Mi tienda'), 80), unique_slug(coalesce(company, 'tienda')), rubro);
  end if;
  return new;
end;
$$;

-- Límite de intentos (ventana fija). Solo lo usa el servidor con la service role.
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

/** Suma un intento a la clave y dice si todavía está permitido (true) o ya superó el máximo de la ventana (false) */
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_hits int;
begin
  insert into rate_limits as rl (key, window_start, hits) values (left(p_key, 200), now(), 1)
  on conflict (key) do update
     set hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
         window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;
  -- Limpieza ocasional de claves viejas
  if random() < 0.02 then delete from rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_max;
end;
$$;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- Probar un cupón ya no es público: lo hace el servidor (con límite de intentos)
revoke execute on function public.coupon_is_valid(text) from anon, authenticated;
grant execute on function public.coupon_is_valid(text) to service_role;
