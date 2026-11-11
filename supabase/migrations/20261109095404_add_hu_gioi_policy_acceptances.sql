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
