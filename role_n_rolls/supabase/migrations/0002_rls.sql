-- Row Level Security for Roll'n'Roles
--
-- Rules:
--   * A MJ sees everything in their campaigns.
--   * A player sees lore/events/maps that are is_public = true,
--     plus items explicitly granted via lore_player_access.
--   * Public share tokens grant anonymous read on is_public items
--     via a dedicated SQL function (not RLS) — kept out of normal row policies.
--   * Everyone can read/update their own user row.
--
-- Convention: helper functions are `security definer` so they can traverse
-- joins without being blocked by the caller's own policies.

alter table public.users                  enable row level security;
alter table public.campaigns              enable row level security;
alter table public.campaign_players       enable row level security;
alter table public.lore_entities          enable row level security;
alter table public.lore_relations         enable row level security;
alter table public.lore_events            enable row level security;
alter table public.lore_event_entities    enable row level security;
alter table public.lore_player_access     enable row level security;
alter table public.campaign_share_tokens  enable row level security;
alter table public.maps                   enable row level security;
alter table public.map_annotations        enable row level security;
alter table public.characters             enable row level security;

-- Helper predicates ---------------------------------------------------------

create or replace function public.is_campaign_mj(c_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.campaigns
    where id = c_id and mj_user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_member(c_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.campaigns
    where id = c_id and mj_user_id = auth.uid()
  ) or exists (
    select 1 from public.campaign_players
    where campaign_id = c_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_targeted_access(
  c_id uuid, t_type lore_target_type, t_id uuid
)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.lore_player_access
    where campaign_id = c_id
      and target_type = t_type
      and target_id  = t_id
      and user_id    = auth.uid()
  );
$$;

-- users ---------------------------------------------------------------------

create policy users_self_read on public.users
  for select using (auth.uid() = id);

create policy users_self_update on public.users
  for update using (auth.uid() = id);

-- Also let anyone see the display name/avatar of users who share a campaign
-- with them (needed for player lists in the MJ UI).
create policy users_campaign_peers_read on public.users
  for select using (
    exists (
      select 1
      from public.campaign_players cp_self
      join public.campaign_players cp_other
        on cp_self.campaign_id = cp_other.campaign_id
      where cp_self.user_id = auth.uid()
        and cp_other.user_id = public.users.id
    ) or exists (
      select 1 from public.campaigns c
      where c.mj_user_id = public.users.id
        and (c.mj_user_id = auth.uid() or public.is_campaign_member(c.id))
    )
  );

-- campaigns -----------------------------------------------------------------

create policy campaigns_member_read on public.campaigns
  for select using (public.is_campaign_member(id));

create policy campaigns_mj_write on public.campaigns
  for all using (mj_user_id = auth.uid())
  with check (mj_user_id = auth.uid());

-- campaign_players ----------------------------------------------------------

create policy campaign_players_member_read on public.campaign_players
  for select using (public.is_campaign_member(campaign_id));

create policy campaign_players_mj_write on public.campaign_players
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy campaign_players_self_leave on public.campaign_players
  for delete using (user_id = auth.uid());

-- lore_entities -------------------------------------------------------------

create policy lore_entities_mj_all on public.lore_entities
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy lore_entities_player_read on public.lore_entities
  for select using (
    public.is_campaign_member(campaign_id)
    and (is_public or public.has_targeted_access(campaign_id, 'entity', id))
  );

-- lore_relations ------------------------------------------------------------

create policy lore_relations_mj_all on public.lore_relations
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy lore_relations_player_read on public.lore_relations
  for select using (
    public.is_campaign_member(campaign_id)
    and exists (
      select 1 from public.lore_entities a
      where a.id = entity_a_id
        and (a.is_public or public.has_targeted_access(campaign_id, 'entity', a.id))
    )
    and exists (
      select 1 from public.lore_entities b
      where b.id = entity_b_id
        and (b.is_public or public.has_targeted_access(campaign_id, 'entity', b.id))
    )
  );

-- lore_events ---------------------------------------------------------------

create policy lore_events_mj_all on public.lore_events
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy lore_events_player_read on public.lore_events
  for select using (
    public.is_campaign_member(campaign_id)
    and (is_public or public.has_targeted_access(campaign_id, 'event', id))
  );

-- lore_event_entities -------------------------------------------------------

create policy lore_event_entities_mj_all on public.lore_event_entities
  for all using (
    exists (
      select 1 from public.lore_events e
      where e.id = event_id and public.is_campaign_mj(e.campaign_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_events e
      where e.id = event_id and public.is_campaign_mj(e.campaign_id)
    )
  );

create policy lore_event_entities_player_read on public.lore_event_entities
  for select using (
    exists (
      select 1 from public.lore_events e
      where e.id = event_id
        and public.is_campaign_member(e.campaign_id)
        and (e.is_public or public.has_targeted_access(e.campaign_id, 'event', e.id))
    )
  );

-- lore_player_access --------------------------------------------------------

create policy lore_access_mj_all on public.lore_player_access
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy lore_access_self_read on public.lore_player_access
  for select using (user_id = auth.uid());

-- campaign_share_tokens -----------------------------------------------------

create policy share_tokens_mj_all on public.campaign_share_tokens
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

-- maps ----------------------------------------------------------------------

create policy maps_mj_all on public.maps
  for all using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create policy maps_player_read on public.maps
  for select using (
    public.is_campaign_member(campaign_id) and is_public
  );

-- map_annotations -----------------------------------------------------------

create policy map_annotations_mj_all on public.map_annotations
  for all using (
    exists (
      select 1 from public.maps m
      where m.id = map_id and public.is_campaign_mj(m.campaign_id)
    )
  )
  with check (
    exists (
      select 1 from public.maps m
      where m.id = map_id and public.is_campaign_mj(m.campaign_id)
    )
  );

create policy map_annotations_player_read on public.map_annotations
  for select using (
    is_public
    and exists (
      select 1 from public.maps m
      where m.id = map_id
        and m.is_public
        and public.is_campaign_member(m.campaign_id)
    )
  );

-- characters ----------------------------------------------------------------

-- A player owns their character; the MJ of the linked campaign can read/edit.
create policy characters_owner_all on public.characters
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy characters_mj_all on public.characters
  for all using (
    campaign_id is not null and public.is_campaign_mj(campaign_id)
  )
  with check (
    campaign_id is not null and public.is_campaign_mj(campaign_id)
  );

-- Party-member read-only visibility of other characters in the same campaign.
create policy characters_campaign_members_read on public.characters
  for select using (
    campaign_id is not null and public.is_campaign_member(campaign_id)
  );
