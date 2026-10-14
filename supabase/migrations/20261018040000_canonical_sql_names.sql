-- Canonical runtime SQL names.
-- Historical tables/RPCs remain intact; these security-invoker views and wrappers provide clear names
-- without downtime or rewriting already-applied migrations.

create or replace view public.player_state with (security_invoker=true) as select * from public.player_saves;
create or replace view public.player_rankings with (security_invoker=true) as select * from public.leaderboard;
create or replace view public.world_chat_messages with (security_invoker=true) as select * from public.chat_messages;
create or replace view public.player_presence with (security_invoker=true) as select * from public.server_presence;
create or replace view public.server_settings with (security_invoker=true) as select * from public.server_control;
create or replace view public.server_announcements with (security_invoker=true) as select * from public.server_banners;
create or replace view public.admin_accounts with (security_invoker=true) as select * from public.admin_users;
create or replace view public.moderation_actions with (security_invoker=true) as select * from public.player_moderation;
create or replace view public.admin_audit_logs with (security_invoker=true) as select * from public.admin_audit_log;
create or replace view public.economy_transactions with (security_invoker=true) as select * from public.economy_ledger;
create or replace view public.maintenance_state with (security_invoker=true) as select * from public.system_housekeeping;

grant select on public.player_state, public.player_rankings, public.world_chat_messages to authenticated;

create or replace function public.save_player_state(p_save jsonb,p_meta jsonb,p_rev bigint,p_force boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select public.save_game(p_save,p_meta,p_rev,p_force) $$;
create or replace function public.update_player_presence(p_session_id uuid,p_client_version text default null,p_realm_level integer default null)
returns void language sql security invoker set search_path='' as $$ select public.heartbeat_presence(p_session_id,p_client_version,p_realm_level) $$;
create or replace function public.send_world_chat(p_body text)
returns jsonb language sql security invoker set search_path='' as $$ select public.send_chat(p_body) $$;
create or replace function public.get_server_status()
returns jsonb language sql stable security invoker set search_path='' as $$ select public.server_status() $$;
create or replace function public.admin_publish_announcement(p_title text,p_body text,p_level text,p_starts_at timestamptz,p_ends_at timestamptz)
returns bigint language sql security invoker set search_path='' as $$ select public.admin_publish_banner(p_title,p_body,p_level,p_starts_at,p_ends_at) $$;
create or replace function public.admin_list_world_chat(p_limit integer default 200)
returns table(id bigint,user_id uuid,name text,body text,created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from public.admin_list_chat(p_limit) $$;
create or replace function public.admin_delete_world_chat(p_message_id bigint,p_reason text default null)
returns void language sql security invoker set search_path='' as $$ select public.admin_delete_chat(p_message_id,p_reason) $$;

revoke all on function public.save_player_state(jsonb,jsonb,bigint,boolean) from public,anon,authenticated;
revoke all on function public.update_player_presence(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.send_world_chat(text) from public,anon,authenticated;
revoke all on function public.get_server_status() from public,anon,authenticated;
revoke all on function public.admin_publish_announcement(text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_list_world_chat(integer) from public,anon,authenticated;
revoke all on function public.admin_delete_world_chat(bigint,text) from public,anon,authenticated;

grant execute on function public.save_player_state(jsonb,jsonb,bigint,boolean) to authenticated;
grant execute on function public.update_player_presence(uuid,text,integer) to authenticated;
grant execute on function public.send_world_chat(text) to authenticated;
grant execute on function public.get_server_status() to anon,authenticated;
grant execute on function public.admin_publish_announcement(text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_list_world_chat(integer) to authenticated;
grant execute on function public.admin_delete_world_chat(bigint,text) to authenticated;
