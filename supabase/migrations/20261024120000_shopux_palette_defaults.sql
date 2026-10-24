-- Colores por defecto de las tiendas nuevas = paleta Shopux
-- (verde #78B913, gris oscuro #333333, gris medio #666666).
-- Las tiendas existentes conservan los colores que ya eligieron.
alter table public.stores alter column primary_color set default '#78b913';
alter table public.stores alter column secondary_color set default '#333333';
alter table public.stores alter column accent_color set default '#666666';
