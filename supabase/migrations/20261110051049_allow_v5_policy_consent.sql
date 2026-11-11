alter table public.policy_acceptances drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09','2026-11-09-v2','2026-11-09-v3','2026-11-09-v4','2026-11-10-v5'));
