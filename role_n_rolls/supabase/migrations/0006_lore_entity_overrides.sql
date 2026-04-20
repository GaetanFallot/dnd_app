-- Role'n'Rolls — Per-campaign override of a linked lore entity.
--
-- When a campaign imports another campaign's lore (via campaign_libraries),
-- it sometimes needs to hide an entity locally or attach a GM note that is
-- specific to this campaign's table. The source entity stays untouched.
--
-- We currently only implement the `is_hidden` flag + a private `local_note`
-- (MJ-only). Field-level overrides (rename, alt description, etc.) can be
-- added later as extra columns on this table.

create table if not exists public.lore_entity_overrides (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  entity_id   uuid not null references public.lore_entities(id) on delete cascade,
  is_hidden   boolean not null default false,
  local_note  text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id),
  primary key (campaign_id, entity_id)
);

create index if not exists idx_lore_entity_overrides_campaign
  on public.lore_entity_overrides (campaign_id);

alter table public.lore_entity_overrides enable row level security;

drop policy if exists "lore_entity_overrides_member_read" on public.lore_entity_overrides;
drop policy if exists "lore_entity_overrides_mj_write"    on public.lore_entity_overrides;

-- Members of the target campaign can read their overrides so the client can
-- filter hidden entities client-side.
create policy "lore_entity_overrides_member_read"
  on public.lore_entity_overrides for select
  using (public.is_campaign_member(campaign_id));

-- Only the MJ of the target campaign can create/update/delete overrides.
create policy "lore_entity_overrides_mj_write"
  on public.lore_entity_overrides for all
  using (public.is_campaign_mj(campaign_id))
  with check (public.is_campaign_mj(campaign_id));

create or replace function public.touch_entity_override()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_lore_entity_overrides_touch on public.lore_entity_overrides;
create trigger trg_lore_entity_overrides_touch
  before update on public.lore_entity_overrides
  for each row execute function public.touch_entity_override();
