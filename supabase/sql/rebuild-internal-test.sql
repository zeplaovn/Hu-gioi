-- INTERNAL TEST ONLY. Rebuilds EMPTY game tables; test Auth accounts and consent history are preserved.
-- NEVER run against production. Requires all game.* tables to have zero rows.
-- Recreates public.policy_acceptances and ALL game.* tables/indexes/RLS/functions from
-- the exact historical schema migrations already applied to Supabase.
-- Does NOT alter Supabase-managed auth/storage/realtime or migration ledger.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $internal_test_empty$
DECLARE
  candidate record;
  populated boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'game'
      AND tablename NOT IN ('players','player_receipts','creation_tickets',
         'pavilion_accounts','pavilion_receipts','world_chat_messages',
         'world_chat_presence','player_leaderboard')
  ) THEN
    RAISE EXCEPTION 'REFUSED: unexpected game table exists. Review schema before reset.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public'
      AND tablename <> 'policy_acceptances'
  ) THEN
    RAISE EXCEPTION 'REFUSED: unexpected public table exists. Review schema before reset.';
  END IF;
  FOR candidate IN
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname = 'game'
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I)', candidate.schemaname, candidate.tablename)
      INTO populated;
    IF populated THEN
      RAISE EXCEPTION 'REFUSED: %.% contains data.', candidate.schemaname, candidate.tablename;
    END IF;
  END LOOP;
END;
$internal_test_empty$;

-- Do not destroy existing account/consent history: snapshot in this transaction.
LOCK TABLE public.policy_acceptances IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE hu_policy_acceptances_snapshot ON COMMIT DROP AS
  SELECT user_id,policy_kind,policy_version,accepted_at
  FROM public.policy_acceptances;

DROP SCHEMA IF EXISTS game CASCADE;
DROP TABLE IF EXISTS public.policy_acceptances CASCADE;


-- ========================================
-- Historic migration 20261109095404: add_hu_gioi_policy_acceptances
-- ========================================
-- Lưu bằng chứng người dùng đã chủ động chấp thuận từng phiên bản văn bản.
-- Không lưu địa chỉ IP hoặc user-agent; thời điểm luôn do PostgreSQL ghi.
create table if not exists public.policy_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_kind text not null check (policy_kind in ('privacy', 'release_terms')),
  policy_version text not null check (policy_version = '2026-11-09'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, policy_kind, policy_version)
);
alter table public.policy_acceptances enable row level security;
revoke all on table public.policy_acceptances from public, anon, authenticated;
grant select on table public.policy_acceptances to authenticated;
grant insert (user_id, policy_kind, policy_version) on table public.policy_acceptances to authenticated;
create policy policy_acceptances_read_own on public.policy_acceptances
  for select to authenticated using (user_id = (select auth.uid()));
create policy policy_acceptances_insert_own on public.policy_acceptances
  for insert to authenticated with check (user_id = (select auth.uid()));
comment on table public.policy_acceptances is 'Consent ledger for current privacy and game release terms (2026-11-09). No UPDATE/DELETE privileges for clients.';

-- ========================================
-- Historic migration 20261109120945: allow_online_only_policy_consent_v2
-- ========================================
-- Preserve consent history while requiring re-consent for the online-only release.
alter table public.policy_acceptances
  drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances
  add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09', '2026-11-09-v2'));
comment on table public.policy_acceptances is
  'Versioned immutable user consent ledger. 2026-11-09-v2 explicitly covers server-side gameplay state; older consent is not accepted by online API.';

-- ========================================
-- Historic migration 20261109125831: allow_v3_permadeath_policy_consent
-- ========================================
ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3'));
COMMENT ON TABLE public.policy_acceptances IS 'Immutable account consent ledger. v3 covers server-authoritative permanent-death gameplay and fully paused offline progression; older versions remain stored but do not authorize the v3 game.';

-- ========================================
-- Historic migration 20261109145450: allow_v4_email_ip_auth_consent
-- ========================================
ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3', '2026-11-09-v4'));
COMMENT ON TABLE public.policy_acceptances IS 'Account consent ledger. v4 discloses verified registration email and IP-scoped login attempt throttling; retain v1-v3 historical acceptance rows.';

-- ========================================
-- Historic migration 20261110051049: allow_v5_policy_consent
-- ========================================
alter table public.policy_acceptances drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4','2026-11-10-v5'));

-- ========================================
-- Historic migration 20261110075419: game_schema
-- ========================================
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

-- ========================================
-- Historic migration 20261111015058: online_social_and_indexed_leaderboard
-- ========================================
-- Hư Giới: chat thế giới + bảng xếp hạng người chơi, tối ưu cho Edge transaction pooler.
-- Chạy sau game_schema.sql; dữ liệu private, browser KHÔNG truy cập bảng trực tiếp.
-- Truy vấn chat dùng keyset id > cursor + LIMIT 50; không OFFSET.
-- Leaderboard projection chỉ được cập nhật khi rating/realm/name/wins/losses thực sự đổi.

CREATE TABLE IF NOT EXISTS game.world_chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL CHECK (length(sender_name) BETWEEN 1 AND 60),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 400),
  request_id uuid NOT NULL,
  created_at bigint NOT NULL,
  UNIQUE(owner_id, request_id)
);
-- Index PK(id) dùng cho lịch sử mới nhất và keyset polling; không tạo index trùng.
-- Index owner/time dùng kiểm tra khoảng 2s giữa các tin, chống spam trên DB.
CREATE INDEX IF NOT EXISTS game_world_chat_sender_time
  ON game.world_chat_messages(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game.world_chat_presence (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS game_world_chat_online
  ON game.world_chat_presence(seen_at DESC);

CREATE TABLE IF NOT EXISTS game.player_leaderboard (
  player_id uuid PRIMARY KEY REFERENCES game.players(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  realm integer NOT NULL DEFAULT 0,
  rating integer NOT NULL DEFAULT 1000,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS game_player_leaderboard_rating
  ON game.player_leaderboard(rating DESC, player_id ASC)
  INCLUDE (owner_id, name, realm, wins, losses);

-- Cập nhật projection khi số liệu cạnh tranh thay đổi, không ghi theo heartbeat.
CREATE OR REPLACE FUNCTION game.sync_player_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, game
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
    NEW.name IS NOT DISTINCT FROM OLD.name AND
    NEW.state ->> 'realm' IS NOT DISTINCT FROM OLD.state ->> 'realm' AND
    NEW.state #>> '{social,pvp,rating}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,rating}' AND
    NEW.state #>> '{social,pvp,wins}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,wins}' AND
    NEW.state #>> '{social,pvp,losses}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,losses}'
  THEN
    RETURN NEW;
  END IF;
  INSERT INTO game.player_leaderboard
    (player_id, owner_id, name, realm, rating, wins, losses, updated_at)
  VALUES (
    NEW.id, NEW.owner_id, NEW.name,
    COALESCE((NEW.state ->> 'realm')::integer, 0),
    COALESCE((NEW.state #>> '{social,pvp,rating}')::integer, 1000),
    COALESCE((NEW.state #>> '{social,pvp,wins}')::integer, 0),
    COALESCE((NEW.state #>> '{social,pvp,losses}')::integer, 0),
    NEW.updated_at
  )
  ON CONFLICT(player_id) DO UPDATE SET
    name = EXCLUDED.name,
    realm = EXCLUDED.realm,
    rating = EXCLUDED.rating,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_sync_player_leaderboard ON game.players;
CREATE TRIGGER trg_sync_player_leaderboard
  AFTER INSERT OR UPDATE OF state, name ON game.players
  FOR EACH ROW EXECUTE FUNCTION game.sync_player_leaderboard();

-- Backfill một lần, không ghi state/RNG. Tránh cập nhật không cần thiết khi triển khai lại.
INSERT INTO game.player_leaderboard
  (player_id, owner_id, name, realm, rating, wins, losses, updated_at)
SELECT id, owner_id, name,
  COALESCE((state ->> 'realm')::integer, 0),
  COALESCE((state #>> '{social,pvp,rating}')::integer, 1000),
  COALESCE((state #>> '{social,pvp,wins}')::integer, 0),
  COALESCE((state #>> '{social,pvp,losses}')::integer, 0),
  updated_at
FROM game.players
ON CONFLICT(player_id) DO NOTHING;

ALTER TABLE game.world_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game.world_chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE game.player_leaderboard ENABLE ROW LEVEL SECURITY;
-- Schema private: đọc/ghi bằng server sau xác minh JWT và consent, không qua PostgREST.
REVOKE ALL ON game.world_chat_messages, game.world_chat_presence, game.player_leaderboard FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA game FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION game.sync_player_leaderboard() FROM PUBLIC, anon, authenticated;

-- ========================================
-- Historic migration 20261111020645: allow_v6_policy_consent_online_social
-- ========================================
-- Hư Giới: phiên bản chính sách 11/11/2026-v6 mô tả chat và bảng xếp hạng thật.
-- Mở rộng danh sách version được phép, giữ nguyên v1-v5 và tất cả xác nhận cũ.
ALTER TABLE public.policy_acceptances
  DROP CONSTRAINT policy_acceptances_policy_version_check,
  ADD CONSTRAINT policy_acceptances_policy_version_check
    CHECK (policy_version IN (
      '2026-11-09', '2026-11-09-v2', '2026-11-09-v3',
      '2026-11-09-v4', '2026-11-10-v5', '2026-11-11-v6'
    ));

-- ========================================
-- Historic migration 20261111022001: desktop_chat_channels_and_power_ranks
-- ========================================
-- Hư Giới: kênh chat + bảng lực chiến/cảnh giới, triển khai bổ sung không xóa dữ liệu.
ALTER TABLE game.world_chat_messages
  ADD COLUMN IF NOT EXISTS channel_key text NOT NULL DEFAULT 'world';
CREATE INDEX IF NOT EXISTS game_world_chat_channel_id
  ON game.world_chat_messages(channel_key, id DESC);

ALTER TABLE game.players
  ADD COLUMN IF NOT EXISTS combat_power bigint NOT NULL DEFAULT 0;
ALTER TABLE game.player_leaderboard
  ADD COLUMN IF NOT EXISTS combat_power bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sect_id text;
CREATE INDEX IF NOT EXISTS game_player_rank_combat
  ON game.player_leaderboard(combat_power DESC, player_id ASC)
  INCLUDE(name,realm,stage,owner_id);
CREATE INDEX IF NOT EXISTS game_player_rank_realm
  ON game.player_leaderboard(realm DESC, stage DESC, combat_power DESC, player_id ASC)
  INCLUDE(name,owner_id);
-- Một hàng account duy nhất: kiểm tra membership tông môn chỉ quét chỉ mục owner_id.
CREATE INDEX IF NOT EXISTS game_player_rank_sect
  ON game.player_leaderboard(sect_id) WHERE sect_id IS NOT NULL;

CREATE OR REPLACE FUNCTION game.sync_player_leaderboard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, game AS $$
DECLARE
  current_sect text;
BEGIN
  current_sect := CASE WHEN NEW.state #>> '{sect,joined}' = 'true'
    THEN NULLIF(NEW.state #>> '{sect,id}', '') ELSE NULL END;
  IF TG_OP = 'UPDATE' AND
    NEW.name IS NOT DISTINCT FROM OLD.name AND
    NEW.combat_power IS NOT DISTINCT FROM OLD.combat_power AND
    NEW.state ->> 'realm' IS NOT DISTINCT FROM OLD.state ->> 'realm' AND
    NEW.state ->> 'stage' IS NOT DISTINCT FROM OLD.state ->> 'stage' AND
    NEW.state #>> '{sect,id}' IS NOT DISTINCT FROM OLD.state #>> '{sect,id}' AND
    NEW.state #>> '{sect,joined}' IS NOT DISTINCT FROM OLD.state #>> '{sect,joined}' AND
    NEW.state #>> '{social,pvp,rating}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,rating}' AND
    NEW.state #>> '{social,pvp,wins}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,wins}' AND
    NEW.state #>> '{social,pvp,losses}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,losses}'
  THEN RETURN NEW; END IF;
  INSERT INTO game.player_leaderboard
    (player_id,owner_id,name,realm,stage,combat_power,sect_id,rating,wins,losses,updated_at)
  VALUES (
    NEW.id,NEW.owner_id,NEW.name,
    COALESCE((NEW.state ->> 'realm')::integer,0),
    COALESCE((NEW.state ->> 'stage')::integer,1),
    NEW.combat_power,current_sect,
    COALESCE((NEW.state #>> '{social,pvp,rating}')::integer,1000),
    COALESCE((NEW.state #>> '{social,pvp,wins}')::integer,0),
    COALESCE((NEW.state #>> '{social,pvp,losses}')::integer,0),
    NEW.updated_at
  )
  ON CONFLICT(player_id) DO UPDATE SET
    name=EXCLUDED.name,realm=EXCLUDED.realm,stage=EXCLUDED.stage,
    combat_power=EXCLUDED.combat_power,sect_id=EXCLUDED.sect_id,
    rating=EXCLUDED.rating,wins=EXCLUDED.wins,losses=EXCLUDED.losses,updated_at=EXCLUDED.updated_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_player_leaderboard ON game.players;
CREATE TRIGGER trg_sync_player_leaderboard
  AFTER INSERT OR UPDATE OF name,state,combat_power ON game.players
  FOR EACH ROW EXECUTE FUNCTION game.sync_player_leaderboard();

UPDATE game.player_leaderboard l
SET combat_power=p.combat_power,
    stage=COALESCE((p.state->>'stage')::integer,1),
    sect_id=CASE WHEN p.state #>> '{sect,joined}'='true'
      THEN NULLIF(p.state #>> '{sect,id}','') ELSE NULL END
FROM game.players p WHERE l.player_id=p.id
  AND (l.combat_power IS DISTINCT FROM p.combat_power OR
       l.stage IS DISTINCT FROM COALESCE((p.state->>'stage')::integer,1) OR
       l.sect_id IS DISTINCT FROM (CASE WHEN p.state #>> '{sect,joined}'='true'
         THEN NULLIF(p.state #>> '{sect,id}','') ELSE NULL END));
-- Index danh vọng cũ không còn cần trong đường query mới.
DROP INDEX IF EXISTS game.game_player_leaderboard_rating;

-- ========================================
-- Historic migration 20261111023603: v7_consent_and_deceased_leaderboard
-- ========================================
-- Hư Giới: v7 chấp thuận chính sách (chat 4 kênh, bắt đầu lại từ đầu).
-- Giữ lại mọi phiên bản cũ để lịch sử đồng ý vẫn được đối soát.
ALTER TABLE public.policy_acceptances
  DROP CONSTRAINT policy_acceptances_policy_version_check,
  ADD CONSTRAINT policy_acceptances_policy_version_check
    CHECK (policy_version IN (
      '2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4',
      '2026-11-10-v5','2026-11-11-v6','2026-11-11-v7'
    ));
-- Không hiển thị nhân vật đã tử vong trong các bảng xếp hạng.
DELETE FROM game.player_leaderboard l
USING game.players p
WHERE p.id = l.player_id
  AND p.state->'death' IS NOT NULL
  AND p.state->'death' <> 'null'::jsonb;

-- ========================================
-- Historic migration 20261111030718: exclude_dead_from_live_leaderboards
-- ========================================
-- Không hồi sinh thứ hạng khi dữ liệu nhân vật đã tọa hóa tiếp tục cập nhật.
-- Chỉ thay trigger hiện hành; không động đến progress, balance hay lịch sử khác.
CREATE OR REPLACE FUNCTION game.sync_player_leaderboard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, game AS $$
DECLARE
  current_sect text;
BEGIN
  -- Chỉ đưa đạo thân còn sống lên Thiên Bảng. Trạng thái tử vong luôn thắng
  -- mọi chỉnh sửa sau đó (mua nâng cấp, sửa tên hoặc migration backfill).
  IF NEW.state -> 'death' IS NOT NULL AND NEW.state -> 'death' <> 'null'::jsonb THEN
    DELETE FROM game.player_leaderboard WHERE player_id = NEW.id;
    RETURN NEW;
  END IF;
  current_sect := CASE WHEN NEW.state #>> '{sect,joined}' = 'true'
    THEN NULLIF(NEW.state #>> '{sect,id}', '') ELSE NULL END;
  IF TG_OP = 'UPDATE' AND
    NEW.name IS NOT DISTINCT FROM OLD.name AND
    NEW.combat_power IS NOT DISTINCT FROM OLD.combat_power AND
    NEW.state ->> 'realm' IS NOT DISTINCT FROM OLD.state ->> 'realm' AND
    NEW.state ->> 'stage' IS NOT DISTINCT FROM OLD.state ->> 'stage' AND
    NEW.state #>> '{sect,id}' IS NOT DISTINCT FROM OLD.state #>> '{sect,id}' AND
    NEW.state #>> '{sect,joined}' IS NOT DISTINCT FROM OLD.state #>> '{sect,joined}' AND
    NEW.state #>> '{social,pvp,rating}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,rating}' AND
    NEW.state #>> '{social,pvp,wins}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,wins}' AND
    NEW.state #>> '{social,pvp,losses}' IS NOT DISTINCT FROM OLD.state #>> '{social,pvp,losses}'
  THEN RETURN NEW; END IF;
  INSERT INTO game.player_leaderboard
    (player_id,owner_id,name,realm,stage,combat_power,sect_id,rating,wins,losses,updated_at)
  VALUES (
    NEW.id,NEW.owner_id,NEW.name,
    COALESCE((NEW.state ->> 'realm')::integer,0),
    COALESCE((NEW.state ->> 'stage')::integer,1),
    NEW.combat_power,current_sect,
    COALESCE((NEW.state #>> '{social,pvp,rating}')::integer,1000),
    COALESCE((NEW.state #>> '{social,pvp,wins}')::integer,0),
    COALESCE((NEW.state #>> '{social,pvp,losses}')::integer,0),
    NEW.updated_at
  )
  ON CONFLICT(player_id) DO UPDATE SET
    name=EXCLUDED.name,realm=EXCLUDED.realm,stage=EXCLUDED.stage,
    combat_power=EXCLUDED.combat_power,sect_id=EXCLUDED.sect_id,
    rating=EXCLUDED.rating,wins=EXCLUDED.wins,losses=EXCLUDED.losses,updated_at=EXCLUDED.updated_at;
  RETURN NEW;
END $$;


-- Gỡ bản ghi tử vong cũ nếu có do bất kỳ lần ghi trạng thái trước đây.
DELETE FROM game.player_leaderboard AS l USING game.players AS p
WHERE p.id = l.player_id
  AND p.state -> 'death' IS NOT NULL
  AND p.state -> 'death' <> 'null'::jsonb;

-- Cleanup index migration present in main but not recorded in historical remote list.
-- B1: chỉ số phục vụ cleanup cơ hội theo người chơi/tài khoản, không sửa migration đã deploy.
-- Có thể chạy lặp lại an toàn; chỉ tác động cấu trúc index, không thay đổi schema V9.
CREATE INDEX IF NOT EXISTS game_player_receipts_player_expires
  ON game.player_receipts (player_id, expires_at);
CREATE INDEX IF NOT EXISTS game_creation_tickets_owner_expires
  ON game.creation_tickets (owner_id, expires_at);

-- Restore the versioned consent ledger with its original acceptance timestamps.
-- auth.users and all Supabase-managed schemas were never modified.
INSERT INTO public.policy_acceptances(user_id,policy_kind,policy_version,accepted_at)
SELECT s.user_id,s.policy_kind,s.policy_version,s.accepted_at
FROM pg_temp.hu_policy_acceptances_snapshot AS s
JOIN auth.users AS u ON u.id = s.user_id
ON CONFLICT DO NOTHING;

COMMIT;
