-- Hư Giới: dữ liệu gameplay KHÔNG công khai qua PostgREST.
-- Chuẩn bị offline; KHÔNG tự đẩy lên project khi chưa có phê duyệt.
-- Mốc thời gian lưu epoch milliseconds (bigint), tương thích SQLite V9.
-- Giữ dữ liệu tài khoản Thiên Mệnh Các (bổ sung sau 0668d33).
create schema if not exists game;

-- Schema phải được kiểm tra KHÔNG xuất hiện trong Data API exposed schemas.
revoke all on schema game from public, anon, authenticated;
alter default privileges in schema game revoke all on tables from public, anon, authenticated;
alter default privileges in schema game revoke all on sequences from public, anon, authenticated;
alter default privileges in schema game revoke all on functions from public, anon, authenticated;

create table if not exists game.players (
  id uuid primary key,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  name_key text not null unique,
  revision bigint not null default 0 check (revision >= 0),
  schema_version integer not null,
  content_version text not null,
  state jsonb not null
    check (jsonb_typeof(state) = 'object' and octet_length(convert_to(state::text, 'UTF8')) <= 65536),
  rng_seed text not null check (rng_seed ~ '^[0-9a-f]{64}$'),
  rng_counter bigint not null default 0 check (rng_counter >= 0),
  last_seen_at bigint not null,
  created_at bigint not null,
  updated_at bigint not null,
  rate_tokens jsonb not null default '{}'::jsonb check (jsonb_typeof(rate_tokens) = 'object'),
  tokens_at bigint not null default 0
);

create table if not exists game.player_receipts (
  player_id uuid not null references game.players(id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 128),
  fingerprint text not null,
  revision bigint not null,
  response jsonb not null,
  created_at bigint not null,
  expires_at bigint not null,
  primary key (player_id, request_id)
);
create index if not exists game_player_receipts_expires_at
  on game.player_receipts(expires_at);

create table if not exists game.creation_tickets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  preview jsonb not null check (jsonb_typeof(preview) = 'object'),
  created_at bigint not null,
  expires_at bigint not null,
  used_at bigint
);
create index if not exists game_creation_tickets_owner_created
  on game.creation_tickets(owner_id, created_at desc);
create index if not exists game_creation_tickets_expiry
  on game.creation_tickets(expires_at) where used_at is null;

-- Gameplay bổ sung ở main: tài sản Thiên Mệnh Các tồn tại qua các kiếp.
create table if not exists game.pavilion_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  total_earned bigint not null default 0 check (total_earned >= 0),
  rebirths bigint not null default 0 check (rebirths >= 0),
  upgrades jsonb not null default '{}'::jsonb check (jsonb_typeof(upgrades) = 'object'),
  relics jsonb not null default '{}'::jsonb check (jsonb_typeof(relics) = 'object'),
  version bigint not null default 0 check (version >= 0)
);

create table if not exists game.pavilion_receipts (
  owner_id uuid not null references game.pavilion_accounts(owner_id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 128),
  fingerprint text not null,
  created_at bigint not null default 0,
  primary key (owner_id, request_id)
);

-- Phòng thủ nhiều lớp. Chỉ chủ kết nối DB trực tiếp (postgres) mới được
-- quyền owner-bypass RLS; không tạo policy cho anon/authenticated.
alter table game.players enable row level security;
alter table game.player_receipts enable row level security;
alter table game.creation_tickets enable row level security;
alter table game.pavilion_accounts enable row level security;
alter table game.pavilion_receipts enable row level security;

revoke all on all tables in schema game from public, anon, authenticated;
revoke all on all sequences in schema game from public, anon, authenticated;
revoke all on all functions in schema game from public, anon, authenticated;
revoke all on schema game from public, anon, authenticated;

comment on schema game is 'Dữ liệu gameplay Hư Giới: private, chỉ Edge Function kết nối trực tiếp';
comment on table game.players is 'Một đạo thân cho mỗi auth.users; time/RNG/limits server-authoritative';
comment on table game.pavilion_accounts is 'Thiên Mệnh Các gắn tài khoản và tồn tại xuyên kiếp';
