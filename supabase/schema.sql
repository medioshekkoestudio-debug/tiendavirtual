-- =====================================================================
-- Shopux.app — Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Es idempotente en lo posible (se puede volver a ejecutar).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer'
              check (role in ('superadmin', 'store_owner', 'customer')),
  full_name   text,
  email       text,
  cedula      text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.stores (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null unique references public.profiles(id) on delete cascade,
  name                 text not null,
  slug                 text not null unique
                       check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
                              and slug not in ('login','registro','panel','onboarding','superadmin','api','auth',
                                               'icons','admin','app','www','shopux','offline','static','_next')),
  description          text not null default '',
  logo_url             text,
  primary_color        text not null default '#7c3aed',
  secondary_color      text not null default '#0f172a',
  accent_color         text not null default '#f59e0b',
  font_key             text not null default 'inter',
  slider_images        text[] not null default '{}',
  payment_methods      jsonb not null default '{}'::jsonb,
  commission_rate      numeric(5,4) not null default 0.01,
  onboarding_step      int not null default 0,
  onboarding_completed boolean not null default false,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  parent_id   uuid references public.categories(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists categories_store_idx on public.categories(store_id);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  subcategory_id  uuid references public.categories(id) on delete set null,
  name            text not null check (char_length(name) between 1 and 120),
  description     text not null default '',
  price           numeric(12,2) not null default 0 check (price >= 0),
  stock           int not null default 0 check (stock >= 0),
  image_url       text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_store_idx on public.products(store_id);

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity,
  store_id          uuid not null references public.stores(id) on delete cascade,
  customer_id       uuid references public.profiles(id) on delete set null,
  customer_name     text not null,
  customer_cedula   text not null,
  customer_phone    text not null,
  customer_email    text,
  shipping_address  text,
  delivery_type     text not null default 'envio' check (delivery_type in ('envio', 'retiro')),
  scheduled_for     timestamptz,
  notes             text,
  subtotal          numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  commission        numeric(12,2) not null default 0,
  status            text not null default 'pendiente'
                    check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  created_at        timestamptz not null default now()
);
create index if not exists orders_store_idx on public.orders(store_id, created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id);

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  category_id     uuid,
  subcategory_id  uuid,
  quantity        int not null check (quantity > 0),
  unit_price      numeric(12,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete cascade,
  method       text not null check (method in ('zelle', 'paypal', 'pago_movil', 'binance', 'transferencia')),
  reference    text not null,
  amount       numeric(12,2) not null,
  status       text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists payments_store_idx on public.payments(store_id, created_at desc);

create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  customer_id      uuid not null references public.profiles(id) on delete cascade,
  customer_name    text,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (store_id, customer_id)
);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 2000),
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

create table if not exists public.landing_content (
  id          int primary key default 1 check (id = 1),
  content     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin');
$$;

create or replace function public.owns_store(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from stores where id = p_store and owner_id = auth.uid());
$$;

-- "Empresa X" -> "empresax" (como en shopuxapp.com/empresax)
create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select regexp_replace(
           translate(lower(coalesce(txt, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
           '[^a-z0-9]+', '', 'g');
$$;

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
                         'admin','app','www','shopux','offline','static') loop
    n := n + 1;
    candidate := base || n;
  end loop;
  return candidate;
end;
$$;

-- Al crear un usuario en auth.users: crea su perfil y, si es dueño de tienda, su tienda + link.
-- El rol "superadmin" NUNCA se acepta desde el registro público (solo por seed / SQL).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  company text := nullif(trim(new.raw_user_meta_data ->> 'company_name'), '');
begin
  if r not in ('store_owner', 'customer') then r := 'customer'; end if;

  insert into profiles (id, role, full_name, email, phone, cedula)
  values (new.id, r,
          new.raw_user_meta_data ->> 'full_name',
          new.email,
          new.raw_user_meta_data ->> 'phone',
          new.raw_user_meta_data ->> 'cedula');

  if r = 'store_owner' then
    insert into stores (owner_id, name, slug)
    values (new.id, coalesce(company, 'Mi tienda'), unique_slug(coalesce(company, 'tienda')));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump on public.messages;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- ---------------------------------------------------------------------
-- RPC: crear pedido (checkout). Precios y stock se calculan en el servidor.
-- Funciona para invitados (auth.uid() null) y clientes con sesión.
-- ---------------------------------------------------------------------
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

    update products set stock = stock - v_qty where id = v_prod.id;
    insert into order_items (order_id, product_id, product_name, category_id, subcategory_id, quantity, unit_price)
    values (v_order.id, v_prod.id, v_prod.name, v_prod.category_id, v_prod.subcategory_id, v_qty, v_prod.price);
    v_total := v_total + v_prod.price * v_qty;
  end loop;

  update orders
     set subtotal = v_total, total = v_total, commission = round(v_total * v_store.commission_rate, 2)
   where id = v_order.id;

  insert into payments (order_id, store_id, method, reference, amount)
  values (v_order.id, p_store, v_method, left(trim(p_payment ->> 'reference'), 120), v_total);

  return query select v_order.id, v_order.order_number;
end;
$$;

-- RPC: aprobar / rechazar pago (solo el dueño de la tienda). Al rechazar, devuelve el stock.
create or replace function public.review_payment(p_payment uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_pay payments;
begin
  select * into v_pay from payments where id = p_payment for update;
  if not found or not owns_store(v_pay.store_id) then raise exception 'No autorizado'; end if;
  if v_pay.status <> 'pendiente' then raise exception 'Este pago ya fue revisado'; end if;

  update payments
     set status = case when p_approve then 'aprobado' else 'rechazado' end, reviewed_at = now()
   where id = p_payment;

  if p_approve then
    update orders set status = 'pagado' where id = v_pay.order_id;
  else
    update orders set status = 'cancelado' where id = v_pay.order_id;
    update products p set stock = p.stock + oi.quantity
      from order_items oi
     where oi.order_id = v_pay.order_id and oi.product_id = p.id;
  end if;
end;
$$;

-- RPC: obtener/crear la conversación cliente ↔ tienda
create or replace function public.get_or_create_conversation(p_store uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para enviar mensajes'; end if;
  select id into v_id from conversations where store_id = p_store and customer_id = auth.uid();
  if v_id is not null then return v_id; end if;
  select coalesce(full_name, email) into v_name from profiles where id = auth.uid();
  insert into conversations (store_id, customer_id, customer_name)
  values (p_store, auth.uid(), v_name)
  returning id into v_id;
  return v_id;
end;
$$;

-- RPC: estadísticas por tienda para el Superadmin
create or replace function public.superadmin_store_stats()
returns table (store_id uuid, name text, slug text, owner_email text, is_active boolean,
               created_at timestamptz, products bigint, sales bigint, revenue numeric, commission numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.name, s.slug, p.email, s.is_active, s.created_at,
         (select count(*) from products pr where pr.store_id = s.id),
         (select count(*) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.total), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado')),
         (select coalesce(sum(o.commission), 0) from orders o where o.store_id = s.id and o.status in ('pagado','enviado','entregado'))
    from stores s join profiles p on p.id = s.owner_id
   order by s.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos (grants). Las actualizaciones se limitan por columna.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

grant update (full_name, phone, cedula) on public.profiles to authenticated;
grant update (name, slug, description, logo_url, primary_color, secondary_color, accent_color, font_key,
              slider_images, payment_methods, onboarding_step, onboarding_completed)
  on public.stores to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant update (status) on public.orders to authenticated;
grant insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant update (content, updated_at) on public.landing_content to authenticated;

revoke execute on function public.place_order(uuid, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.place_order(uuid, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
revoke execute on function public.review_payment(uuid, boolean) from public, anon;
grant execute on function public.review_payment(uuid, boolean) to authenticated;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
revoke execute on function public.superadmin_store_stats() from public, anon;
grant execute on function public.superadmin_store_stats() to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.stores          enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.landing_content enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or is_superadmin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select using (true);
drop policy if exists stores_update on public.stores;
create policy stores_update on public.stores for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
  using (owns_store(store_id)) with check (owns_store(store_id));

drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (is_active or owns_store(store_id) or is_superadmin());
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (owns_store(store_id)) with check (owns_store(store_id));

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (owns_store(store_id) or customer_id = auth.uid() or is_superadmin());
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (owns_store(store_id)) with check (owns_store(store_id));

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (exists (select 1 from orders o where o.id = order_id));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select
  using (owns_store(store_id) or is_superadmin()
         or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select
  using (customer_id = auth.uid() or owns_store(store_id));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid()
              and exists (select 1 from conversations c where c.id = conversation_id));
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update
  using (exists (select 1 from conversations c where c.id = conversation_id));

drop policy if exists landing_select on public.landing_content;
create policy landing_select on public.landing_content for select using (true);
drop policy if exists landing_update on public.landing_content;
create policy landing_update on public.landing_content for update
  using (is_superadmin()) with check (is_superadmin());

-- ---------------------------------------------------------------------
-- Storage: bucket público para logos, sliders e imágenes de productos.
-- Cada usuario solo escribe dentro de su carpeta "<user_id>/..."
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 3145728,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "store-assets read" on storage.objects;
create policy "store-assets read" on storage.objects for select
  using (bucket_id = 'store-assets');
drop policy if exists "store-assets insert own" on storage.objects;
create policy "store-assets insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "store-assets update own" on storage.objects;
create policy "store-assets update own" on storage.objects for update to authenticated
  using (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "store-assets delete own" on storage.objects;
create policy "store-assets delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'store-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Realtime (chat)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Contenido inicial de la landing (editable desde el Superadmin)
-- ---------------------------------------------------------------------
insert into public.landing_content (id, content) values (1, '{
  "brand_name": "Shopux",
  "hero_title": "Crea tu tienda online en minutos",
  "hero_subtitle": "Tu propia app (PWA) con catálogo, pedidos, pagos y chat con tus clientes. Sin programar.",
  "hero_image": "",
  "description_title": "¿Qué es Shopux?",
  "description": "Shopux es un marketplace de tiendas: cada empresa obtiene su propia tienda instalable en el teléfono, con su marca, sus colores y su link (shopuxapp.com/tuempresa). Administra productos, stock, pagos (Zelle, PayPal, Pago móvil, Binance, transferencias) y pedidos desde un solo panel.",
  "cta_text": "Crear mi tienda gratis",
  "features": [
    {"title": "Tu marca, tu app", "text": "Logo, colores, tipografía y slider propios. Tus clientes la instalan como app."},
    {"title": "Pagos locales", "text": "Zelle, PayPal, Pago móvil, Binance y transferencias. Aprueba cada pago con un toque."},
    {"title": "Pedidos y chat", "text": "Controla pedidos por categoría y conversa con tus clientes en tiempo real."}
  ],
  "footer_text": "© Shopux.app — Marketplace de tiendas"
}'::jsonb)
on conflict (id) do nothing;
