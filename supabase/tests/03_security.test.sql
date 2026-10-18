-- Ranh giới bảo mật: client không chạm được dữ liệu/hàm game; chỉ service_role.
begin;

do $$ begin
  assert (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'game' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)) = 0,
         'mọi bảng game phải bật + force RLS';
  assert (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'game') = 0,
         'không có policy cho client';
  assert not has_function_privilege('anon', 'game.get_state(uuid, timestamptz)', 'execute');
  assert not has_function_privilege('authenticated', 'game.breakthrough_confirm(uuid, uuid, timestamptz)', 'execute');
  assert not has_function_privilege('authenticated', 'game.end_life(uuid, text, timestamptz)', 'execute');
  assert has_function_privilege('service_role', 'game.get_state(uuid, timestamptz)', 'execute');
  assert not has_schema_privilege('anon', 'game', 'usage') and not has_schema_privilege('authenticated', 'game', 'usage');
end $$;

insert into auth.users (id) values ('c0000000-0000-0000-0000-000000000001');

do $$ declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    execute format('set local role %I', r);
    begin perform count(*) from game.accounts; raise exception '% đọc được bảng accounts', r;
    exception when insufficient_privilege then null; end;
    begin perform game.get_state('c0000000-0000-0000-0000-000000000001'); raise exception '% gọi được hàm game', r;
    exception when insufficient_privilege then null; end;
    begin insert into game.accounts (account_id) values ('c0000000-0000-0000-0000-000000000001'); raise exception '% ghi được accounts', r;
    exception when insufficient_privilege then null; end;
    reset role;
  end loop;
end $$;

do $$ declare st jsonb;
begin
  set local role service_role;
  st := game.get_state('c0000000-0000-0000-0000-000000000001');
  assert st->'life' = 'null'::jsonb and (st->'account'->>'tm_balance')::int = 0;
  assert (select count(*) from game.accounts) = 1;
  reset role;
end $$;

rollback;
