-- Hồ sơ nhân vật: đạo hiệu/giới tính hợp lệ, chủng tộc + linh căn do server gieo, kiếp cũ không hồ sơ vẫn chạy.
do $$
declare u uuid := gen_random_uuid(); r jsonb; v uuid; l game.lives%rowtype; i int; n_bad int := 0; s jsonb; u2 uuid := gen_random_uuid(); v2 uuid; want int;
begin
  insert into auth.users (id) values (u) on conflict do nothing;
  assert game.clean_dao_hieu('  Hàn   Thiên  Sơn ') = 'Hàn Thiên Sơn', 'gộp khoảng trắng';
  assert game.clean_dao_hieu('A') is null and game.clean_dao_hieu('<b>xx</b>') is null and game.clean_dao_hieu(repeat('a', 21)) is null, 'đạo hiệu sai';

  -- gieo: hợp lệ, số hệ khớp loại linh căn
  for i in 1 .. 300 loop
    r := game.roll_character(u);
    if r->>'race' not in ('Nhân','Ma','Yêu','Linh','Tiên Duệ','Thú') then n_bad := n_bad + 1; end if;
    want := case r->'linh_can'->>'id' when 'ROOT-001' then 5 when 'ROOT-002' then 4 when 'ROOT-003' then 3 when 'ROOT-004' then 2 else 1 end;
    if jsonb_array_length(r->'linh_can'->'elements') <> want then n_bad := n_bad + 1; end if;
  end loop;
  assert n_bad = 0, 'kết quả gieo không hợp lệ';
  -- gieo riêng một trường giữ nguyên trường kia
  r := game.roll_character(u);
  for i in 1 .. 20 loop
    assert (game.roll_character(u, array['race'])->'linh_can') = (r->'linh_can'), 'chỉ gieo race thì linh căn phải giữ';
    r := game.roll_character(u, array['linh_can']) || jsonb_build_object('x', 1);
    assert (game.get_state(u)->'pending_roll'->>'race') is not null, 'state phải trả pending_roll';
  end loop;

  -- hồ sơ sai bị từ chối, không tạo kiếp
  begin perform game.start_life(u, now(), '{"dao_hieu":"<x>","gender":"Nam"}'); assert false, 'phải lỗi'; exception when sqlstate 'GM000' then null; end;
  begin perform game.start_life(u, now(), '{"dao_hieu":"Hàn Thiên Sơn","gender":"Khác"}'); assert false, 'phải lỗi'; exception when sqlstate 'GM000' then null; end;
  assert not exists (select 1 from game.lives where account_id = u), 'không được tạo kiếp khi hồ sơ sai';

  -- bắt đầu với hồ sơ: dùng lần gieo đang chờ, xoá nó, idempotent
  r := game.roll_character(u);
  v := game.start_life(u, now(), '{"dao_hieu":"  Hàn Thiên Sơn ","gender":"Nam","race":"Tiên Duệ"}');
  select * into l from game.lives where life_id = v;
  assert l.dao_hieu = 'Hàn Thiên Sơn' and l.gender = 'Nam', 'hồ sơ lưu đúng';
  assert l.race = r->>'race' and l.linh_can = r->'linh_can', 'chủng tộc/linh căn phải lấy từ lần gieo của server, không từ client';
  assert not exists (select 1 from game.character_rolls where account_id = u), 'lần gieo phải được tiêu thụ';
  assert game.start_life(u, now(), '{"dao_hieu":"Người Khác","gender":"Nữ"}') = v, 'idempotent';
  s := game.get_state(u);
  assert s->'life'->'profile'->>'dao_hieu' = 'Hàn Thiên Sơn' and s->'life'->'profile'->>'race' = l.race, 'state có profile';
  assert s->'pending_roll' is null, 'có kiếp thì không còn pending_roll';
  begin perform game.roll_character(u); assert false, 'đang sống thì không được gieo'; exception when sqlstate 'GM000' then null; end;

  -- tương thích: không hồ sơ
  insert into auth.users (id) values (u2) on conflict do nothing;
  v2 := game.start_life(u2, now());
  assert (select dao_hieu from game.lives where life_id = v2) is null, 'kiếp không hồ sơ';
end $$;
