-- Admin Console cleanup / compatibility migration.
-- Safe to run after earlier admin migrations. Normalizes legacy prototype schemas.

alter table public.admin_users
  add column if not exists updated_at timestamptz not null default now();

-- Preserve highest legacy privilege when upgrading from the old prototype role name.
update public.admin_users
set role = 'owner', updated_at = now()
where role = 'super_admin';

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('viewer','moderator','admin','owner'));

-- Keep timestamps sane on rows created by older schemas.
update public.admin_users
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
