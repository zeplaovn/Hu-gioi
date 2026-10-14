-- Indexes and hot-table storage tuning.

create index leaderboard_rank_cover_idx
  on public.leaderboard(level desc, months asc, updated_at asc)
  include (user_id, name);
create index chat_messages_time_idx on public.chat_messages(created_at);
create index chat_messages_user_time_idx on public.chat_messages(user_id, created_at desc);
create index server_presence_seen_idx on public.server_presence(last_seen_at desc);
create index server_banners_active_idx on public.server_banners(active, starts_at desc, ends_at);
create index admin_audit_time_idx on public.admin_audit_log(created_at desc);
create index admin_audit_admin_idx on public.admin_audit_log(admin_user_id, created_at desc);
create index economy_ledger_from_idx on public.economy_ledger(from_user_id, created_at desc);
create index economy_ledger_to_idx on public.economy_ledger(to_user_id, created_at desc);
create index economy_ledger_users_idx on public.economy_ledger(from_user_id, to_user_id, created_at desc);
create index economy_ledger_time_idx on public.economy_ledger(created_at desc);

alter table public.player_saves set (
  fillfactor = 80,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);

alter table public.server_presence set (
  fillfactor = 80,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);

alter table public.leaderboard set (
  fillfactor = 85,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);

alter table public.chat_messages set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 100,
  autovacuum_analyze_threshold = 100
);
