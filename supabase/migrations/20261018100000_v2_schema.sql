-- Schema v2 — Thiên Vân Đại Lục (database làm mới từ đầu, không migration save cũ).
-- Nguyên tắc:
--   * Mọi bảng/hàm game nằm trong schema `game`, KHÔNG nằm trong `public` => PostgREST không expose ra client.
--   * Client (anon/authenticated) không có bất kỳ quyền nào; chỉ `service_role` (Edge Function) gọi hàm game.
--   * Tách rõ account (meta, bền vững) và life (kiếp, mất khi chết). Thiên Mệnh/stat thuộc account.
--   * Death/TM/đột phá chỉ do hàm pgSQL quyết định (transaction + idempotent).

create schema if not exists game;
revoke all on schema game from public;
grant usage on schema game to service_role;

-- ---------------------------------------------------------------- dữ liệu tĩnh (nạp ở migration sau, sinh từ data/*.csv)
create table game.stages (
  idx                   smallint primary key check (idx between 0 and 14),
  stage_id              text not null unique,
  name                  text not null,
  world                 text not null check (world in ('Hạ Giới', 'Linh Giới', 'Tiên Giới')),
  day_start             int not null,
  day_end               int not null check (day_end > day_start),
  lifespan_cap_after    int not null,       -- thọ nguyên tối đa sau khi HOÀN TẤT giai đoạn này (100 + 20 × day_end)
  clean_consumed_years  int not null,
  p_death_tang9         numeric(6, 4) not null check (p_death_tang9 between 0 and 1)  -- GIẢ ĐỊNH, chưa đo
);

create table game.tm_catalog (
  id              text primary key,
  name            text not null,
  kind            text not null check (kind in ('stat', 'item')),
  stat_key        text check (stat_key in ('TuongMao', 'PhucDuyen', 'CanCot', 'NgoTinh', 'VanKhi')),
  base_cost       int,
  step_cost       int,
  level_cap       int,
  cost            int,
  per_life_limit  int,
  effect          text not null,
  check ((kind = 'stat' and stat_key is not null and base_cost is not null and step_cost is not null and level_cap is not null)
      or (kind = 'item' and cost is not null and per_life_limit is not null))
);

create table game.rules (
  key    text primary key,
  value  jsonb not null
);

-- ---------------------------------------------------------------- account (meta, giữ qua trùng sinh)
create table game.accounts (
  account_id   uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  tm_balance   int not null default 0 check (tm_balance >= 0),
  tm_earned    int not null default 0 check (tm_earned >= 0),
  tm_spent     int not null default 0 check (tm_spent >= 0),
  life_count   int not null default 0 check (life_count >= 0),   -- số kiếp đã kết thúc
  last_seen_at timestamptz
);

create table game.account_stats (
  account_id  uuid not null references game.accounts (account_id) on delete cascade,
  stat_key    text not null check (stat_key in ('TuongMao', 'PhucDuyen', 'CanCot', 'NgoTinh', 'VanKhi')),
  level       int not null default 0 check (level >= 0),
  primary key (account_id, stat_key)
);

-- Sổ cái Thiên Mệnh: bằng chứng kiểm toán + khóa idempotency (account, reason, ref).
create table game.tm_ledger (
  id          bigint generated always as identity primary key,
  account_id  uuid not null references game.accounts (account_id) on delete cascade,
  delta       int not null check (delta <> 0),
  reason      text not null,
  ref         text not null,
  created_at  timestamptz not null default now(),
  unique (account_id, reason, ref)
);

-- ---------------------------------------------------------------- life (kiếp hiện tại, mất khi chết)
create table game.lives (
  life_id        uuid primary key default gen_random_uuid(),
  account_id     uuid not null references game.accounts (account_id) on delete cascade,
  life_no        int not null,
  status         text not null default 'alive' check (status in ('alive', 'dead', 'cleared')),
  stage_idx      smallint not null default 0 references game.stages (idx),
  tang           smallint not null default 1 check (tang between 1 and 9),
  progress_s     double precision not null default 0 check (progress_s >= 0),   -- giây tu luyện đã tích cho tầng hiện tại
  credited_s     double precision not null default 0 check (credited_s >= 0),   -- tổng giây được tính (để tính thọ nguyên)
  last_settle_at timestamptz not null default now(),
  ls             bigint not null default 0 check (ls >= 0),
  lt             bigint not null default 0 check (lt >= 0),
  tn             bigint not null default 0 check (tn >= 0),
  tm_earned_life int not null default 0,
  born_at        timestamptz not null default now(),
  ended_at       timestamptz,
  death_cause    text,
  unique (account_id, life_no)
);
-- Mỗi account tối đa một kiếp đang sống: chặn race khi tạo kiếp mới.
create unique index lives_one_alive_per_account on game.lives (account_id) where status = 'alive';

create table game.life_items (
  item_id      uuid primary key default gen_random_uuid(),
  life_id      uuid not null references game.lives (life_id) on delete cascade,
  catalog_id   text not null references game.tm_catalog (id),
  acquired_at  timestamptz not null default now(),
  used_at      timestamptz
);
create index life_items_life on game.life_items (life_id);

-- Mỗi mốc (giai đoạn, tầng) chỉ phát TM một lần trong một kiếp.
create table game.life_milestones (
  life_id     uuid not null references game.lives (life_id) on delete cascade,
  stage_idx   smallint not null,
  tang        smallint not null check (tang between 1 and 9),
  claimed_at  timestamptz not null default now(),
  primary key (life_id, stage_idx, tang)
);

-- Lịch sử kiếp (Bia Thiên Mệnh): giữ vĩnh viễn, không phụ thuộc life đã bị xóa tài sản.
create table game.life_history (
  life_id        uuid primary key,
  account_id     uuid not null references game.accounts (account_id) on delete cascade,
  life_no        int not null,
  cause          text not null,
  stage_idx      smallint not null,
  tang           smallint not null,
  credited_days  double precision not null,
  tm_earned      int not null,
  born_at        timestamptz not null,
  ended_at       timestamptz not null,
  snapshot       jsonb not null,
  unique (account_id, life_no)
);

-- Đột phá hai bước: prepare (hiện rủi ro) → confirm. Mỗi intent dùng một lần.
create table game.breakthrough_intents (
  intent_id    uuid primary key default gen_random_uuid(),
  life_id      uuid not null references game.lives (life_id) on delete cascade,
  stage_idx    smallint not null,
  death_prob   numeric(8, 6) not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  outcome      text check (outcome in ('success', 'death', 'expired', 'superseded'))
);
create index breakthrough_intents_life on game.breakthrough_intents (life_id) where consumed_at is null;

-- Telemetry tối thiểu (death theo nguyên nhân/giai đoạn, TM earned/spent...).
create table game.events (
  id          bigint generated always as identity primary key,
  account_id  uuid not null,
  life_id     uuid,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
create index events_kind_at on game.events (kind, at);

create table game.rate_limits (
  account_id    uuid not null,
  key           text not null,
  window_start  timestamptz not null,
  hits          int not null,
  primary key (account_id, key)
);

-- ---------------------------------------------------------------- khóa client: RLS bật, KHÔNG có policy, thu hồi quyền
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'game' loop
    execute format('alter table game.%I enable row level security', t);
    execute format('alter table game.%I force row level security', t);
    execute format('revoke all on game.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on game.%I to service_role', t);
  end loop;
end $$;
-- service_role có BYPASSRLS trên Supabase; policy rỗng nghĩa là mọi vai trò khác bị từ chối.
