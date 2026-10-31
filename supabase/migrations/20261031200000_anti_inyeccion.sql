-- Defensa contra inyección de scripts en los datos que escriben los dueños de tienda.
-- Las tiendas pueden escribir algunas columnas directo con la API de Supabase (sin pasar por las validaciones
-- del servidor), así que la base limpia las direcciones de imágenes y los colores al guardar.
-- Además: el bucket público ya no acepta SVG (un SVG puede llevar un script adentro).

create or replace function public.safe_url(p text)
returns text language sql immutable as $$
  -- Solo https:// sin caracteres que puedan romper un atributo o una url() de CSS
  select case when p ~ '^https://[^\s"''<>()\\]+$' then left(p, 1000) else null end;
$$;

create or replace function public.safe_color(p text, fallback text)
returns text language sql immutable as $$
  select case when p ~ '^#[0-9a-fA-F]{6}$' then p else fallback end;
$$;

create or replace function public.trg_sanitize_store()
returns trigger language plpgsql set search_path = public as $$
begin
  new.logo_url := safe_url(new.logo_url);
  new.slider_images := coalesce(array(select safe_url(u) from unnest(new.slider_images) u where safe_url(u) is not null), '{}');
  new.primary_color := safe_color(new.primary_color, '#009688');
  new.secondary_color := safe_color(new.secondary_color, '#004d40');
  new.accent_color := safe_color(new.accent_color, '#8bc34a');
  return new;
end;
$$;
drop trigger if exists sanitize_store on public.stores;
create trigger sanitize_store before insert or update on public.stores
  for each row execute function public.trg_sanitize_store();

create or replace function public.trg_sanitize_product()
returns trigger language plpgsql set search_path = public as $$
begin
  new.image_url := safe_url(new.image_url);
  return new;
end;
$$;
drop trigger if exists sanitize_product on public.products;
create trigger sanitize_product before insert or update on public.products
  for each row execute function public.trg_sanitize_product();

update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 where id = 'store-assets';
