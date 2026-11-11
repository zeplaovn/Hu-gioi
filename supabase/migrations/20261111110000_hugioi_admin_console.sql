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
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
