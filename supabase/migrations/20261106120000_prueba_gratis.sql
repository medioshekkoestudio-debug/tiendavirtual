-- Prueba gratis de 7 días desde el banner de la landing (/prueba-gratis).
-- Es un cupón más: cada tienda lo puede usar una sola vez y al vencer la app pide comprar un plan.
-- El Superadmin puede cambiar sus días o desactivarlo en Cupones (el código debe seguir siendo «prueba7dias»).
insert into public.coupons (code, free_days) values ('prueba7dias', 7)
on conflict ((lower(code))) do nothing;
