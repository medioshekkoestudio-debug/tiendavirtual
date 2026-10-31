-- Chat sin iniciar sesión: un cliente invitado puede escribirle a una tienda.
-- La conversación del invitado no tiene customer_id; se identifica por el hash de una clave secreta que solo
-- guarda su navegador (cookie httpOnly). Sus mensajes llevan sender_id null y los escribe el servidor con la
-- llave de servicio, así que las reglas de acceso para usuarios con sesión no cambian.

alter table public.conversations alter column customer_id drop not null;
alter table public.conversations add column if not exists guest_token_hash text unique;
alter table public.conversations add column if not exists guest_phone text;
alter table public.conversations drop constraint if exists conversations_customer_or_guest;
alter table public.conversations add constraint conversations_customer_or_guest
  check (customer_id is not null or guest_token_hash is not null);

-- sender_id null = mensaje del invitado
alter table public.messages alter column sender_id drop not null;
