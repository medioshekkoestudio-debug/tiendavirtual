-- Cambio de marca: Shopux → Linki App (dominio linkiapp.com).
-- 1) Colores por defecto de las tiendas nuevas = paleta Linki App
--    (Cian Digital #009688, Azul Marino Tech #004D40, Verde Lima #9CCC65).
--    Las tiendas existentes conservan los colores que ya eligieron.
alter table public.stores alter column primary_color set default '#009688';
alter table public.stores alter column secondary_color set default '#004d40';
alter table public.stores alter column accent_color set default '#9ccc65';

-- 2) Textos de la landing guardados en la BD (los que aún dicen Shopux).
update public.landing_content
set content = replace(replace(replace(content::text,
      'shopuxapp.com', 'linkiapp.com'),
      'Shopux.app', 'Linki App'),
      'Shopux', 'Linki App')::jsonb
where id = 1;

-- 3) Reservar "linki" y "linkiapp" como slugs (además de los que ya había).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.stores'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%shopux%'
  loop
    execute format('alter table public.stores drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.stores add constraint stores_slug_check
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
         and slug not in ('login','registro','panel','onboarding','superadmin','api','auth',
                          'icons','admin','app','www','shopux','linki','linkiapp','offline','static','_next'));

create or replace function public.unique_slug(txt text)
returns text language plpgsql security definer set search_path = public as $$
declare
  base text := left(slugify(txt), 34);
  candidate text;
  n int := 1;
begin
  if base is null or char_length(base) < 3 then base := 'tienda'; end if;
  candidate := base;
  while exists (select 1 from stores where slug = candidate)
        or candidate in ('login','registro','panel','onboarding','superadmin','api','auth','icons',
                         'admin','app','www','shopux','linki','linkiapp','offline','static') loop
    n := n + 1;
    candidate := base || n;
  end loop;
  return candidate;
end;
$$;
