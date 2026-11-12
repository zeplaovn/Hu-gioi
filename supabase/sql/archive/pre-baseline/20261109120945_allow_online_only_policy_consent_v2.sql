-- Preserve consent history while requiring re-consent for the online-only release.
alter table public.policy_acceptances
  drop constraint policy_acceptances_policy_version_check;
alter table public.policy_acceptances
  add constraint policy_acceptances_policy_version_check
  check (policy_version in ('2026-11-09', '2026-11-09-v2'));
comment on table public.policy_acceptances is
  'Versioned immutable user consent ledger. 2026-11-09-v2 explicitly covers server-side gameplay state; older consent is not accepted by online API.';
