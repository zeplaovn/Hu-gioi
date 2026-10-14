-- Kiểm thử Admin Console + maintenance guard trên Postgres thật (bản giả lập tối thiểu của Supabase).
-- Chạy:  psql -v ON_ERROR_STOP=1 -f supabase/tests/admin.test.sql   (trên DB trống)
\set ON_ERROR_STOP on
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{"email":"x@example.com"}'::jsonb $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'), ('33333333-3333-3333-3333-333333333333'), ('44444444-4444-4444-4444-444444444444');

\i supabase/migrations/20261011000000_player_saves.sql
\i supabase/migrations/20261012000000_delete_account_and_checks.sql
\i supabase/migrations/20261013000000_leaderboard.sql
\i supabase/migrations/20261014000000_chat.sql
\i supabase/migrations/20261015000000_leaderboard_fix.sql
\i supabase/migrations/20261016000000_admin_console.sql
\i supabase/migrations/20261016010000_admin_console_fixes.sql
\i supabase/migrations/20261016020000_maintenance_guard.sql
\i supabase/migrations/20261016030000_admin_cleanup.sql
\i supabase/migrations/20261017000000_maintenance_admin_bypass.sql
\i supabase/migrations/20261018000000_gameplay_hardening.sql
\i supabase/migrations/20261018010000_game_clock_volatility.sql
\i supabase/migrations/20261018020000_trusted_game_time.sql
\i supabase/migrations/20261018030000_scale_hot_path_optimization.sql
\i supabase/migrations/20261019000000_admin_chat_badge.sql
\i supabase/migrations/20261019010000_admin_list_chat_is_admin.sql

create function public.t_expect_error(sql text, want text) returns void language plpgsql security invoker as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || want || '%' then return; end if;
    raise exception 'lỗi sai: muốn "%", nhận "%"', want, sqlerrm;
  end;
  raise exception 'đáng lẽ phải lỗi "%": %', want, sql;
end $$;
grant execute on function public.t_expect_error(text, text) to anon, authenticated;

-- bootstrap quản trị (như supabase/README.md): 2 = viewer, 3 = admin
insert into public.admin_users(user_id, role) values ('22222222-2222-2222-2222-222222222222', 'viewer'), ('33333333-3333-3333-3333-333333333333', 'admin');

-- người chơi thường (1): không gọi được RPC admin, không đọc được bảng admin
set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.t_expect_error($q$select public.admin_me()$q$, 'forbidden');
select public.t_expect_error($q$select public.admin_overview()$q$, 'forbidden');
select public.t_expect_error($q$select * from public.admin_search_players()$q$, 'forbidden');
select public.t_expect_error($q$select public.admin_set_maintenance(true, 'x')$q$, 'forbidden');
select public.t_expect_error($q$select public.admin_publish_banner('a','b')$q$, 'forbidden');
select public.t_expect_error($q$select * from public.admin_users$q$, 'permission denied');
select public.t_expect_error($q$select * from public.admin_audit_log$q$, 'permission denied');
select public.t_expect_error($q$insert into public.admin_users(user_id, role) values ('11111111-1111-1111-1111-111111111111','owner')$q$, 'permission denied');
select public.t_expect_error($q$update public.server_control set maintenance_mode = true$q$, 'permission denied');
do $$ begin assert (public.server_status()->>'maintenance')::boolean = false, 'server_status công khai, mặc định không bảo trì'; end $$;
do $$ begin perform public.heartbeat_presence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'test', 5); end $$;
select public.t_expect_error($q$select public.heartbeat_presence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'test', 99)$q$, 'invalid_realm');
select public.t_expect_error($q$select * from public.server_presence$q$, 'permission denied');
reset role; set role anon;
select public.t_expect_error($q$select public.heartbeat_presence('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, 'permission denied');
do $$ begin perform public.server_status(); end $$;                                     -- anon được xem trạng thái
reset role;

-- viewer (2): xem được, không sửa được
set role authenticated; select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert public.admin_me()->>'role' = 'viewer', 'vai trò viewer'; end $$;
do $$ begin assert (public.admin_overview()->>'online_now')::int >= 1, 'đếm được người đang online'; end $$;
select public.t_expect_error($q$select public.admin_send_message('hi')$q$, 'forbidden');
select public.t_expect_error($q$select public.admin_set_maintenance(true, 'x')$q$, 'forbidden');

-- admin (3): bật bảo trì, đăng banner; có ghi nhật ký
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin perform public.admin_publish_banner('Tiêu đề', 'Nội dung'); end $$;
do $$ begin assert public.server_status()->'banner'->>'title' = 'Tiêu đề', 'banner hiện ở server_status'; end $$;
select public.t_expect_error($q$select public.admin_publish_banner('', 'b')$q$, 'invalid_banner');
select public.t_expect_error($q$select public.admin_publish_banner('a', 'b', 'xx')$q$, 'invalid_level');
do $$ begin perform public.admin_set_maintenance(true, 'nâng cấp'); end $$;
do $$ begin assert (public.server_status()->>'maintenance')::boolean and public.server_status()->>'maintenance_reason' = 'nâng cấp', 'bảo trì bật'; end $$;
do $$ begin assert (select count(*) from public.admin_list_audit(50) where action in ('BANNER_PUBLISH','MAINTENANCE_SET')) = 2, 'nhật ký ghi đủ hành động'; end $$;

-- khi bảo trì: admin vẫn vào game (lưu / chat được), viewer và người chơi thường thì không
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ declare r jsonb; begin r := public.save_game('{"count":1,"player":{"name":"Admin","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{"legacy":0}', 0); assert (r->>'rev')::int = 1, 'admin lưu game được lúc bảo trì'; end $$;
do $$ begin perform public.send_chat('admin thử'); end $$;
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 0)$q$, 'maintenance_mode');            -- viewer không được ngoại lệ
reset role;
-- khi bảo trì: người chơi không ghi / chat được, admin vẫn dùng được dashboard
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 0)$q$, 'maintenance_mode');
select public.t_expect_error($q$select public.send_chat('xin chào')$q$, 'maintenance_mode');
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin perform public.admin_overview(); end $$;
do $$ begin perform public.admin_set_maintenance(false, null); end $$;

-- tắt bảo trì: người chơi ghi lại được
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ declare r jsonb; begin r := public.save_game('{"count":1,"player":{"name":"A","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{"legacy":0}', 0); assert (r->>'rev')::int = 1; end $$;
do $$ begin perform public.send_chat('xin chào'); end $$;

-- tên admin nổi bật + chống mạo danh: admin có is_admin, tin admin_send_message tên 'Thiên Đạo'; người thường không đặt được tên giống admin
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin
  perform public.admin_send_message('thông báo');
  assert (select is_admin and name = 'Thiên Đạo' from public.chat_messages order by id desc limit 1), 'tin admin có huy hiệu và tên Thiên Đạo';
end $$;
reset role;
do $$ begin
  assert private.safe_name('[ADMIN] Hack') = 'Vô danh' and private.safe_name('Quản Trị Viên') = 'Vô danh' and private.safe_name('GM') = 'Vô danh', 'tên giống admin bị chặn';
  assert private.safe_name(' [Lý <b>Vân]' || chr(8203)) = 'Lý bVân' and private.safe_name('Phàm Nhân') = 'Phàm Nhân' and private.safe_name('   ') = 'Vô danh', 'làm sạch ký tự đặc biệt';
end $$;
reset role;
do $$ begin
  insert into public.chat_messages(user_id, name, body) values ('11111111-1111-1111-1111-111111111111', '[ADMIN]', 'giả danh');
  assert (select not is_admin and name = 'Vô danh' from public.chat_messages order by id desc limit 1), 'người thường không thể mang tên [ADMIN]';
end $$;

-- dashboard nhận diện tin admin qua cột is_admin của admin_list_chat
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin
  assert (select count(*) from public.admin_list_chat(50) where is_admin) >= 1, 'admin_list_chat trả is_admin = true cho tin admin';
  assert (select count(*) from public.admin_list_chat(50) where not is_admin and name = 'Vô danh') >= 1, 'tin giả danh không có is_admin';
end $$;
reset role;

-- vai trò bị tắt thì mất quyền
reset role; update public.admin_users set enabled = false where user_id = '33333333-3333-3333-3333-333333333333';
set role authenticated; select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select public.t_expect_error($q$select public.admin_set_maintenance(true, 'x')$q$, 'forbidden');
reset role;
select 'TẤT CẢ KIỂM THỬ SQL ADMIN ĐỀU QUA' as ok;
