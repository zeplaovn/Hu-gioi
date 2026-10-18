-- 1) Người chơi tự xóa tài khoản: xóa dòng auth.users của chính mình (player_saves xóa theo nhờ on delete cascade).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_account() from public, anon, authenticated;
grant execute on function public.delete_account() to authenticated;

-- 2) Kiểm tra tính hợp lý của nhân vật ngay trên máy chủ (không thay thế luật chơi, chỉ chặn dữ liệu vô lý rõ ràng):
--    cảnh giới 0..8, tầng 1..9, tuổi và thọ nguyên 1..20000, số tháng tu luyện không âm và đủ cho cảnh giới đã đạt (>= cấp - 1).
create or replace function public.player_plausible(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare realm int; tang int; months numeric; age numeric; life numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if jsonb_typeof(p->'realm') is distinct from 'number' or jsonb_typeof(p->'tang') is distinct from 'number' or jsonb_typeof(p->'months') is distinct from 'number'
     or jsonb_typeof(p->'age') is distinct from 'number' or jsonb_typeof(p->'lifespan') is distinct from 'number' then return false; end if;
  realm := (p->>'realm')::numeric; tang := (p->>'tang')::numeric; months := (p->>'months')::numeric;
  age := (p->>'age')::numeric; life := (p->>'lifespan')::numeric;
  return coalesce(realm between 0 and 8 and tang between 1 and 9 and months between 0 and 1000000
     and age between 1 and 20000 and life between 1 and 20000 and months >= realm * 9 + tang - 1, false);
end;
$$;

-- save_game: thêm kiểm tra player_plausible khi bản lưu có nhân vật.
create or replace function public.save_game(p_save jsonb, p_meta jsonb, p_rev bigint, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cur public.player_saves%rowtype;
  new_rev bigint;
  now_ts timestamptz := now();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then
    raise exception 'bad_meta' using errcode = '22023';
  end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then
    raise exception 'bad_save' using errcode = '22023';
  end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then
    raise exception 'too_large' using errcode = 'P0001';
  end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb and not coalesce(public.player_plausible(p_save->'player'), false) then
    raise exception 'implausible' using errcode = '22023';
  end if;
  if p_rev is null or p_rev < 0 then
    raise exception 'bad_rev' using errcode = '22023';
  end if;

  select * into cur from public.player_saves where user_id = uid for update;

  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then
      raise exception 'conflict' using errcode = 'P0001';
    end if;
    insert into public.player_saves (user_id, save, meta, rev, updated_at)
    values (uid, p_save, p_meta, 1, now_ts);
    return jsonb_build_object('rev', 1, 'updated_at', now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  if now_ts - cur.updated_at < interval '1 second' and not coalesce(p_force, false) then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves
     set save = p_save, meta = p_meta, rev = new_rev, updated_at = now_ts
   where user_id = uid;
  return jsonb_build_object('rev', new_rev, 'updated_at', now_ts);
end;
$$;
revoke all on function public.save_game(jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb, jsonb, bigint, boolean) to authenticated;
revoke all on function public.player_plausible(jsonb) from public, anon, authenticated;
