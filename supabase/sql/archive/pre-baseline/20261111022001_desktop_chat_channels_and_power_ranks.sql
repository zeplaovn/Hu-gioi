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
