-- Row Level Security, table grants and RPC execution grants.

alter table public.player_saves enable row level security;
alter table public.player_saves force row level security;
alter table public.leaderboard enable row level security;
alter table public.leaderboard force row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;
alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;
alter table public.player_moderation enable row level security;
alter table public.player_moderation force row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;
alter table public.server_control enable row level security;
alter table public.server_control force row level security;
alter table public.server_banners enable row level security;
alter table public.server_banners force row level security;
alter table public.server_presence enable row level security;
alter table public.server_presence force row level security;
alter table public.economy_ledger enable row level security;
alter table public.economy_ledger force row level security;
alter table public.system_housekeeping enable row level security;

create policy player_saves_select_own on public.player_saves
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy leaderboard_read_all on public.leaderboard
  for select to authenticated using (true);
create policy chat_read_all on public.chat_messages
  for select to authenticated using (true);

revoke all on table public.player_saves from public, anon, authenticated;
revoke all on table public.leaderboard from public, anon, authenticated;
revoke all on table public.chat_messages from public, anon, authenticated;
revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.player_moderation from public, anon, authenticated;
revoke all on table public.admin_audit_log from public, anon, authenticated;
revoke all on table public.server_control from public, anon, authenticated;
revoke all on table public.server_banners from public, anon, authenticated;
revoke all on table public.server_presence from public, anon, authenticated;
revoke all on table public.economy_ledger from public, anon, authenticated;
revoke all on table public.system_housekeeping from public, anon, authenticated;

grant select on table public.player_saves to authenticated;
grant select on table public.leaderboard to authenticated;
grant select on table public.chat_messages to authenticated;

revoke all on function public.lb_min_months(integer) from public, anon, authenticated;
revoke all on function public.lb_best_months(jsonb,integer) from public, anon, authenticated;
revoke all on function public.player_plausible(jsonb) from public, anon, authenticated;
revoke all on function public.lb_sync() from public, anon, authenticated;
revoke all on function private.admin_rank(text) from public, anon, authenticated;
revoke all on function private.safe_name(text) from public, anon, authenticated;
revoke all on function private.current_admin_role() from public, anon, authenticated;
revoke all on function private.require_admin(text) from public, anon, authenticated;
revoke all on function private.admin_audit(text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.maintenance_active() from public, anon, authenticated;
revoke all on function private.leaderboard_name() from public, anon, authenticated;
revoke all on function private.chat_stamp() from public, anon, authenticated;

revoke all on function public.save_game(jsonb,jsonb,bigint,boolean) from public, anon, authenticated;
revoke all on function public.send_chat(text) from public, anon, authenticated;
revoke all on function public.heartbeat_presence(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.game_clock() from public, anon, authenticated;
revoke all on function public.server_status() from public, anon, authenticated;
revoke all on function public.delete_account() from public, anon, authenticated;
revoke all on function public.admin_me() from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_search_players(text,text,integer) from public, anon, authenticated;
revoke all on function public.admin_list_chat(integer) from public, anon, authenticated;
revoke all on function public.admin_list_audit(integer) from public, anon, authenticated;
revoke all on function public.admin_send_message(text) from public, anon, authenticated;
revoke all on function public.admin_delete_chat(bigint,text) from public, anon, authenticated;
revoke all on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.admin_set_maintenance(boolean,text) from public, anon, authenticated;

grant execute on function public.save_game(jsonb,jsonb,bigint,boolean) to authenticated;
grant execute on function public.send_chat(text) to authenticated;
grant execute on function public.heartbeat_presence(uuid,text,integer) to authenticated;
grant execute on function public.game_clock() to authenticated;
grant execute on function public.server_status() to anon, authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.admin_me() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_search_players(text,text,integer) to authenticated;
grant execute on function public.admin_list_chat(integer) to authenticated;
grant execute on function public.admin_list_audit(integer) to authenticated;
grant execute on function public.admin_send_message(text) to authenticated;
grant execute on function public.admin_delete_chat(bigint,text) to authenticated;
grant execute on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_set_maintenance(boolean,text) to authenticated;
