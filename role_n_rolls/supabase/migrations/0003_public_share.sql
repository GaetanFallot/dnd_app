-- Public share token access
--
-- The /lore/:token public page must work without auth. Instead of
-- weakening RLS with an "allow anonymous" policy, we expose a pair of
-- SECURITY DEFINER functions that resolve the token and return only the
-- is_public subset. The client calls these via `supabase.rpc(...)`.

create or replace function public.resolve_share_token(p_token text)
returns uuid
language sql
stable
security definer
as $$
  select campaign_id
  from public.campaign_share_tokens
  where token = p_token and is_active
  limit 1;
$$;

grant execute on function public.resolve_share_token(text) to anon, authenticated;

create or replace function public.public_lore_entities(p_token text)
returns setof public.lore_entities
language sql
stable
security definer
as $$
  select e.*
  from public.campaign_share_tokens t
  join public.lore_entities e on e.campaign_id = t.campaign_id
  where t.token = p_token
    and t.is_active
    and e.is_public;
$$;

grant execute on function public.public_lore_entities(text) to anon, authenticated;

create or replace function public.public_lore_relations(p_token text)
returns setof public.lore_relations
language sql
stable
security definer
as $$
  select r.*
  from public.campaign_share_tokens t
  join public.lore_relations r on r.campaign_id = t.campaign_id
  join public.lore_entities a  on a.id = r.entity_a_id
  join public.lore_entities b  on b.id = r.entity_b_id
  where t.token = p_token
    and t.is_active
    and a.is_public
    and b.is_public;
$$;

grant execute on function public.public_lore_relations(text) to anon, authenticated;

create or replace function public.public_lore_events(p_token text)
returns setof public.lore_events
language sql
stable
security definer
as $$
  select e.*
  from public.campaign_share_tokens t
  join public.lore_events e on e.campaign_id = t.campaign_id
  where t.token = p_token
    and t.is_active
    and e.is_public;
$$;

grant execute on function public.public_lore_events(text) to anon, authenticated;

create or replace function public.public_maps(p_token text)
returns setof public.maps
language sql
stable
security definer
as $$
  select m.*
  from public.campaign_share_tokens t
  join public.maps m on m.campaign_id = t.campaign_id
  where t.token = p_token
    and t.is_active
    and m.is_public;
$$;

grant execute on function public.public_maps(text) to anon, authenticated;
