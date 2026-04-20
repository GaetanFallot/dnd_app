-- Roll'n'Roles — initial schema
-- Users, campaigns, lore entities/relations/events, maps, characters.

create extension if not exists "uuid-ossp";

-- Enums ---------------------------------------------------------------------

create type lore_entity_type as enum (
  'city', 'family', 'npc', 'guild', 'creature',
  'faction', 'place', 'object', 'deity', 'other'
);

create type campaign_status as enum ('active', 'paused', 'archived');
create type campaign_role   as enum ('mj', 'player');
create type lore_target_type as enum ('entity', 'event');

-- Users ---------------------------------------------------------------------
-- Mirrors auth.users but exposes only fields useful to the app layer.

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Campaigns -----------------------------------------------------------------

create table public.campaigns (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  mj_user_id   uuid not null references public.users(id) on delete cascade,
  status       campaign_status not null default 'active',
  created_at   timestamptz not null default now()
);

create index idx_campaigns_mj on public.campaigns (mj_user_id);

create table public.campaign_players (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  role         campaign_role not null default 'player',
  joined_at    timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index idx_campaign_players_campaign on public.campaign_players (campaign_id);
create index idx_campaign_players_user on public.campaign_players (user_id);

-- Lore ----------------------------------------------------------------------

create table public.lore_entities (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  type         lore_entity_type not null,
  name         text not null,
  description  text,
  image_url    text,
  is_public    boolean not null default false,
  created_by   uuid not null references public.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_lore_entities_campaign on public.lore_entities (campaign_id);
create index idx_lore_entities_type on public.lore_entities (campaign_id, type);

create table public.lore_relations (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  entity_a_id    uuid not null references public.lore_entities(id) on delete cascade,
  entity_b_id    uuid not null references public.lore_entities(id) on delete cascade,
  relation_label text not null,
  check (entity_a_id <> entity_b_id)
);

create index idx_lore_relations_campaign on public.lore_relations (campaign_id);
create index idx_lore_relations_entities on public.lore_relations (entity_a_id, entity_b_id);

create table public.lore_events (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  title        text not null,
  description  text,
  is_public    boolean not null default false,
  created_by   uuid not null references public.users(id),
  created_at   timestamptz not null default now()
);

create index idx_lore_events_campaign on public.lore_events (campaign_id);

create table public.lore_event_entities (
  event_id  uuid not null references public.lore_events(id) on delete cascade,
  entity_id uuid not null references public.lore_entities(id) on delete cascade,
  primary key (event_id, entity_id)
);

-- Targeted access (player-specific) -----------------------------------------

create table public.lore_player_access (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  target_type  lore_target_type not null,
  target_id    uuid not null,
  user_id      uuid not null references public.users(id) on delete cascade,
  granted_by   uuid not null references public.users(id),
  granted_at   timestamptz not null default now(),
  unique (campaign_id, target_type, target_id, user_id)
);

create index idx_lore_access_user on public.lore_player_access (user_id, campaign_id);
create index idx_lore_access_target on public.lore_player_access (target_type, target_id);

-- Public share tokens -------------------------------------------------------

create table public.campaign_share_tokens (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  token        text not null unique,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index idx_share_tokens_token on public.campaign_share_tokens (token) where is_active;

-- Maps ----------------------------------------------------------------------

create table public.maps (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  title        text not null,
  image_url    text not null,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_maps_campaign on public.maps (campaign_id);

create table public.map_annotations (
  id               uuid primary key default uuid_generate_v4(),
  map_id           uuid not null references public.maps(id) on delete cascade,
  x                double precision not null,
  y                double precision not null,
  label            text not null,
  description      text,
  linked_entity_id uuid references public.lore_entities(id) on delete set null,
  is_public        boolean not null default false
);

create index idx_map_annotations_map on public.map_annotations (map_id);

-- Characters ----------------------------------------------------------------

create table public.characters (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid references public.campaigns(id) on delete set null,
  user_id        uuid not null references public.users(id) on delete cascade,
  character_data jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_characters_campaign on public.characters (campaign_id);
create index idx_characters_user on public.characters (user_id);

-- updated_at auto-touch -----------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_lore_entities_touch
  before update on public.lore_entities
  for each row execute function public.touch_updated_at();

create trigger trg_characters_touch
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- Auth sync -----------------------------------------------------------------
-- When a new auth.users row is created, mirror it into public.users.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
