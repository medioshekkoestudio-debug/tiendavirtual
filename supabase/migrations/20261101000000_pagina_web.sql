-- Página web de la tienda según su plan: Pro suma «Quiénes somos» y contacto; Business, una landing de inicio
-- y la página «Nosotros». Los textos e imágenes que edita la tienda van en site_content (los vacíos usan los
-- sugeridos por su rubro y su descripción, ver src/lib/site.ts).
-- El registro guarda además la descripción de la empresa, base de esos textos.

alter table public.stores add column if not exists site_content jsonb not null default '{}'::jsonb;
alter table public.stores drop constraint if exists stores_site_content_check;
alter table public.stores add constraint stores_site_content_check
  check (jsonb_typeof(site_content) = 'object' and pg_column_size(site_content) < 60000);
grant update (site_content) on public.stores to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u auth.users;
  r text;
  company text;
  rubro text;
  about text;
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
  about := left(coalesce(trim(u.raw_user_meta_data ->> 'description'), ''), 2000);
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
    insert into stores (owner_id, name, slug, industry, description)
    values (u.id, left(coalesce(company, 'Mi tienda'), 80), unique_slug(coalesce(company, 'tienda')), rubro, about);
  end if;
  return null;
end;
$$;

-- Plan con el que se ve la página de cada tienda (site_plan). Lo pone solo el sistema o el Superadmin:
-- - al aprobar un pago de plan, el plan comprado;
-- - al canjear un cupón que trae plan, el plan del cupón;
-- - el Superadmin lo cambia a mano en la lista de usuarios.
-- Sin valor: el plan pagado vigente o, si no hay, Emprendedor. Las tiendas no pueden cambiarlo (sin grant de columna).
alter table public.stores add column if not exists site_plan text check (site_plan in ('emprendedor', 'pro', 'business'));
alter table public.coupons add column if not exists plan text check (plan in ('emprendedor', 'pro', 'business'));

update public.stores set site_plan = plan
 where site_plan is null and plan is not null and plan_expires_at > now();

create or replace function public.site_plan_from_payment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprobado' and old.status is distinct from 'aprobado' then
    update stores set site_plan = new.plan where id = new.store_id;
  end if;
  return null;
end;
$$;
drop trigger if exists subscription_payments_site_plan on public.subscription_payments;
create trigger subscription_payments_site_plan after update of status on public.subscription_payments
  for each row execute function public.site_plan_from_payment();

create or replace function public.site_plan_from_coupon()
returns trigger language plpgsql security definer set search_path = public as $$
declare p text;
begin
  select plan into p from coupons where id = new.coupon_id;
  if p is not null then
    update stores set site_plan = p where id = new.store_id;
  end if;
  return null;
end;
$$;
drop trigger if exists coupon_redemptions_site_plan on public.coupon_redemptions;
create trigger coupon_redemptions_site_plan after insert on public.coupon_redemptions
  for each row execute function public.site_plan_from_coupon();
