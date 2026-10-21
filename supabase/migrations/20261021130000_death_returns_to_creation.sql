-- Chết không còn tự mở kiếp mới: người chơi quay lại màn tạo nhân vật (đạo hiệu, roll, Quán Đỉnh, Bia Thiên Mệnh)
-- và chỉ bắt đầu kiếp khi bấm "Bắt đầu tu tiên" (game.start_life). Tài sản nghề phụ của kiếp (kho hàng, ruộng) mất cùng kiếp.
create or replace function game.end_life(p_life uuid, p_cause text, p_now timestamptz default now()) returns uuid
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; v_items jsonb; v_world text; v_goods jsonb;
begin
  select * into l from game.lives where life_id = p_life for update;
  if not found then raise exception 'life_not_found' using errcode = 'GM000'; end if;
  if l.status <> 'alive' then
    return (select life_id from game.lives where account_id = l.account_id and status = 'alive');   -- null nếu chưa mở kiếp mới
  end if;
  perform 1 from game.accounts where account_id = l.account_id for update;

  select coalesce(jsonb_agg(jsonb_build_object('catalog_id', catalog_id, 'acquired_at', acquired_at, 'used', used_at is not null)), '[]'::jsonb)
    into v_items from game.life_items where life_id = p_life;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', item_id, 'tier', tier, 'qty', qty)), '[]'::jsonb)
    into v_goods from game.life_goods where life_id = p_life and qty > 0;
  select world into v_world from game.stages where idx = l.stage_idx;

  insert into game.life_history (life_id, account_id, life_no, cause, stage_idx, tang, credited_days, tm_earned, born_at, ended_at, snapshot)
  values (l.life_id, l.account_id, l.life_no, p_cause, l.stage_idx, l.tang, l.credited_s / 86400.0, l.tm_earned_life, l.born_at, p_now,
          jsonb_build_object('world', v_world, 'wallet', jsonb_build_object('ls', l.ls, 'lt', l.lt, 'tn', l.tn), 'items', v_items, 'goods', v_goods));

  delete from game.life_items where life_id = p_life;
  delete from game.life_goods where life_id = p_life;
  delete from game.farm_plots where life_id = p_life;
  update game.lives set status = 'dead', ended_at = p_now, death_cause = p_cause, ls = 0, lt = 0, tn = 0 where life_id = p_life;
  update game.accounts set life_count = life_count + 1 where account_id = l.account_id;

  perform game.log_event(l.account_id, p_life, 'death', jsonb_build_object('cause', p_cause, 'stage_idx', l.stage_idx, 'tang', l.tang, 'world', v_world,
          'lost_wallet_ls', l.ls, 'lost_items', jsonb_array_length(v_items), 'tm_earned_life', l.tm_earned_life));
  return null;
end $$;
