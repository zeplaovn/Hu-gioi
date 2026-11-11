ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3', '2026-11-09-v4'));
COMMENT ON TABLE public.policy_acceptances IS 'Account consent ledger. v4 discloses verified registration email and IP-scoped login attempt throttling; retain v1-v3 historical acceptance rows.';
