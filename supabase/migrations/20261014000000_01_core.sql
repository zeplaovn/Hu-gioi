-- Thiên Vân Đại Lục — core schema for a brand-new Supabase project.
-- Apply only to a fresh database. Supabase provides auth schema and roles.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save jsonb,
  meta jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trusted_game_ms bigint not null default 0,
  trusted_game_at timestamptz not null default now(),
  constraint player_saves_save_object check (save is null or jsonb_typeof(save) = 'object'),
  constraint player_saves_meta_object check (jsonb_typeof(meta) = 'object'),
  constraint player_saves_save_size check (save is null or octet_length(save::text) <= 262144),
  constraint player_saves_meta_size check (octet_length(meta::text) <= 262144)
);
