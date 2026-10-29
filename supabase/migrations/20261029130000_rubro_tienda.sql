-- Rubro de la tienda (lo que vende), elegido en el registro y editable en Ajustes.
-- Las claves deben coincidir con RUBROS en src/lib/constants.ts. Las tiendas existentes quedan sin rubro (null).
alter table public.stores add column if not exists industry text
  check (industry in ('automotriz','entretenimiento','ferreteria','hogar','mascotas','moda','panaderia',
                      'papeleria','salud','supermercados','tecnologia','telefonia'));

grant update (industry) on public.stores to authenticated;

-- El trigger de registro guarda el rubro que viene en los metadatos (si no es válido, queda null).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  company text := nullif(trim(new.raw_user_meta_data ->> 'company_name'), '');
  rubro text := nullif(trim(new.raw_user_meta_data ->> 'industry'), '');
begin
  if r not in ('store_owner', 'customer') then r := 'customer'; end if;
  if rubro not in ('automotriz','entretenimiento','ferreteria','hogar','mascotas','moda','panaderia',
                   'papeleria','salud','supermercados','tecnologia','telefonia') then rubro := null; end if;

  insert into profiles (id, role, full_name, email, phone, cedula)
  values (new.id, r,
          new.raw_user_meta_data ->> 'full_name',
          new.email,
          new.raw_user_meta_data ->> 'phone',
          new.raw_user_meta_data ->> 'cedula');

  if r = 'store_owner' then
    insert into stores (owner_id, name, slug, industry)
    values (new.id, coalesce(company, 'Mi tienda'), unique_slug(coalesce(company, 'tienda')), rubro);
  end if;
  return new;
end;
$$;

-- Estadísticas del superadmin: ahora incluyen el rubro (cambia el tipo de retorno → drop + create).
drop function if exists public.superadmin_store_stats();
create function public.superadmin_store_stats()
returns table (store_id uuid, name text, slug text, industry text, owner_email text, is_active boolean,
               created_at timestamptz, products bigint, sales bigint, revenue numeric, commission numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.name, s.slug, s.industry, p.email, s.is_active, s.created_at,
         (select count(*) from products pr where pr.store_id = s.id),
         (select count(*) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.total), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.commission), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado'))
    from stores s join profiles p on p.id = s.owner_id
   order by s.created_at desc;
end;
$$;

revoke execute on function public.superadmin_store_stats() from public, anon;
grant execute on function public.superadmin_store_stats() to authenticated;
