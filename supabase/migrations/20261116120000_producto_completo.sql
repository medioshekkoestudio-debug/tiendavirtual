-- Producto básico o completo.
-- Un producto completo tiene modelos (cada uno con su foto y, si se quiere, su propio precio) y tallas o medidas.
--   options = {
--     models:   [{ id, name, image_url, price (null = precio general), sizes (null = todas) }],
--     sizing:   'none' | 'tallas' | 'medidas',
--     sizes:    ['XS','S','M','L','XL', ...],
--     measures: [{ name, width, length, depth }]   -- cm, cada una opcional
--   }
-- El precio y la talla/medida elegida se validan aquí, en place_order: el navegador solo manda los ids.

alter table public.products
  add column if not exists product_type text not null default 'basic',
  add column if not exists options jsonb not null default '{}'::jsonb;

alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check check (product_type in ('basic', 'complete'));
alter table public.products drop constraint if exists products_options_check;
alter table public.products add constraint products_options_check
  check (jsonb_typeof(options) = 'object' and pg_column_size(options) < 60000);

-- Lo que eligió el cliente, como texto: «Azul · Talla M»
alter table public.order_items add column if not exists variant text;

-- Las fotos de los modelos pasan por el mismo filtro que la foto principal
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
  return new;
end;
$$;

create or replace function public.place_order(
  p_store uuid, p_items jsonb, p_customer jsonb, p_delivery jsonb, p_payment jsonb)
returns table (order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_store   stores;
  v_order   orders;
  v_item    jsonb;
  v_prod    products;
  v_qty     int;
  v_total   numeric(12,2) := 0;
  v_type    text := coalesce(p_delivery ->> 'type', 'envio');
  v_method  text := p_payment ->> 'method';
  v_price   numeric(12,2);
  v_label   text;
  v_model   jsonb;
  v_sizing  text;
  v_size    text;
  v_choices text[];
  v_measure jsonb;
begin
  select * into v_store from stores where id = p_store and is_active and onboarding_completed;
  if not found then raise exception 'La tienda no está disponible'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if v_type not in ('envio', 'retiro') then raise exception 'Tipo de entrega inválido'; end if;
  if v_type = 'envio' and coalesce(trim(p_delivery ->> 'address'), '') = '' then
    raise exception 'Indica la dirección de envío';
  end if;
  if coalesce(trim(p_customer ->> 'name'), '') = ''
     or coalesce(trim(p_customer ->> 'cedula'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = '' then
    raise exception 'Completa nombre, cédula y teléfono';
  end if;
  if v_method is null or v_method not in ('zelle', 'paypal', 'pago_movil', 'binance', 'transferencia') then
    raise exception 'Método de pago inválido';
  end if;
  if coalesce(trim(p_payment ->> 'reference'), '') = '' then
    raise exception 'Indica la referencia del pago';
  end if;

  insert into orders (store_id, customer_id, customer_name, customer_cedula, customer_phone, customer_email,
                      shipping_address, delivery_type, scheduled_for, notes)
  values (p_store, auth.uid(),
          left(trim(p_customer ->> 'name'), 120),
          left(trim(p_customer ->> 'cedula'), 30),
          left(trim(p_customer ->> 'phone'), 30),
          nullif(left(trim(coalesce(p_customer ->> 'email', '')), 160), ''),
          nullif(left(trim(coalesce(p_delivery ->> 'address', '')), 500), ''),
          v_type,
          nullif(p_delivery ->> 'scheduled_for', '')::timestamptz,
          nullif(left(trim(coalesce(p_customer ->> 'notes', '')), 1000), ''))
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'Cantidad inválida'; end if;

    select * into v_prod from products
     where id = (v_item ->> 'product_id')::uuid and store_id = p_store and is_active
     for update;
    if not found then raise exception 'Un producto ya no está disponible'; end if;
    if v_prod.stock < v_qty then raise exception 'Stock insuficiente para "%"', v_prod.name; end if;

    v_price := v_prod.price;
    v_label := null;
    v_model := null;

    if v_prod.product_type = 'complete' then
      -- Modelo: obligatorio si el producto tiene modelos; su precio reemplaza al general si lo tiene
      if jsonb_typeof(v_prod.options -> 'models') = 'array' and jsonb_array_length(v_prod.options -> 'models') > 0 then
        select m into v_model from jsonb_array_elements(v_prod.options -> 'models') m
         where m ->> 'id' = v_item ->> 'model_id' limit 1;
        if v_model is null then raise exception 'Elige un modelo de "%"', v_prod.name; end if;
        if coalesce(v_model ->> 'price', '') ~ '^[0-9]+(\.[0-9]+)?$' then
          v_price := (v_model ->> 'price')::numeric;
        end if;
        v_label := nullif(trim(v_model ->> 'name'), '');
      end if;

      -- Talla o medida: obligatoria si el producto (o el modelo elegido) tiene alguna
      v_sizing := coalesce(v_prod.options ->> 'sizing', 'none');
      if v_sizing in ('tallas', 'medidas') then
        if v_sizing = 'tallas' then
          select array_agg(value) into v_choices from jsonb_array_elements_text(coalesce(v_prod.options -> 'sizes', '[]'::jsonb));
        else
          select array_agg(m ->> 'name') into v_choices from jsonb_array_elements(coalesce(v_prod.options -> 'measures', '[]'::jsonb)) m;
        end if;
        if v_model is not null and jsonb_typeof(v_model -> 'sizes') = 'array' then
          select array_agg(value) into v_choices from jsonb_array_elements_text(v_model -> 'sizes') where value = any(v_choices);
        end if;
        if coalesce(array_length(v_choices, 1), 0) > 0 then
          v_size := v_item ->> 'size';
          if v_size is null or not (v_size = any(v_choices)) then
            raise exception 'Elige % de "%"', case when v_sizing = 'tallas' then 'la talla' else 'la medida' end, v_prod.name;
          end if;
          if v_sizing = 'tallas' then
            v_label := concat_ws(' · ', v_label, 'Talla ' || v_size);
          else
            select m into v_measure from jsonb_array_elements(v_prod.options -> 'measures') m where m ->> 'name' = v_size limit 1;
            v_label := concat_ws(' · ', v_label, v_size || coalesce(' (' || nullif(concat_ws(' × ',
              'ancho ' || nullif(v_measure ->> 'width', ''),
              'largo ' || nullif(v_measure ->> 'length', ''),
              'prof. ' || nullif(v_measure ->> 'depth', '')), '') || ' cm)', ''));
          end if;
        end if;
      end if;
    end if;

    update products set stock = stock - v_qty where id = v_prod.id;
    insert into order_items (order_id, product_id, product_name, category_id, subcategory_id, quantity, unit_price, variant)
    values (v_order.id, v_prod.id, v_prod.name, v_prod.category_id, v_prod.subcategory_id, v_qty, v_price, left(v_label, 300));
    v_total := v_total + v_price * v_qty;
  end loop;

  update orders
     set subtotal = v_total, total = v_total, commission = round(v_total * v_store.commission_rate, 2)
   where id = v_order.id;

  insert into payments (order_id, store_id, method, reference, amount)
  values (v_order.id, p_store, v_method, left(trim(p_payment ->> 'reference'), 120), v_total);

  return query select v_order.id, v_order.order_number;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.place_order(uuid, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
