begin;

create table if not exists public.game_player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  rev bigint not null default 0 check (rev >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_pvp_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Vô Danh' check (char_length(name) between 1 and 40),
  rating integer not null default 1000 check (rating >= 0),
  power bigint not null default 0 check (power >= 0),
  defense_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists game_pvp_profiles_rank_idx
  on public.game_pvp_profiles (rating desc, power desc, updated_at asc);

create table if not exists public.game_pvp_battles (
  id bigint generated always as identity primary key,
  attacker_id uuid not null references auth.users(id) on delete cascade,
  defender_id uuid not null references auth.users(id) on delete cascade,
  seed bigint not null,
  attacker_snapshot jsonb not null,
  defender_snapshot jsonb not null,
  result jsonb not null,
  winner_id uuid references auth.users(id) on delete set null,
  attacker_delta integer not null,
  defender_delta integer not null,
  created_at timestamptz not null default now(),
  check (attacker_id <> defender_id)
);

create index if not exists game_pvp_battles_attacker_idx
  on public.game_pvp_battles (attacker_id, created_at desc);
create index if not exists game_pvp_battles_defender_idx
  on public.game_pvp_battles (defender_id, created_at desc);

create table if not exists public.game_chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists game_chat_messages_created_idx
  on public.game_chat_messages (id desc);

create table if not exists public.game_server_config (
  id boolean primary key default true check (id),
  maintenance boolean not null default false,
  reason text not null default '',
  banner text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.game_server_config(id) values (true)
on conflict (id) do nothing;

-- Preserve every existing V1 save without attempting a lossy field mapping.
-- The Go domain normalizes the V2 fields while the original payload remains available
-- under state.legacy for a later one-time migration once mappings are verified.
do $migration$
begin
  if to_regclass('public.player_saves') is not null then
    execute $sql$
      insert into public.game_player_state(user_id, state, rev, updated_at)
      select user_id,
             jsonb_build_object(
               'legacy', jsonb_build_object('save', save, 'meta', meta),
               'name', coalesce(nullif(save->>'name',''), 'Vô Danh'),
               'lastTick', now()
             ),
             0,
             now()
      from public.player_saves
      on conflict (user_id) do nothing
    $sql$;
  end if;
end
$migration$;

alter table public.game_player_state enable row level security;
alter table public.game_pvp_profiles enable row level security;
alter table public.game_pvp_battles enable row level security;
alter table public.game_chat_messages enable row level security;
alter table public.game_server_config enable row level security;

-- V2 gameplay data is backend-only. The Go service connects with a trusted DB role.
-- Browser clients get no direct table privileges; Supabase Auth is still used for sessions.
revoke all on public.game_player_state from anon, authenticated;
revoke all on public.game_pvp_profiles from anon, authenticated;
revoke all on public.game_pvp_battles from anon, authenticated;
revoke all on public.game_chat_messages from anon, authenticated;
revoke all on public.game_server_config from anon, authenticated;
revoke usage, select on all sequences in schema public from anon, authenticated;

commit;
