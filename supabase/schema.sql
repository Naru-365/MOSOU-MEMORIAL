-- 妄想メモリアル — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query -> Run).
--
-- Phase 1 (active now): the `character-images` Storage bucket holds generated
-- look images. The API route uploads PNGs here and returns public URLs, so
-- 立ち絵 persist across reloads and no longer bloat localStorage.
--
-- Phase 2 (next): the tables below move game data off localStorage into
-- Postgres. They include a `device_id` column for ownership since there is no
-- auth yet; tighten these into auth.uid()-based RLS when Supabase Auth lands.

-- ---------------------------------------------------------------------------
-- Storage bucket for generated images (public read; uploads via service role)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('character-images', 'character-images', true)
on conflict (id) do nothing;

-- Public read for the bucket (public=true already allows read, this is explicit)
drop policy if exists "character-images public read" on storage.objects;
create policy "character-images public read"
  on storage.objects for select
  using (bucket_id = 'character-images');

-- ---------------------------------------------------------------------------
-- Phase 2 tables (not yet wired into the app; safe to create now)
-- ---------------------------------------------------------------------------
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  name text not null,
  personality text not null default '優しい',
  appearance text not null default '清楚系',
  profile jsonb,
  current_look_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists characters_device_idx on characters (device_id);

create table if not exists looks (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  label text not null,
  attributes jsonb not null default '{}'::jsonb,
  images jsonb not null default '{}'::jsonb, -- emotion -> public image URL
  reference_image text,
  base_prompt text,
  created_at timestamptz not null default now()
);
create index if not exists looks_character_idx on looks (character_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  role text not null,                 -- user | character | interrupter
  content text not null,
  emotion text,
  interrupter_id text,
  system_note boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_character_idx on messages (character_id, created_at);

create table if not exists game_states (
  device_id text not null,
  character_id uuid not null references characters (id) on delete cascade,
  affinity int not null default 50,
  jealousy int not null default 0,
  turn_count int not null default 0,
  phase text not null default 'onboarding',
  onboarding_turn int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (device_id, character_id)
);

-- Enable RLS. Phase 1 keeps these tables unused; Phase 2 will add device_id /
-- auth.uid() scoped policies. Until then, no broad policies are granted, so the
-- anon key cannot read/write these tables (only the service role can).
alter table characters enable row level security;
alter table looks enable row level security;
alter table messages enable row level security;
alter table game_states enable row level security;
