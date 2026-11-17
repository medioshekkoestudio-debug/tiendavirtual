-- Varias fotos por producto.
-- La foto principal sigue en products.image_url (la que se ve en la lista de productos, el carrito y la vista previa);
-- las demás van en products.images, en el orden que eligió la dueña de la tienda (máximo 10).

alter table public.products add column if not exists images text[] not null default '{}';

alter table public.products drop constraint if exists products_images_check;
alter table public.products add constraint products_images_check check (cardinality(images) <= 10);

-- Las fotos adicionales pasan por el mismo filtro que la foto principal y las de los modelos
create or replace function public.trg_sanitize_product()
returns trigger language plpgsql set search_path = public as $$
begin
  new.image_url := safe_url(new.image_url);
  if jsonb_typeof(new.options -> 'models') = 'array' then
    new.options := jsonb_set(new.options, '{models}', coalesce((
      select jsonb_agg(case when m ? 'image_url' then jsonb_set(m, '{image_url}', coalesce(to_jsonb(safe_url(m ->> 'image_url')), 'null'::jsonb)) else m end)
        from jsonb_array_elements(new.options -> 'models') m
    ), '[]'::jsonb));
  end if;
  new.images := coalesce((
    select array_agg(safe_url(u) order by i)
      from unnest(new.images) with ordinality as t(u, i)
     where safe_url(u) is not null
  ), '{}');
  return new;
end;
$$;
