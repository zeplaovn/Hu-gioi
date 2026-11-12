-- One-time reset for the pre-public Hugioi project. Replaying this migration
-- against an existing deployment deletes all game data. Auth users and consent
-- records are retained. Never apply it to a project with data to preserve.
CREATE TEMP TABLE hugioi_consent_backup (user_id uuid, policy_kind text, policy_version text, accepted_at timestamptz) ON COMMIT DROP;
DO $$ BEGIN
  IF to_regclass('public.policy_acceptances') IS NOT NULL THEN
    INSERT INTO hugioi_consent_backup SELECT user_id, policy_kind, policy_version, accepted_at FROM public.policy_acceptances;
  END IF;
END $$;
DROP SCHEMA IF EXISTS game CASCADE;
DROP TABLE IF EXISTS public.policy_acceptances CASCADE;

-- Unified baseline for new databases. Historic source migrations are archived outside the replay path.

-- Source: 20261109095404_add_hu_gioi_policy_acceptances.sql
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


-- Source: 20261109120945_allow_online_only_policy_consent_v2.sql
-- Preserve consent history while requiring re-consent for the online-only release.
alter table public.policy_acceptances
  drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances
  add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09', '2026-11-09-v2'));
comment on table public.policy_acceptances is
  'Versioned immutable user consent ledger. 2026-11-09-v2 explicitly covers server-side gameplay state; older consent is not accepted by online API.';


-- Source: 20261109125831_allow_v3_permadeath_policy_consent.sql
ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3'));
COMMENT ON TABLE public.policy_acceptances IS 'Immutable account consent ledger. v3 covers server-authoritative permanent-death gameplay and fully paused offline progression; older versions remain stored but do not authorize the v3 game.';


-- Source: 20261109145450_allow_v4_email_ip_auth_consent.sql
ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3', '2026-11-09-v4'));
COMMENT ON TABLE public.policy_acceptances IS 'Account consent ledger. v4 discloses verified registration email and IP-scoped login attempt throttling; retain v1-v3 historical acceptance rows.';


-- Source: 20261110051049_allow_v5_policy_consent.sql
alter table public.policy_acceptances drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4','2026-11-10-v5'));


-- Source: 20261110075419_game_schema.sql
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


-- Source: 20261110095400_game_cleanup_indexes.sql
-- B1: chỉ số phục vụ cleanup cơ hội theo người chơi/tài khoản, không sửa migration đã deploy.
-- Có thể chạy lặp lại an toàn; chỉ tác động cấu trúc index, không thay đổi schema V9.
CREATE INDEX IF NOT EXISTS game_player_receipts_player_expires
  ON game.player_receipts (player_id, expires_at);
CREATE INDEX IF NOT EXISTS game_creation_tickets_owner_expires
  ON game.creation_tickets (owner_id, expires_at);


-- Source: 20261111015058_online_social_and_indexed_leaderboard.sql
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


-- Source: 20261111020645_allow_v6_policy_consent_online_social.sql
-- Hư Giới: phiên bản chính sách 11/11/2026-v6 mô tả chat và bảng xếp hạng thật.
-- Mở rộng danh sách version được phép, giữ nguyên v1-v5 và tất cả xác nhận cũ.
ALTER TABLE public.policy_acceptances
  DROP CONSTRAINT policy_acceptances_policy_version_check,
  ADD CONSTRAINT policy_acceptances_policy_version_check
    CHECK (policy_version IN (
      '2026-11-09', '2026-11-09-v2', '2026-11-09-v3',
      '2026-11-09-v4', '2026-11-10-v5', '2026-11-11-v6'
    ));

-- Source: 20261111022001_desktop_chat_channels_and_power_ranks.sql
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


-- Source: 20261111023603_v7_consent_and_deceased_leaderboard.sql
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


-- Source: 20261111030718_exclude_dead_from_live_leaderboards.sql
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


-- Source: 20261111110000_hugioi_admin_console.sql
-- Hư Giới internal admin console: RBAC read-only metrics + scoped public-chat moderation.
-- Additive migration; apply to staging after review. Does not touch existing player data.
-- PRIVACY: no player state, RNG seed, refresh token, private sect chat or credentials in RPC output.
-- AUTHORIZATION: only explicit entries in game.admin_users; never trust client metadata/JWT email.
-- RPCs are SECURITY DEFINER due to private game schema; each calls hu_admin_role().
CREATE TABLE IF NOT EXISTS game.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer','moderator','admin','owner')),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- SET NULL (không CASCADE): xóa tài khoản admin không được xóa dấu vết audit của họ.
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game.admin_users, game.admin_audit_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA game FROM PUBLIC, anon, authenticated;
-- No RLS policies for anon/authenticated. Only checked definer RPCs read these tables.

CREATE OR REPLACE FUNCTION public.hu_admin_role()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Admin login required' USING ERRCODE = '42501';
  END IF;
  SELECT a.role INTO v_role FROM game.admin_users AS a
    WHERE a.user_id = auth.uid() AND a.enabled = true;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized as Hư Giới admin' USING ERRCODE = '42501';
  END IF;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_me()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_role text;
BEGIN
  v_role := public.hu_admin_role();
  RETURN jsonb_build_object('user_id', auth.uid(), 'role', v_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE now_ms bigint;
BEGIN
  PERFORM public.hu_admin_role();
  now_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  RETURN jsonb_build_object(
    'registered', (SELECT count(*) FROM auth.users),
    'players', (SELECT count(*) FROM game.players),
    'online_now', (SELECT count(*) FROM game.players p
      WHERE p.last_seen_at >= now_ms - 90000
        AND (p.state->'death' IS NULL OR p.state->'death' = 'null'::jsonb)),
    'active_24h', (SELECT count(*) FROM game.players p WHERE p.last_seen_at >= now_ms - 86400000),
    'chat_1h', (SELECT count(*) FROM game.world_chat_messages m
      WHERE m.channel_key IN ('world','dao_huu','dao_lu')
        AND m.created_at >= now_ms - 3600000),
    'ranked', (SELECT count(*) FROM game.player_leaderboard),
    'server_time', now_ms
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_players(
  p_query text DEFAULT '', p_status text DEFAULT 'all', p_limit integer DEFAULT 50
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE q text; now_ms bigint;
BEGIN
  PERFORM public.hu_admin_role();
  IF p_status NOT IN ('all','online','offline','dead') OR p_status IS NULL THEN
    RAISE EXCEPTION 'Invalid player status' USING ERRCODE='22023';
  END IF;
  q := left(trim(coalesce(p_query, '')), 100);
  now_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.last_seen_at DESC), '[]'::jsonb)
    FROM (
      SELECT p.id::text AS id, p.owner_id::text AS user_id, p.name,
        coalesce((p.state->>'realm')::integer,0) AS realm,
        coalesce((p.state->>'stage')::integer,1) AS stage,
        p.combat_power, p.last_seen_at, p.revision,
        (p.state->'death' IS NOT NULL AND p.state->'death' <> 'null'::jsonb) AS dead,
        (p.last_seen_at >= now_ms - 90000
          AND (p.state->'death' IS NULL OR p.state->'death' = 'null'::jsonb)) AS online
      FROM game.players AS p
      WHERE (q = '' OR p.name ILIKE '%' || q || '%' OR p.owner_id::text ILIKE '%' || q || '%')
        AND (
          p_status='all'
          OR (p_status='dead' AND p.state->'death' IS NOT NULL AND p.state->'death' <> 'null'::jsonb)
          OR (p_status='online' AND p.last_seen_at >= now_ms - 90000
                AND (p.state->'death' IS NULL OR p.state->'death' = 'null'::jsonb))
          OR (p_status='offline' AND p.last_seen_at < now_ms - 90000
                AND (p.state->'death' IS NULL OR p.state->'death' = 'null'::jsonb))
        )
      ORDER BY p.last_seen_at DESC, p.id
      LIMIT least(greatest(coalesce(p_limit,50),1),100)
    ) AS x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_ranking(p_mode text DEFAULT 'power', p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM public.hu_admin_role();
  IF p_mode NOT IN ('power','realm') OR p_mode IS NULL THEN
    RAISE EXCEPTION 'Invalid ranking mode' USING ERRCODE='22023';
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
    FROM (
      SELECT l.player_id::text AS id, l.name, l.realm, l.stage, l.combat_power, l.updated_at
      FROM game.player_leaderboard AS l
      JOIN game.players AS p ON p.id = l.player_id
      WHERE p.state->'death' IS NULL OR p.state->'death' = 'null'::jsonb
      ORDER BY
        CASE WHEN p_mode='power' THEN l.combat_power END DESC NULLS LAST,
        CASE WHEN p_mode='realm' THEN l.realm END DESC NULLS LAST,
        CASE WHEN p_mode='realm' THEN l.stage END DESC NULLS LAST,
        l.combat_power DESC, l.player_id ASC
      LIMIT least(greatest(coalesce(p_limit,50),1),100)
    ) AS x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_chat(p_channel text DEFAULT 'world', p_limit integer DEFAULT 80)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE now_ms bigint;
BEGIN
  PERFORM public.hu_admin_role();
  -- Sect chat is private to its own sect. No admin bulk read via dashboard.
  IF p_channel NOT IN ('world','dao_huu','dao_lu') OR p_channel IS NULL THEN
    RAISE EXCEPTION 'Invalid or private chat channel' USING ERRCODE='42501';
  END IF;
  now_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id), '[]'::jsonb)
    FROM (
      SELECT m.id::text AS id, m.sender_name AS name, m.body,
        m.created_at, m.channel_key AS channel
      FROM game.world_chat_messages AS m
      WHERE m.channel_key = p_channel AND m.created_at >= now_ms - 3600000
      ORDER BY m.id DESC
      LIMIT least(greatest(coalesce(p_limit,80),1),100)
    ) AS x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_audit(p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM public.hu_admin_role();
  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id DESC), '[]'::jsonb)
    FROM (
      SELECT a.id::text AS id, a.admin_user_id::text, a.action, a.target_id,
        a.reason, a.created_at
      FROM game.admin_audit_log AS a
      ORDER BY a.id DESC LIMIT least(greatest(coalesce(p_limit,50),1),100)
    ) AS x
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hu_admin_delete_chat(p_message_id bigint, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_role text; v_deleted record; v_reason text;
BEGIN
  v_role := public.hu_admin_role();
  IF v_role NOT IN ('moderator','admin','owner') THEN
    RAISE EXCEPTION 'Moderator role required' USING ERRCODE='42501';
  END IF;
  v_reason := trim(coalesce(p_reason,''));
  IF length(v_reason) NOT BETWEEN 8 AND 256 THEN
    RAISE EXCEPTION 'Reason must contain 8–256 characters' USING ERRCODE='22023';
  END IF;
  IF p_message_id IS NULL OR p_message_id < 1 THEN
    RAISE EXCEPTION 'Invalid message id' USING ERRCODE='22023';
  END IF;
  DELETE FROM game.world_chat_messages
  WHERE id=p_message_id AND channel_key IN ('world','dao_huu','dao_lu')
  RETURNING id, channel_key INTO v_deleted;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted',false,'reason','not_found');
  END IF;
  INSERT INTO game.admin_audit_log(admin_user_id,action,target_id,reason)
  VALUES (auth.uid(),'delete_public_chat',v_deleted.channel_key||':'||v_deleted.id::text,v_reason);
  RETURN jsonb_build_object('deleted',true,'id',v_deleted.id::text);
END;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Close this before allowing authenticated calls.
REVOKE ALL ON FUNCTION public.hu_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_me() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_overview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_players(text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_ranking(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_chat(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_audit(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hu_admin_delete_chat(bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_players(text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_ranking(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_chat(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_audit(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_delete_chat(bigint,text) TO authenticated;
COMMENT ON TABLE game.admin_users IS 'Explicit, disabled-by-default allowlist for Hư Giới admin console';
COMMENT ON TABLE game.admin_audit_log IS 'Server-only moderation audit; no player private chat payload';


-- Source: 20261112000000_chat_limit_80.sql
-- Giới hạn lời truyền âm còn 80 ký tự. NOT VALID: áp dụng cho mọi tin mới, không quét/xóa tin cũ dài hơn.
ALTER TABLE game.world_chat_messages
  ADD CONSTRAINT world_chat_messages_body_max80 CHECK (length(body) <= 80) NOT VALID;

-- Chỉ chữ ASCII, chữ tiếng Việt (NFC), chữ số; giữa các từ đúng 1 dấu cách. NOT VALID: không quét tin cũ.
ALTER TABLE game.world_chat_messages
  ADD CONSTRAINT world_chat_messages_body_charset CHECK (
    body ~ '^[0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+( [0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+)*$'
  ) NOT VALID;


-- Restore existing consent evidence; auth.users was not modified.
INSERT INTO public.policy_acceptances (user_id, policy_kind, policy_version, accepted_at)
SELECT user_id, policy_kind, policy_version, accepted_at FROM hugioi_consent_backup;
