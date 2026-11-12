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
