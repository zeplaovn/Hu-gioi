-- Rollback thủ công cho 20261112030000_chat_unlogged_ttl_5m.sql.
-- CHỈ chạy trong cửa sổ bảo trì sau khi đã chuẩn bị deploy lại Edge bundle cũ.
-- Không chạy tự động; không xóa dữ liệu chat đang có.
--
-- 1) Đưa hai bảng về LOGGED (giữ nguyên dữ liệu, index, constraint, sequence).
-- 2) Bỏ job dọn chat 5 phút.
-- 3) Khôi phục public.hu_admin_send_chat bản trước tối ưu (advisory lock + max(created_at)).
-- 4) Deploy lại Edge bundle tương thích schema cũ; cột last_chat_at có thể giữ lại
--    vì bản cũ không đọc cột này.

BEGIN;

ALTER TABLE game.world_chat_messages SET LOGGED;
ALTER TABLE game.world_chat_presence SET LOGGED;

SELECT cron.unschedule('hugioi-cleanup-chat');

CREATE OR REPLACE FUNCTION public.hu_admin_send_chat(p_channel text, p_text text, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  v_role text;
  v_user uuid := auth.uid();
  v_text text := normalize(btrim(coalesce(p_text, '')), NFC);
  v_now bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_existing record;
  v_last bigint;
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

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  SELECT m.id, m.body, m.channel_key INTO v_existing
    FROM game.world_chat_messages AS m WHERE m.owner_id = v_user AND m.request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.body <> v_text OR v_existing.channel_key <> p_channel THEN
      RAISE EXCEPTION 'Request id already used' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('id', v_existing.id::text, 'replayed', true);
  END IF;
  SELECT max(m.created_at) INTO v_last FROM game.world_chat_messages AS m WHERE m.owner_id = v_user;
  IF v_last IS NOT NULL AND v_now - v_last < 15000 THEN
    RAISE EXCEPTION 'Chat cooldown' USING ERRCODE = 'P0001';
  END IF;
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

COMMIT;
