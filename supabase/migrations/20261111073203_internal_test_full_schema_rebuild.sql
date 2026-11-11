-- Test-only schema rebuild db/rebuild-internal-test-20261111; SQL is in supabase/sql/rebuild-internal-test.sql.
-- This NO-OP marker matches the migration already applied to the internal Supabase
-- project at version 20261111073203. Never ship the destructive rebuild script as
-- an automatically replayed migration. Future fresh databases are created by the
-- ordinary additive migrations preceding this marker.
SELECT 1;
