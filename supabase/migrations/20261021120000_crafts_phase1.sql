-- Nghề phụ pha 1: Linh điền 4x4, Vẽ phù, Vạn Bảo Các (bán sản phẩm lấy Linh thạch).
-- Server quyết định mọi thứ (thời gian lớn, sâu, tỉ lệ hỏng, giới hạn ngày, giá). Client chỉ gửi ý định.
-- Các con số dưới đây (giá mở ô, exp, tỉ lệ) là BALANCE_TBD: tài liệu v1.6.1 chưa chốt; chỉnh bằng migration mới ở bảng game.rules('crafts').
-- Giá/thời gian lớn của linh thảo lấy từ data/linh_duoc.csv (Hạ Giới, Phổ thông/Tốt/Hiếm); Giấy Phù 4 LS từ data/nguyen_lieu.csv.

insert into game.rules (key, value) values ('crafts', $json$
{
 "tiers": [{"name":"Thường","mult":1.0},{"name":"Thượng phẩm","mult":1.5},{"name":"Cực phẩm","mult":2.5}],
 "level_exp": [0,30,80,160,300,520,850,1300,1900,2700],
 "herbs": {"HERB-001":{"name":"Thanh Linh Thảo","rarity":"Phổ thông","price":10,"grow_hours":2.0,"min_level":1},"HERB-002":{"name":"Huyết Diệp Hoa","rarity":"Phổ thông","price":12,"grow_hours":2.0,"min_level":1},"HERB-003":{"name":"Ngưng Lộ Thảo","rarity":"Phổ thông","price":12,"grow_hours":2.0,"min_level":1},"HERB-004":{"name":"Xích Dương Hoa","rarity":"Tốt","price":24,"grow_hours":4.0,"min_level":3},"HERB-005":{"name":"Hàn Nguyệt Diệp","rarity":"Tốt","price":25,"grow_hours":4.0,"min_level":3},"HERB-006":{"name":"Kim Tuyến Thảo","rarity":"Tốt","price":26,"grow_hours":4.0,"min_level":3},"HERB-007":{"name":"Thổ Linh Sâm","rarity":"Tốt","price":28,"grow_hours":4.0,"min_level":3},"HERB-008":{"name":"Mộc Tâm Nha","rarity":"Tốt","price":28,"grow_hours":4.0,"min_level":3},"HERB-009":{"name":"Trúc Cơ Quả","rarity":"Hiếm","price":90,"grow_hours":8.0,"min_level":6},"HERB-010":{"name":"Kim Dương Chi","rarity":"Hiếm","price":95,"grow_hours":8.0,"min_level":6},"HERB-011":{"name":"Âm Nguyệt Liên","rarity":"Hiếm","price":100,"grow_hours":8.0,"min_level":6},"HERB-015":{"name":"Lôi Văn Quả","rarity":"Hiếm","price":120,"grow_hours":8.0,"min_level":6},"HERB-016":{"name":"Phong Linh Hoa","rarity":"Hiếm","price":115,"grow_hours":8.0,"min_level":6},"HERB-017":{"name":"Tâm Tĩnh Trúc","rarity":"Hiếm","price":110,"grow_hours":8.0,"min_level":6},"HERB-018":{"name":"Huyết Linh Sâm","rarity":"Hiếm","price":125,"grow_hours":8.0,"min_level":6},"HERB-019":{"name":"Bách Dược Tâm","rarity":"Hiếm","price":130,"grow_hours":8.0,"min_level":6},"HERB-021":{"name":"Cửu Diệp Chi","rarity":"Hiếm","price":140,"grow_hours":8.0,"min_level":6},"HERB-022":{"name":"Thanh Hồn Quả","rarity":"Hiếm","price":135,"grow_hours":8.0,"min_level":6},"HERB-023":{"name":"Hỏa Tủy Liên","rarity":"Hiếm","price":145,"grow_hours":8.0,"min_level":6},"HERB-024":{"name":"Địa Mạch Sâm","rarity":"Hiếm","price":145,"grow_hours":8.0,"min_level":6}},
 "farm": {
  "free_plots": 2,
  "unlock": [
   {"idx":2,"stage":1,"cur":"ls","cost":60},{"idx":3,"stage":1,"cur":"ls","cost":100},
   {"idx":4,"stage":2,"cur":"ls","cost":150},{"idx":5,"stage":2,"cur":"ls","cost":220},
   {"idx":6,"stage":3,"cur":"ls","cost":320},{"idx":7,"stage":3,"cur":"ls","cost":450},
   {"idx":8,"stage":4,"cur":"ls","cost":650},{"idx":9,"stage":4,"cur":"ls","cost":900},
   {"idx":10,"stage":5,"cur":"ls","cost":1300},{"idx":11,"stage":5,"cur":"ls","cost":1800},
   {"idx":12,"stage":6,"cur":"tn","cost":1},{"idx":13,"stage":7,"cur":"tn","cost":1},
   {"idx":14,"stage":8,"cur":"tn","cost":2},{"idx":15,"stage":9,"cur":"tn","cost":3}
  ],
  "base_yield": 2, "water_max": 3, "water_cut": 0.08, "water_cooldown_s": 600,
  "fertilize_cost_ls": 5, "fertilize_bonus": 1,
  "pest_chance": 0.5, "pest_at_min": 0.35, "pest_at_max": 0.7, "pest_penalty": 0.5,
  "tier_chance_per_level": 0.04, "tier2_chance_per_level": 0.01,
  "exp": {"plant":2,"water":2,"fertilize":3,"pest":5,"harvest":10}
 },
 "phu": {
  "paper": "MAT-003", "item": "PHU-001", "item_name": "Linh Phù", "item_price": 14,
  "daily_base": 5, "daily_per_stage": 1,
  "exp_ok": 10, "exp_fail": 4,
  "fail_base": 0.05, "fail_per_level": 0.04, "fail_max": 0.6,
  "tier_chance_per_level": 0.04, "tier2_chance_per_level": 0.01
 },
 "shop": {"buy": [{"id":"MAT-003","name":"Giấy Phù","price":4}]},
 "locked_crafts": ["luyen_dan","luyen_khi"]
}
$json$::jsonb)
on conflict (key) do update set value = excluded.value;

create table game.life_goods (
  life_id uuid not null references game.lives (life_id) on delete cascade,
  item_id text not null,
  tier    smallint not null default 0 check (tier between 0 and 2),
  qty     int not null default 0 check (qty >= 0),
  primary key (life_id, item_id, tier)
);
create table game.life_crafts (
  life_id uuid not null references game.lives (life_id) on delete cascade,
  craft   text not null check (craft in ('linh_dien', 've_phu', 'luyen_dan', 'luyen_khi')),
  exp     bigint not null default 0 check (exp >= 0),
  primary key (life_id, craft)
);
create table game.craft_daily (
  life_id uuid not null references game.lives (life_id) on delete cascade,
  craft   text not null,
  day     date not null,
  uses    int not null default 0 check (uses >= 0),
  primary key (life_id, craft, day)
);
create table game.farm_plots (
  life_id uuid not null references game.lives (life_id) on delete cascade,
  idx     smallint not null check (idx between 0 and 15),
  unlocked boolean not null default false,
  crop    text,
  planted_at timestamptz,
  ready_at   timestamptz,
  waters  smallint not null default 0,
  last_water_at timestamptz,
  fertilized boolean not null default false,
  pest_at timestamptz,
  pest_cleared boolean not null default false,
  primary key (life_id, idx)
);
do $$ declare t text; begin
  foreach t in array array['life_goods', 'life_crafts', 'craft_daily', 'farm_plots'] loop
    execute format('alter table game.%I enable row level security', t);
    execute format('alter table game.%I force row level security', t);
    execute format('revoke all on game.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on game.%I to service_role', t);
  end loop;
end $$;

-- cấp nghề từ exp (1..10)
create function game.craft_level(p_exp bigint) returns int
language sql stable set search_path = '' as $$
  select greatest(1, (select count(*)::int from jsonb_array_elements_text(game.rule('crafts')->'level_exp') e where e::bigint <= p_exp))
$$;

create function game.craft_exp(p_life uuid, p_craft text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce((select exp from game.life_crafts where life_id = p_life and craft = p_craft), 0)
$$;

create function game.craft_add_exp(p_life uuid, p_craft text, p_exp int) returns void
language sql set search_path = '' as $$
  insert into game.life_crafts (life_id, craft, exp) values (p_life, p_craft, p_exp)
  on conflict (life_id, craft) do update set exp = game.life_crafts.exp + excluded.exp
$$;

create function game.goods_add(p_life uuid, p_item text, p_tier int, p_qty int) returns void
language sql set search_path = '' as $$
  insert into game.life_goods (life_id, item_id, tier, qty) values (p_life, p_item, p_tier, p_qty)
  on conflict (life_id, item_id, tier) do update set qty = game.life_goods.qty + excluded.qty
$$;

-- Chọn phẩm chất theo cấp nghề: p_t1, p_t2 là xác suất cộng thêm mỗi cấp trên cấp 1.
create function game.roll_tier(p_level int, p_t1 double precision, p_t2 double precision) returns int
language plpgsql volatile set search_path = '' as $$
declare r double precision := game.rand01(); c2 double precision := (p_level - 1) * p_t2; c1 double precision := (p_level - 1) * p_t1;
begin
  if r < c2 then return 2; end if;
  if r < c2 + c1 then return 1; end if;
  return 0;
end $$;

create function game.craft_item_name(p_item text) returns text
language sql stable set search_path = '' as $$
  select coalesce(game.rule('crafts')->'herbs'->p_item->>'name',
    case p_item when 'MAT-003' then 'Giấy Phù' when game.rule('crafts')->'phu'->>'item' then game.rule('crafts')->'phu'->>'item_name' end, p_item)
$$;

create function game.craft_item_price(p_item text, p_tier int) returns int
language sql stable set search_path = '' as $$
  select floor(coalesce((game.rule('crafts')->'herbs'->p_item->>'price')::numeric,
      case when p_item = game.rule('crafts')->'phu'->>'item' then (game.rule('crafts')->'phu'->>'item_price')::numeric end, 0)
    * (game.rule('crafts')->'tiers'->p_tier->>'mult')::numeric)::int
$$;

-- Bảo đảm 16 ô của kiếp tồn tại (2 ô đầu mở sẵn).
create function game.ensure_plots(p_life uuid) returns void
language sql set search_path = '' as $$
  insert into game.farm_plots (life_id, idx, unlocked)
  select p_life, i, i < (game.rule('crafts')->'farm'->>'free_plots')::int from generate_series(0, 15) i
  on conflict do nothing
$$;

create function game.crafts_state(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; r jsonb := game.rule('crafts'); f jsonb := r->'farm'; ph jsonb := r->'phu';
  v_farm_exp bigint; v_phu_exp bigint; v_farm_lv int; v_phu_lv int; v_day date := (p_now at time zone 'UTC')::date;
  v_used int; v_limit int; v_next int;
begin
  select * into l from game.lives where account_id = p_account and status = 'alive';
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  perform game.ensure_plots(l.life_id);
  v_farm_exp := game.craft_exp(l.life_id, 'linh_dien'); v_farm_lv := game.craft_level(v_farm_exp);
  v_phu_exp := game.craft_exp(l.life_id, 've_phu'); v_phu_lv := game.craft_level(v_phu_exp);
  select coalesce(uses, 0) into v_used from game.craft_daily where life_id = l.life_id and craft = 've_phu' and day = v_day;
  v_used := coalesce(v_used, 0);
  v_limit := (ph->>'daily_base')::int + (ph->>'daily_per_stage')::int * l.stage_idx;
  return jsonb_build_object(
    'life_id', l.life_id, 'now', p_now, 'stage_idx', l.stage_idx, 'wallet', jsonb_build_object('ls', l.ls, 'tn', l.tn),
    'crafts', jsonb_build_object(
      'linh_dien', jsonb_build_object('exp', v_farm_exp, 'level', v_farm_lv, 'next_exp', (r->'level_exp'->>v_farm_lv)::bigint),
      've_phu', jsonb_build_object('exp', v_phu_exp, 'level', v_phu_lv, 'next_exp', (r->'level_exp'->>v_phu_lv)::bigint,
        'used_today', v_used, 'limit', v_limit,
        'fail_pct', round(100 * least((ph->>'fail_max')::numeric, (ph->>'fail_base')::numeric + (ph->>'fail_per_level')::numeric * (v_phu_lv - 1)), 1)),
      'luyen_dan', jsonb_build_object('locked', true), 'luyen_khi', jsonb_build_object('locked', true)),
    'plots', (select jsonb_agg(jsonb_build_object(
        'idx', p.idx, 'unlocked', p.unlocked, 'crop', p.crop, 'crop_name', r->'herbs'->p.crop->>'name',
        'state', case when p.crop is null then 'empty' when p.ready_at <= p_now then 'ready' else 'growing' end,
        'planted_at', p.planted_at, 'ready_at', p.ready_at, 'waters', p.waters, 'fertilized', p.fertilized,
        'can_water_at', case when p.crop is null then null else p.last_water_at + make_interval(secs => (f->>'water_cooldown_s')::int) end,
        'pest', p.crop is not null and p.pest_at is not null and p.pest_at <= p_now and not p.pest_cleared and p.ready_at > p_now - interval '100 years',
        'unlock', (select u from jsonb_array_elements(f->'unlock') u where (u->>'idx')::int = p.idx))
        order by p.idx) from game.farm_plots p where p.life_id = l.life_id),
    'farm', jsonb_build_object('water_max', f->'water_max', 'fertilize_cost_ls', f->'fertilize_cost_ls', 'base_yield', f->'base_yield'),
    'seeds', (select jsonb_agg(jsonb_build_object('id', k, 'name', v->>'name', 'rarity', v->>'rarity', 'grow_hours', v->'grow_hours',
        'min_level', v->'min_level', 'price', v->'price', 'ok', (v->>'min_level')::int <= v_farm_lv) order by (v->>'min_level')::int, k)
      from jsonb_each(r->'herbs') e(k, v)),
    'goods', coalesce((select jsonb_agg(jsonb_build_object('item_id', g.item_id, 'tier', g.tier, 'qty', g.qty,
        'name', game.craft_item_name(g.item_id), 'tier_name', r->'tiers'->g.tier->>'name',
        'price', game.craft_item_price(g.item_id, g.tier)) order by g.item_id, g.tier)
      from game.life_goods g where g.life_id = l.life_id and g.qty > 0), '[]'::jsonb),
    'shop_buy', r->'shop'->'buy',
    'paper', coalesce((select qty from game.life_goods where life_id = l.life_id and item_id = ph->>'paper' and tier = 0), 0));
end $$;

create function game.crafts_action(p_account uuid, p_kind text, p_plot int default null, p_id text default '', p_tier int default 0,
                                   p_qty int default 1, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; r jsonb := game.rule('crafts'); f jsonb := r->'farm'; ph jsonb := r->'phu'; p game.farm_plots%rowtype;
  lv int; v_day date := (p_now at time zone 'UTC')::date; v_used int; v_limit int; v_fail double precision; v_tier int; n int;
  herb jsonb; u jsonb; rem double precision; yield int; paper int; price int; item jsonb; cost int; v_have int;
begin
  select * into l from game.lives where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  perform game.ensure_plots(l.life_id);

  if p_kind in ('plant', 'water', 'fertilize', 'pest', 'harvest', 'unlock') then
    if p_plot is null or p_plot < 0 or p_plot > 15 then raise exception 'invalid_plot' using errcode = 'GM000'; end if;
    select * into p from game.farm_plots where life_id = l.life_id and idx = p_plot for update;
    lv := game.craft_level(game.craft_exp(l.life_id, 'linh_dien'));

    if p_kind = 'unlock' then
      if p.unlocked then raise exception 'plot_unlocked' using errcode = 'GM000'; end if;
      if exists (select 1 from game.farm_plots where life_id = l.life_id and idx < p_plot and not unlocked) then
        raise exception 'plot_order' using errcode = 'GM000'; end if;
      select x into u from jsonb_array_elements(f->'unlock') x where (x->>'idx')::int = p_plot;
      if l.stage_idx < (u->>'stage')::int then raise exception 'realm_too_low' using errcode = 'GM000'; end if;
      cost := (u->>'cost')::int;
      if u->>'cur' = 'ls' then
        if l.ls < cost then raise exception 'insufficient_ls' using errcode = 'GM000'; end if;
        update game.lives set ls = ls - cost where life_id = l.life_id;
      else
        if l.tn < cost then raise exception 'insufficient_tn' using errcode = 'GM000'; end if;
        update game.lives set tn = tn - cost where life_id = l.life_id;
      end if;
      update game.farm_plots set unlocked = true where life_id = l.life_id and idx = p_plot;

    elsif not p.unlocked then raise exception 'plot_locked' using errcode = 'GM000';

    elsif p_kind = 'plant' then
      if p.crop is not null then raise exception 'plot_busy' using errcode = 'GM000'; end if;
      herb := r->'herbs'->p_id;
      if herb is null then raise exception 'invalid_seed' using errcode = 'GM000'; end if;
      if (herb->>'min_level')::int > lv then raise exception 'craft_level_too_low' using errcode = 'GM000'; end if;
      rem := (herb->>'grow_hours')::double precision * 3600;
      update game.farm_plots set crop = p_id, planted_at = p_now, ready_at = p_now + make_interval(secs => rem), waters = 0, last_water_at = null,
        fertilized = false, pest_cleared = false,
        pest_at = case when game.rand01() < (f->>'pest_chance')::double precision
          then p_now + make_interval(secs => rem * ((f->>'pest_at_min')::double precision + game.rand01() * ((f->>'pest_at_max')::double precision - (f->>'pest_at_min')::double precision)))
          end
        where life_id = l.life_id and idx = p_plot;
      perform game.craft_add_exp(l.life_id, 'linh_dien', (f->'exp'->>'plant')::int);

    elsif p_kind = 'water' then
      if p.crop is null or p.ready_at <= p_now then raise exception 'nothing_to_water' using errcode = 'GM000'; end if;
      if p.waters >= (f->>'water_max')::int then raise exception 'water_max' using errcode = 'GM000'; end if;
      if p.last_water_at is not null and p_now < p.last_water_at + make_interval(secs => (f->>'water_cooldown_s')::int) then
        raise exception 'water_cooldown' using errcode = 'GM000'; end if;
      rem := extract(epoch from (p.ready_at - p_now));
      update game.farm_plots set waters = waters + 1, last_water_at = p_now,
        ready_at = p.ready_at - make_interval(secs => rem * (f->>'water_cut')::double precision)
        where life_id = l.life_id and idx = p_plot;
      perform game.craft_add_exp(l.life_id, 'linh_dien', (f->'exp'->>'water')::int);

    elsif p_kind = 'fertilize' then
      if p.crop is null or p.ready_at <= p_now then raise exception 'nothing_to_fertilize' using errcode = 'GM000'; end if;
      if p.fertilized then raise exception 'already_fertilized' using errcode = 'GM000'; end if;
      cost := (f->>'fertilize_cost_ls')::int;
      if l.ls < cost then raise exception 'insufficient_ls' using errcode = 'GM000'; end if;
      update game.lives set ls = ls - cost where life_id = l.life_id;
      update game.farm_plots set fertilized = true where life_id = l.life_id and idx = p_plot;
      perform game.craft_add_exp(l.life_id, 'linh_dien', (f->'exp'->>'fertilize')::int);

    elsif p_kind = 'pest' then
      if p.crop is null or p.pest_at is null or p.pest_at > p_now or p.pest_cleared then raise exception 'no_pest' using errcode = 'GM000'; end if;
      update game.farm_plots set pest_cleared = true where life_id = l.life_id and idx = p_plot;
      perform game.craft_add_exp(l.life_id, 'linh_dien', (f->'exp'->>'pest')::int);

    elsif p_kind = 'harvest' then
      if p.crop is null or p.ready_at > p_now then raise exception 'not_ready' using errcode = 'GM000'; end if;
      yield := (f->>'base_yield')::int + case when p.fertilized then (f->>'fertilize_bonus')::int else 0 end;
      if p.pest_at is not null and p.pest_at <= p.ready_at and not p.pest_cleared then
        yield := greatest(1, floor(yield * (1 - (f->>'pest_penalty')::numeric))::int); end if;
      for n in 1 .. yield loop
        perform game.goods_add(l.life_id, p.crop, game.roll_tier(lv, (f->>'tier_chance_per_level')::double precision, (f->>'tier2_chance_per_level')::double precision), 1);
      end loop;
      update game.farm_plots set crop = null, planted_at = null, ready_at = null, waters = 0, last_water_at = null, fertilized = false,
        pest_at = null, pest_cleared = false where life_id = l.life_id and idx = p_plot;
      perform game.craft_add_exp(l.life_id, 'linh_dien', (f->'exp'->>'harvest')::int);
    end if;

  elsif p_kind = 'phu' then
    lv := game.craft_level(game.craft_exp(l.life_id, 've_phu'));
    v_limit := (ph->>'daily_base')::int + (ph->>'daily_per_stage')::int * l.stage_idx;
    insert into game.craft_daily (life_id, craft, day, uses) values (l.life_id, 've_phu', v_day, 0) on conflict do nothing;
    select uses into v_used from game.craft_daily where life_id = l.life_id and craft = 've_phu' and day = v_day for update;
    if v_used >= v_limit then raise exception 'daily_limit' using errcode = 'GM000'; end if;
    select qty into paper from game.life_goods where life_id = l.life_id and item_id = ph->>'paper' and tier = 0 for update;
    if coalesce(paper, 0) < 1 then raise exception 'no_paper' using errcode = 'GM000'; end if;
    update game.life_goods set qty = qty - 1 where life_id = l.life_id and item_id = ph->>'paper' and tier = 0;
    update game.craft_daily set uses = uses + 1 where life_id = l.life_id and craft = 've_phu' and day = v_day;
    v_fail := least((ph->>'fail_max')::double precision, (ph->>'fail_base')::double precision + (ph->>'fail_per_level')::double precision * (lv - 1));
    if game.rand01() < v_fail then
      perform game.craft_add_exp(l.life_id, 've_phu', (ph->>'exp_fail')::int);
    else
      v_tier := game.roll_tier(lv, (ph->>'tier_chance_per_level')::double precision, (ph->>'tier2_chance_per_level')::double precision);
      perform game.goods_add(l.life_id, ph->>'item', v_tier, 1);
      perform game.craft_add_exp(l.life_id, 've_phu', (ph->>'exp_ok')::int);
    end if;

  elsif p_kind = 'sell' then
    if p_qty is null or p_qty < 1 or p_qty > 999 or p_tier not between 0 and 2 then raise exception 'invalid_qty' using errcode = 'GM000'; end if;
    price := game.craft_item_price(p_id, p_tier);
    if price <= 0 then raise exception 'not_sellable' using errcode = 'GM000'; end if;
    select qty into v_have from game.life_goods where life_id = l.life_id and item_id = p_id and tier = p_tier for update;
    if coalesce(v_have, 0) < p_qty then raise exception 'insufficient_goods' using errcode = 'GM000'; end if;
    update game.life_goods set qty = qty - p_qty where life_id = l.life_id and item_id = p_id and tier = p_tier;
    update game.lives set ls = ls + price::bigint * p_qty where life_id = l.life_id;

  elsif p_kind = 'buy' then
    if p_qty is null or p_qty < 1 or p_qty > 99 then raise exception 'invalid_qty' using errcode = 'GM000'; end if;
    select x into item from jsonb_array_elements(r->'shop'->'buy') x where x->>'id' = p_id;
    if item is null then raise exception 'not_for_sale' using errcode = 'GM000'; end if;
    cost := (item->>'price')::int * p_qty;
    if l.ls < cost then raise exception 'insufficient_ls' using errcode = 'GM000'; end if;
    update game.lives set ls = ls - cost where life_id = l.life_id;
    perform game.goods_add(l.life_id, p_id, 0, p_qty);

  else raise exception 'invalid_action' using errcode = 'GM000';
  end if;
  return game.crafts_state(p_account, p_now);
end $$;

revoke all on function game.craft_level(bigint), game.craft_exp(uuid, text), game.craft_add_exp(uuid, text, int), game.goods_add(uuid, text, int, int),
  game.roll_tier(int, double precision, double precision), game.craft_item_name(text), game.craft_item_price(text, int), game.ensure_plots(uuid),
  game.crafts_state(uuid, timestamptz), game.crafts_action(uuid, text, int, text, int, int, timestamptz) from public, anon, authenticated;
grant execute on function game.craft_level(bigint), game.craft_exp(uuid, text), game.craft_add_exp(uuid, text, int), game.goods_add(uuid, text, int, int),
  game.roll_tier(int, double precision, double precision), game.craft_item_name(text), game.craft_item_price(text, int), game.ensure_plots(uuid),
  game.crafts_state(uuid, timestamptz), game.crafts_action(uuid, text, int, text, int, int, timestamptz) to service_role;
