-- MOSOU-MEMORIAL — Supabase schema (normalized cloud save)
-- Run in the Supabase SQL Editor (Dashboard → SQL). Safe to re-run:
-- `create ... if not exists` will NOT alter tables that already exist.
--
-- Save data is keyed by device_id (= the client's anonymous saveId, an
-- unguessable capability token). All reads/writes go through the server route
-- /api/sync using the Service Role key, which BYPASSES RLS. RLS is enabled with
-- NO public policies so the anon key cannot touch these tables from the browser.
-- interrupters and settings are app-local config and have no table here.

create extension if not exists pgcrypto;

create table if not exists public.characters (
  id              uuid primary key default gen_random_uuid(),
  device_id       text not null,
  name            text not null,
  personality     text not null,
  appearance      text not null,
  profile         jsonb,
  current_look_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.looks (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references public.characters(id) on delete cascade,
  label           text not null,
  attributes      jsonb,
  images          jsonb,          -- { emotion: Storage public URL }
  reference_image text,           -- neutral Storage public URL
  base_prompt     text,
  created_at      timestamptz not null default now()
);

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters(id) on delete cascade,
  role          text not null,
  content       text not null,
  emotion       text,
  interrupter_id text,
  system_note   boolean default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.game_states (
  device_id      text not null,
  character_id   uuid not null references public.characters(id) on delete cascade,
  affinity       integer not null default 50,
  jealousy       integer not null default 0,
  turn_count     integer not null default 0,
  phase          text not null default 'playing',
  onboarding_turn integer not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (device_id, character_id)
);

-- Indexes for cheap device-scoped pulls and newest-active resolution.
create index if not exists idx_characters_device on public.characters(device_id);
create index if not exists idx_looks_character on public.looks(character_id);
create index if not exists idx_messages_character_created on public.messages(character_id, created_at);
create index if not exists idx_game_states_device_updated on public.game_states(device_id, updated_at desc);

-- RLS on, no policies: only the Service Role (server route) may read/write.
alter table public.characters  enable row level security;
alter table public.looks       enable row level security;
alter table public.messages    enable row level security;
alter table public.game_states enable row level security;

-- NOTE: the FK ON DELETE CASCADE above applies to FRESH creates only. The live
-- tables may predate this file with a different cascade setting, so the /api/sync
-- route deletes children before parents explicitly and does not rely on cascade.
--
-- Storage bucket `look-images` (public) is created idempotently at runtime by
-- app/api/looks/upload (ensureLookImagesBucket). Manual: Dashboard → Storage →
-- New bucket → name "look-images", Public = ON.
