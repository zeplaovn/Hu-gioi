-- Hồ sơ nhân vật: đạo hiệu, giới tính, chủng tộc, linh căn.
-- Server quyết định mọi phần ngẫu nhiên (chủng tộc, linh căn): client chỉ xin "gieo xúc xắc" và gửi đạo hiệu + giới tính.
-- Đây là danh tính của kiếp; CHƯA có hiệu ứng cân bằng (tốc độ/rủi ro không đổi) cho tới khi tài liệu cân bằng chốt.

alter table game.lives
  add column dao_hieu text check (dao_hieu is null or char_length(dao_hieu) between 2 and 20),
  add column gender   text check (gender is null or gender in ('Nam', 'Nữ')),
  add column race     text check (race is null or race in ('Nhân', 'Ma', 'Yêu', 'Linh', 'Tiên Duệ', 'Thú')),
  add column linh_can jsonb;

-- Kết quả gieo đang chờ của account (một dòng); start_life tiêu thụ nó.
create table game.character_rolls (
  account_id uuid primary key references game.accounts (account_id) on delete cascade,
  race       text not null,
  linh_can   jsonb not null,
  rolled_at  timestamptz not null default now()
);
alter table game.character_rolls enable row level security;
alter table game.character_rolls force row level security;
revoke all on game.character_rolls from public, anon, authenticated;
grant select, insert, update, delete on game.character_rolls to service_role;

-- Số thực đều trong [0,1) từ nguồn không seed được (cùng nguyên tắc với phần còn lại của game).
create function game.rand01() returns double precision
language sql volatile set search_path = '' as $$
  select (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint)::double precision / 281474976710656.0
$$;

create function game.roll_race() returns text
language plpgsql volatile set search_path = '' as $$
declare r double precision := game.rand01(); races text[] := array['Nhân', 'Ma', 'Yêu', 'Linh', 'Tiên Duệ', 'Thú'];
        w numeric[] := array[34, 16, 16, 16, 6, 12]; acc numeric := 0; i int;
begin
  for i in 1 .. 6 loop acc := acc + w[i]; if r * 100 < acc then return races[i]; end if; end loop;
  return 'Nhân';
end $$;

-- Tỉ lệ theo data/linh_can.csv (tổng 100%).
create function game.roll_linh_can() returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  r double precision := game.rand01() * 100;
  pick text[]; els text[] := array['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ']; mut text[] := array['Băng', 'Lôi', 'Phong', 'Quang', 'Ám'];
  n int; nm text; id text; out text[] := '{}'; tmp text; i int; j int;
begin
  if    r < 30.0  then id := 'ROOT-001'; nm := 'Ngũ Linh Căn';   n := 5;
  elsif r < 57.0  then id := 'ROOT-002'; nm := 'Tứ Linh Căn';    n := 4;
  elsif r < 79.0  then id := 'ROOT-003'; nm := 'Tam Linh Căn';   n := 3;
  elsif r < 93.0  then id := 'ROOT-004'; nm := 'Song Linh Căn';  n := 2;
  elsif r < 99.0  then id := 'ROOT-005'; nm := 'Đơn Linh Căn';   n := 1;
  elsif r < 99.9  then id := 'ROOT-006'; nm := 'Thiên Linh Căn'; n := 1;
  else                 id := 'ROOT-007'; nm := 'Biến Dị Linh Căn'; n := 1; els := mut;
  end if;
  for i in reverse array_length(els, 1) .. 2 loop       -- Fisher–Yates
    j := 1 + floor(game.rand01() * i)::int; tmp := els[i]; els[i] := els[j]; els[j] := tmp;
  end loop;
  out := els[1:n];
  return jsonb_build_object('id', id, 'name', nm, 'elements', to_jsonb(out));
end $$;

-- Gieo (lại) các trường được chọn. p_fields ⊆ {race, linh_can}; trả về kết quả đang chờ.
create function game.roll_character(p_account uuid, p_fields text[] default array['race', 'linh_can']) returns jsonb
language plpgsql set search_path = '' as $$
declare cur game.character_rolls%rowtype; v_race text; v_root jsonb;
begin
  perform game.ensure_account(p_account);
  if exists (select 1 from game.lives where account_id = p_account and status = 'alive') then
    raise exception 'life_already_started' using errcode = 'GM000';
  end if;
  select * into cur from game.character_rolls where account_id = p_account for update;
  v_race := case when cur.account_id is null or 'race' = any (p_fields) then game.roll_race() else cur.race end;
  v_root := case when cur.account_id is null or 'linh_can' = any (p_fields) then game.roll_linh_can() else cur.linh_can end;
  insert into game.character_rolls (account_id, race, linh_can) values (p_account, v_race, v_root)
    on conflict (account_id) do update set race = excluded.race, linh_can = excluded.linh_can, rolled_at = now();
  return jsonb_build_object('race', v_race, 'linh_can', v_root);
end $$;

-- Chuẩn hoá đạo hiệu: gộp khoảng trắng, cấm ký tự điều khiển / ký tự HTML. Trả null nếu không hợp lệ.
create function game.clean_dao_hieu(p text) returns text
language sql immutable set search_path = '' as $$
  select case when c ~ '^[^\x00-\x1f\x7f<>&"''`\[\]]{2,20}$' then c end
  from (select btrim(regexp_replace(normalize(coalesce(p, ''), nfc), '\s+', ' ', 'g')) as c) t
$$;

-- start_life(p_account, p_now) cũ vẫn chạy y nguyên (kiếp không hồ sơ, dùng cho kiếp tự sinh và test).
-- Thêm p_profile {dao_hieu, gender}: chủng tộc/linh căn lấy từ lần gieo đang chờ (gieo mới nếu chưa có).
drop function game.start_life(uuid, timestamptz);
create function game.start_life(p_account uuid, p_now timestamptz default now(), p_profile jsonb default null) returns uuid
language plpgsql set search_path = '' as $$
declare v_life uuid; v_name text; v_gender text; roll game.character_rolls%rowtype;
begin
  perform game.ensure_account(p_account);
  perform 1 from game.accounts where account_id = p_account for update;
  select life_id into v_life from game.lives where account_id = p_account and status = 'alive';
  if v_life is not null then return v_life; end if;

  if p_profile is not null then
    v_name := game.clean_dao_hieu(p_profile->>'dao_hieu');
    v_gender := p_profile->>'gender';
    if v_name is null then raise exception 'invalid_dao_hieu' using errcode = 'GM000'; end if;
    if v_gender is null or v_gender not in ('Nam', 'Nữ') then raise exception 'invalid_gender' using errcode = 'GM000'; end if;
    select * into roll from game.character_rolls where account_id = p_account for update;
    if not found then
      perform game.roll_character(p_account);
      select * into roll from game.character_rolls where account_id = p_account;
    end if;
  end if;

  insert into game.lives (account_id, life_no, last_settle_at, born_at, dao_hieu, gender, race, linh_can)
    values (p_account, coalesce((select max(life_no) from game.lives where account_id = p_account), 0) + 1, p_now, p_now,
            v_name, v_gender, roll.race, roll.linh_can)
    returning life_id into v_life;
  delete from game.character_rolls where account_id = p_account;
  perform game.log_event(p_account, v_life, 'life_start');
  return v_life;
end $$;

-- Gói get_state: thêm life.profile mà không chép lại thân hàm.
alter function game.get_state(uuid, timestamptz) rename to get_state_base;
create function game.get_state(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare s jsonb := game.get_state_base(p_account, p_now); l game.lives%rowtype; roll game.character_rolls%rowtype;
begin
  if s->'life' is not null and s->'life' <> 'null'::jsonb then
    select * into l from game.lives where life_id = (s->'life'->>'life_id')::uuid;
    s := jsonb_set(s, '{life,profile}', jsonb_build_object(
      'dao_hieu', l.dao_hieu, 'gender', l.gender, 'race', l.race, 'linh_can', l.linh_can));
  else
    select * into roll from game.character_rolls where account_id = p_account;
    if found then s := s || jsonb_build_object('pending_roll', jsonb_build_object('race', roll.race, 'linh_can', roll.linh_can)); end if;
  end if;
  return s;
end $$;

revoke all on function game.get_state_base(uuid, timestamptz) from public, anon, authenticated;
revoke all on function game.get_state(uuid, timestamptz) from public, anon, authenticated;
revoke all on function game.roll_character(uuid, text[]) from public, anon, authenticated;
revoke all on function game.start_life(uuid, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function game.rand01(), game.roll_race(), game.roll_linh_can(), game.clean_dao_hieu(text) from public, anon, authenticated;
grant execute on function game.get_state_base(uuid, timestamptz) to service_role;
grant execute on function game.get_state(uuid, timestamptz) to service_role;
grant execute on function game.roll_character(uuid, text[]) to service_role;
grant execute on function game.start_life(uuid, timestamptz, jsonb) to service_role;
grant execute on function game.rand01(), game.roll_race(), game.roll_linh_can(), game.clean_dao_hieu(text) to service_role;
