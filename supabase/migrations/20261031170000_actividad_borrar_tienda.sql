-- Al borrar una tienda, sus productos y categorías se borran en cascada y sus disparadores intentaban anotar
-- la actividad de una tienda que ya no existe: la clave foránea frenaba el borrado de la tienda entera.
-- Ahora solo se anota si la tienda sigue existiendo.
create or replace function public._log_activity(p_store uuid, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into activity_log (store_id, actor_id, action, detail)
  select p_store, auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb)
   where exists (select 1 from stores where id = p_store);
$$;
revoke execute on function public._log_activity(uuid, text, jsonb) from public, anon, authenticated;
