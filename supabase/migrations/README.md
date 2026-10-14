# Supabase migrations

This directory is the authoritative migration history for Thiên Vân Đại Lục.

## Rules

1. **Applied migrations are immutable.** Never edit or delete a migration version that already exists in production.
2. **One feature, one migration.** Fold related SQL into a single pending migration instead of adding tiny follow-up patches before release.
3. **Use idempotent DDL where practical.** Prefer `create ... if not exists`, `drop ... if exists`, and `create or replace function`.
4. **Do not hardcode production IDs.** Admin accounts and player IDs are data, not schema.
5. **Keep exposed RPC permissions explicit.** Revoke first, then grant only the roles that need `execute`.
6. **Security-definer functions must pin `search_path = ''`.**
7. **Fresh databases must converge to the same schema as production.** Historical production-only versions may be represented by documented no-op marker files when replaying their original SQL out of order would be unsafe.

## Production-only history markers

These versions were applied directly to production and are intentionally no-op locally:

- `20261014025908_scale_hot_path_optimization.sql`
- `20261014032941_canonical_sql_names_v2.sql`
- `20261014041045_remove_canonical_sql_aliases.sql`

The canonical-name compatibility layer was temporary and is no longer part of the live schema.

## Pending migrations

`20261019000000_admin_chat_badge.sql` is the consolidated admin-chat identity migration. The former `20261019010000_admin_list_chat_is_admin.sql` patch was merged into it before production application.
