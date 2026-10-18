-- Stub tối thiểu của Supabase để chạy migration trên Postgres trần (test local/CI).
-- Trên Supabase thật các thứ này đã có sẵn; file này KHÔNG phải migration.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
grant usage on schema auth to service_role;
grant select on auth.users to service_role;
-- Trên Supabase, anon/authenticated có USAGE trên public; mô phỏng để test "client không chạm được schema game".
grant usage on schema public to anon, authenticated;
