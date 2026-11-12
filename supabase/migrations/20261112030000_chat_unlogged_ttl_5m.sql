-- Hư Giới §11.1: chat tạm thời, nhẹ WAL và tự xóa sau 1 giờ.
-- Bảng chat được thay bằng bản UNLOGGED qua bảng mới + chuyển dữ liệu + đổi tên,
-- không sửa tại chỗ để có thể rollback bằng ALTER TABLE ... SET LOGGED.
-- Dữ liệu chat mất khi PostgreSQL crash là chấp nhận được (chat vốn tạm thời).
-- Không lưu lịch sử dài hạn và không sao lưu riêng cho chat.

BEGIN;

CREATE UNLOGGED TABLE game.world_chat_messages_next (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL CHECK (length(sender_name) BETWEEN 1 AND 60),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 400),
  request_id uuid NOT NULL,
  created_at bigint NOT NULL,
  channel_key text NOT NULL DEFAULT 'world',
  UNIQUE(owner_id, request_id)
);
-- Chỉ còn index đọc theo kênh + khóa id; bỏ index (owner_id, created_at) vì
-- rate limit mới dùng presence.last_chat_at, không truy vấn tin gần nhất.
CREATE INDEX game_world_chat_channel_id_next
  ON game.world_chat_messages_next(channel_key, id DESC);

INSERT INTO game.world_chat_messages_next
  (id, owner_id, sender_name, body, request_id, created_at, channel_key)
OVERRIDING SYSTEM VALUE
SELECT id, owner_id, sender_name, body, request_id, created_at, channel_key
FROM game.world_chat_messages;

-- Giữ nguyên id lớn nhất để cursor/keyset không lùi sau migration.
SELECT setval(
  pg_get_serial_sequence('game.world_chat_messages_next', 'id'),
  COALESCE((SELECT max(id) FROM game.world_chat_messages_next), 1),
  EXISTS (SELECT 1 FROM game.world_chat_messages_next)
);

-- Giữ hai CHECK cũ dạng NOT VALID: không quét/xóa tin cũ dài hơn giới hạn.
ALTER TABLE game.world_chat_messages_next
  ADD CONSTRAINT world_chat_messages_body_max80 CHECK (length(body) <= 80) NOT VALID;
ALTER TABLE game.world_chat_messages_next
  ADD CONSTRAINT world_chat_messages_body_charset CHECK (
    body ~ '^[0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+( [0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+)*$'
  ) NOT VALID;

CREATE UNLOGGED TABLE game.world_chat_presence_next (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_at bigint NOT NULL,
  -- Mốc gửi tin cuối; conditional UPDATE trên cột này thay advisory lock + max(created_at).
  last_chat_at bigint NOT NULL DEFAULT 0
);
CREATE INDEX game_world_chat_presence_seen_next
  ON game.world_chat_presence_next(seen_at DESC);

-- Khởi tạo last_chat_at từ tin gần nhất để không phá cooldown đang có lúc migration.
INSERT INTO game.world_chat_presence_next (owner_id, seen_at, last_chat_at)
SELECT p.owner_id, p.seen_at, COALESCE(m.last_at, 0)
FROM game.world_chat_presence p
LEFT JOIN (
  SELECT owner_id, max(created_at) AS last_at
  FROM game.world_chat_messages
  GROUP BY owner_id
) m ON m.owner_id = p.owner_id;

-- Đổi tên trong cùng transaction: request đang chạy thấy bảng cũ hoặc bảng mới,
-- không thấy trạng thái nửa vời sau commit.
ALTER TABLE game.world_chat_messages RENAME TO world_chat_messages_logged_old;
ALTER TABLE game.world_chat_presence RENAME TO world_chat_presence_logged_old;
ALTER TABLE game.world_chat_messages_next RENAME TO world_chat_messages;
ALTER TABLE game.world_chat_presence_next RENAME TO world_chat_presence;

DROP TABLE game.world_chat_messages_logged_old;
DROP TABLE game.world_chat_presence_logged_old;

ALTER TABLE game.world_chat_messages RENAME CONSTRAINT world_chat_messages_next_owner_id_fkey
  TO world_chat_messages_owner_id_fkey;
ALTER TABLE game.world_chat_presence RENAME CONSTRAINT world_chat_presence_next_owner_id_fkey
  TO world_chat_presence_owner_id_fkey;
ALTER INDEX game.world_chat_messages_next_pkey RENAME TO world_chat_messages_pkey;
ALTER INDEX game.world_chat_messages_next_owner_id_request_id_key
  RENAME TO world_chat_messages_owner_id_request_id_key;
ALTER INDEX game.game_world_chat_channel_id_next RENAME TO game_world_chat_channel_id;
ALTER INDEX game.world_chat_presence_next_pkey RENAME TO world_chat_presence_pkey;
ALTER INDEX game.game_world_chat_presence_seen_next RENAME TO game_world_chat_presence_seen;
ALTER SEQUENCE game.world_chat_messages_next_id_seq RENAME TO world_chat_messages_id_seq;

ALTER TABLE game.world_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game.world_chat_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game.world_chat_messages, game.world_chat_presence
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE game.world_chat_messages_id_seq
  FROM PUBLIC, anon, authenticated;

-- Admin gửi tin dùng cùng conditional UPDATE trên presence, bỏ advisory lock và
-- truy vấn max(created_at); vẫn giữ idempotency + audit + giới hạn 15 giây.
CREATE OR REPLACE FUNCTION public.hu_admin_send_chat(p_channel text, p_text text, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  v_role text;
  v_user uuid := auth.uid();
  v_text text := normalize(btrim(coalesce(p_text, '')), NFC);
  v_now bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_existing record;
  v_claimed bigint;
  v_id bigint;
BEGIN
  v_role := public.hu_admin_role();
  IF v_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_channel IS NULL OR p_channel NOT IN ('world', 'dao_huu', 'dao_lu') THEN
    RAISE EXCEPTION 'Invalid chat channel' USING ERRCODE = '22023';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Missing request id' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_text) NOT BETWEEN 1 AND 80 OR v_text !~ '^[0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+( [0-9A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+)*$' THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE = '22023';
  END IF;

  -- Idempotency chỉ có hiệu lực trong TTL 1 giờ; tin hết hạn không được trả lại.
  SELECT m.id, m.body, m.channel_key INTO v_existing
    FROM game.world_chat_messages AS m
    WHERE m.owner_id = v_user AND m.request_id = p_request_id
      AND m.created_at > v_now - 3600000;
  IF FOUND THEN
    IF v_existing.body <> v_text OR v_existing.channel_key <> p_channel THEN
      RAISE EXCEPTION 'Request id already used' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('id', v_existing.id::text, 'replayed', true);
  END IF;

  -- Một câu conditional upsert vừa tạo presence vừa làm rate limiter 15 giây.
  INSERT INTO game.world_chat_presence(owner_id, seen_at, last_chat_at)
    VALUES (v_user, v_now, v_now)
    ON CONFLICT(owner_id) DO UPDATE
      SET last_chat_at = EXCLUDED.last_chat_at,
          seen_at = greatest(game.world_chat_presence.seen_at, EXCLUDED.seen_at)
      WHERE game.world_chat_presence.last_chat_at <= EXCLUDED.last_chat_at - 15000
    RETURNING last_chat_at INTO v_claimed;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat cooldown' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM game.world_chat_messages
    WHERE owner_id = v_user AND request_id = p_request_id
      AND created_at <= v_now - 3600000;

  INSERT INTO game.world_chat_messages(owner_id, sender_name, body, request_id, created_at, channel_key)
    VALUES (v_user, 'Hư Giới Chi Chủ', v_text, p_request_id, v_now, p_channel)
    RETURNING id INTO v_id;
  INSERT INTO game.admin_audit_log(admin_user_id, action, target_id)
    VALUES (v_user, 'send_public_chat', p_channel || ':' || v_id::text);
  RETURN jsonb_build_object('id', v_id::text, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.hu_admin_send_chat(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hu_admin_send_chat(text, text, uuid) TO authenticated;

-- Dọn tin cũ mỗi 5 phút; presence không hoạt động quá 10 phút cũng bị xóa.
-- Bảng nhỏ nên DELETE thường đủ; nếu đo thấy bloat mới chuyển sang phân vùng 15 phút.
SELECT cron.schedule(
  'hugioi-cleanup-chat',
  '*/5 * * * *',
  $cleanup$
    delete from game.world_chat_messages
      where created_at < floor(extract(epoch from (now() - interval '1 hour')) * 1000)::bigint;
    delete from game.world_chat_presence
      where seen_at < floor(extract(epoch from (now() - interval '10 minutes')) * 1000)::bigint;
    delete from cron.job_run_details
      where jobid = (select jobid from cron.job where jobname = 'hugioi-cleanup-chat')
        and end_time < now() - interval '1 day';
  $cleanup$
);

COMMIT;

-- Rollback thủ công trong cửa sổ bảo trì (không tự chạy):
--   ALTER TABLE game.world_chat_messages SET LOGGED;
--   ALTER TABLE game.world_chat_presence SET LOGGED;
--   SELECT cron.unschedule('hugioi-cleanup-chat');
--   -- Khôi phục public.hu_admin_send_chat từ 20261112013428_admin_chat_send.sql
--   -- và deploy lại Edge bundle cũ; giữ nguyên dữ liệu chat đang có.
