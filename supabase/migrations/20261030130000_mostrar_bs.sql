-- Interruptor de la tienda: mostrar el equivalente en bolívares (tasa BCV) debajo del precio de cada producto.
alter table public.stores add column if not exists show_bs boolean not null default true;
grant update (show_bs) on public.stores to authenticated;
