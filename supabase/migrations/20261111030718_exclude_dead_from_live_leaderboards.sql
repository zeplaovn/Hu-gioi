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
