-- Applied to Supabase project rvrwfeblishqadkpzspb as migration
-- add_hu_gioi_policy_acceptances on 2026-11-09.
-- Do not run again on the same project without checking existing policies.
-- Live constraint (last verified before v5): policy_version IN ('2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4').
-- v5 ('2026-11-10-v5') is NOT yet allowed live: run the ALTER below on the project BEFORE deploying code that uses it:
--   alter table public.policy_acceptances drop constraint policy_acceptances_policy_version_check;
--   alter table public.policy_acceptances add constraint policy_acceptances_policy_version_check
--     check (policy_version in ('2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4','2026-11-10-v5'));
-- and only then change VERSION in server/auth/consent.js and client/auth/supabase.js together.
create table if not exists public.policy_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_kind text not null check (policy_kind in ('privacy', 'release_terms')),
  policy_version text not null check (policy_version in ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3', '2026-11-09-v4', '2026-11-10-v5')),
  accepted_at timestamptz not null default now(),
  primary key (user_id, policy_kind, policy_version)
);
alter table public.policy_acceptances enable row level security;
revoke all on table public.policy_acceptances from public, anon, authenticated;
grant select on table public.policy_acceptances to authenticated;
grant insert (user_id, policy_kind, policy_version) on table public.policy_acceptances to authenticated;
create policy policy_acceptances_read_own
  on public.policy_acceptances for select to authenticated
  using (user_id = (select auth.uid()));
create policy policy_acceptances_insert_own
  on public.policy_acceptances for insert to authenticated
  with check (user_id = (select auth.uid()));
comment on table public.policy_acceptances is
  'Consent ledger for current privacy and game release terms (2026-11-09). No UPDATE/DELETE privileges for clients.';
