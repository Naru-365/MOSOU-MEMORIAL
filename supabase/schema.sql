-- MOSOU-MEMORIAL — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL) once per project.
--
-- Save-data sync table. One row per anonymous saveId (a client-generated UUID
-- that acts as an unguessable capability token). All reads/writes go through
-- the server API routes using the Service Role key, which BYPASSES RLS. We keep
-- RLS enabled with NO public policies so the anon key cannot touch this table
-- directly from the browser.

create table if not exists public.saves (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.saves enable row level security;
-- Intentionally NO policies: only the Service Role (server) may read/write.

-- Storage bucket for generated look images is created idempotently at runtime
-- by app/api/looks/upload (ensureLookImagesBucket). To create it manually:
--   Dashboard → Storage → New bucket → name "look-images", Public = ON.
