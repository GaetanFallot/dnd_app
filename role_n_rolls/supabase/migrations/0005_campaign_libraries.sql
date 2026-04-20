-- Role'n'Rolls — Share lore across multiple campaigns.
--
-- A campaign already "owns" every lore_entity where `campaign_id = <that>`.
-- This migration adds a many-to-many join so one campaign can also *pull in*
-- lore that originally belongs to another campaign. The owner campaign is
-- still the source of truth — linked campaigns get read-only access through
-- standard RLS, and the MJ of the owner can edit anywhere.

create table if not exists public.campaign_libraries (
  campaign_id       uuid not null references public.campaigns(id) on delete cascade,
  source_campaign_id uuid not null references public.campaigns(id) on delete cascade,
  added_at          timestamptz not null default now(),
  added_by          uuid references public.users(id),
  primary key (campaign_id, source_campaign_id),
  check (campaign_id <> source_campaign_id)
);

create index if not exists idx_campaign_libraries_target
  on public.campaign_libraries (campaign_id);

create index if not exists idx_campaign_libraries_source
  on public.campaign_libraries (source_campaign_id);

alter table public.campaign_libraries enable row level security;

-- MJ of the target campaign can see + manage which libraries are linked.
-- Members of the target campaign can see (so players understand why they
-- see extra lore), but they can't add/remove.
drop policy if exists "campaign_libraries_member_read" on public.campaign_libraries;
drop policy if exists "campaign_libraries_mj_write"    on public.campaign_libraries;

create policy "campaign_libraries_member_read"
  on public.campaign_libraries for select
  using (public.is_campaign_member(campaign_id));

create policy "campaign_libraries_mj_write"
  on public.campaign_libraries for all
  using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

-- Broaden lore_entities read policy: players of the target campaign see
-- is_public entities of any linked library too. The MJ of the *source*
-- campaign keeps full read/write on their own entities (unchanged).
drop policy if exists "lore_entities_linked_library_read" on public.lore_entities;

create policy "lore_entities_linked_library_read"
  on public.lore_entities for select
  using (
    exists (
      select 1
      from public.campaign_libraries cl
      where cl.source_campaign_id = public.lore_entities.campaign_id
        and public.is_campaign_member(cl.campaign_id)
    )
    and public.lore_entities.is_public
  );

drop policy if exists "lore_relations_linked_library_read" on public.lore_relations;

create policy "lore_relations_linked_library_read"
  on public.lore_relations for select
  using (
    exists (
      select 1
      from public.campaign_libraries cl
      where cl.source_campaign_id = public.lore_relations.campaign_id
        and public.is_campaign_member(cl.campaign_id)
    )
  );

drop policy if exists "lore_events_linked_library_read" on public.lore_events;

create policy "lore_events_linked_library_read"
  on public.lore_events for select
  using (
    exists (
      select 1
      from public.campaign_libraries cl
      where cl.source_campaign_id = public.lore_events.campaign_id
        and public.is_campaign_member(cl.campaign_id)
    )
    and public.lore_events.is_public
  );

-- Resolves an active campaign id into the list of campaigns whose lore
-- should be visible (active + each linked source). Used client-side to
-- drive `lore_entities.campaign_id IN (…)` queries.
create or replace function public.campaign_lore_sources(p_campaign_id uuid)
returns setof uuid
language sql
stable
security definer
as $$
  select p_campaign_id
  union
  select source_campaign_id
  from public.campaign_libraries
  where campaign_id = p_campaign_id;
$$;

grant execute on function public.campaign_lore_sources(uuid) to authenticated;
