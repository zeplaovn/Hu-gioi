ALTER TABLE public.policy_acceptances DROP CONSTRAINT policy_acceptances_policy_version_check;
ALTER TABLE public.policy_acceptances ADD CONSTRAINT policy_acceptances_policy_version_check
  CHECK (policy_version IN ('2026-11-09', '2026-11-09-v2', '2026-11-09-v3'));
COMMENT ON TABLE public.policy_acceptances IS 'Immutable account consent ledger. v3 covers server-authoritative permanent-death gameplay and fully paused offline progression; older versions remain stored but do not authorize the v3 game.';
