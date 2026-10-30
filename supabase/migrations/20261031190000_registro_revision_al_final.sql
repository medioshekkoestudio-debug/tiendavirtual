-- Corrige 20261031180000: Supabase (admin.createUser) inserta la cuenta y pone app_metadata un instante después,
-- dentro de la misma transacción. Revisar la marca al insertar rechazaba también las cuentas del servidor.
-- Ahora la revisión es un disparador diferido: corre al final de la transacción, relee la cuenta y, si no trae
-- app_metadata.origen = 'linki', anula todo el registro (registro público, bots). Si la trae, crea perfil y tienda.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u auth.users;
  r text;
  company text;
  rubro text;
begin
  -- La fila al final de la transacción (NEW es la de cuando se insertó, sin app_metadata)
  select * into u from auth.users where id = new.id;
  if not found then return null; end if;
  if coalesce(u.raw_app_meta_data ->> 'origen', '') <> 'linki' then
    raise exception 'Registro no permitido';
  end if;
  if exists (select 1 from profiles where id = u.id) then return null; end if;

  r := coalesce(u.raw_app_meta_data ->> 'role', 'customer');
  company := nullif(trim(u.raw_user_meta_data ->> 'company_name'), '');
  rubro := nullif(trim(u.raw_user_meta_data ->> 'industry'), '');
  if r not in ('store_owner', 'customer') then r := 'customer'; end if;
  if rubro not in ('automotriz','entretenimiento','ferreteria','hogar','mascotas','moda','panaderia',
                   'papeleria','salud','supermercados','tecnologia','telefonia') then rubro := null; end if;

  insert into profiles (id, role, full_name, email, phone, cedula)
  values (u.id, r,
          left(u.raw_user_meta_data ->> 'full_name', 120),
          u.email,
          left(u.raw_user_meta_data ->> 'phone', 30),
          left(u.raw_user_meta_data ->> 'cedula', 20));

  if r = 'store_owner' then
    insert into stores (owner_id, name, slug, industry)
    values (u.id, left(coalesce(company, 'Mi tienda'), 80), unique_slug(coalesce(company, 'tienda')), rubro);
  end if;
  return null;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create constraint trigger on_auth_user_created
  after insert on auth.users
  deferrable initially deferred
  for each row execute function public.handle_new_user();
