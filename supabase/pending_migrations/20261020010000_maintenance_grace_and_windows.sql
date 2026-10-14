-- Bảo trì công bằng hơn cho người chơi:
--  1) Ân hạn 60 giây: khi bật bảo trì, server_status báo ngay (client chuyển sang trang bảo trì) nhưng save_game / send_chat của người chơi
--     vẫn được chấp nhận thêm 60 giây, đủ để client kịp lưu tiến trình chưa đồng bộ trước khi rời game. Hết ân hạn mới chặn.
--  2) Nhật ký các đợt bảo trì (maintenance_windows) và server_status trả về các đợt gần đây: client trừ thời gian bảo trì khỏi phần
--     "vắng mặt" nên người chơi không bị già đi / tọa hóa vì lúc server đóng cửa.
create table if not exists public.maintenance_windows (
  id         bigint generated always as identity primary key,
  started_at timestamptz not null,
  ended_at   timestamptz
);
create index if not exists maintenance_windows_start_idx on public.maintenance_windows (started_at desc);
alter table public.maintenance_windows enable row level security;
revoke all on table public.maintenance_windows from public, anon, authenticated;

-- Đang bảo trì sẵn lúc chạy migration: mở một đợt tính từ lần cập nhật cuối.
insert into public.maintenance_windows (started_at)
select c.updated_at from public.server_control c
where c.singleton and c.maintenance_mode and not exists (select 1 from public.maintenance_windows where ended_at is null);

create or replace function private.maintenance_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.maintenance_mode and not old.maintenance_mode then
    insert into public.maintenance_windows (started_at) values (clock_timestamp());
  elsif old.maintenance_mode and not new.maintenance_mode then
    update public.maintenance_windows set ended_at = clock_timestamp() where ended_at is null;
  end if;
  return new;
end;
$$;
revoke all on function private.maintenance_log() from public, anon, authenticated;
drop trigger if exists server_control_maintenance_log on public.server_control;
create trigger server_control_maintenance_log after update of maintenance_mode on public.server_control
  for each row when (new.maintenance_mode is distinct from old.maintenance_mode)
  execute function private.maintenance_log();

create or replace function private.maintenance_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.maintenance_mode from public.server_control c where c.singleton = true), false)
     and coalesce((select max(w.started_at) from public.maintenance_windows w where w.ended_at is null), '-infinity'::timestamptz) + interval '60 seconds' <= clock_timestamp()
     and not exists (
       select 1 from public.admin_users a
       where a.user_id = (select auth.uid()) and a.enabled and private.admin_rank(a.role) >= 3
     )
$$;
revoke all on function private.maintenance_active() from public, anon, authenticated;

-- server_status: thêm server_ms (đồng hồ máy chủ, để client bù lệch giờ) và các đợt bảo trì 30 ngày gần nhất dạng [bắt đầu_ms, kết thúc_ms | null].
create or replace function public.server_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'maintenance', c.maintenance_mode,
    'maintenance_reason', coalesce(c.maintenance_reason, ''),
    'server_ms', floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
    'maintenance_windows', coalesce((
      select jsonb_agg(jsonb_build_array(floor(extract(epoch from w.started_at) * 1000)::bigint,
                                         case when w.ended_at is null then null else floor(extract(epoch from w.ended_at) * 1000)::bigint end)
                       order by w.started_at desc)
      from (select * from public.maintenance_windows
            where coalesce(ended_at, clock_timestamp()) > clock_timestamp() - interval '30 days'
            order by started_at desc limit 20) w
    ), '[]'::jsonb),
    'banner', (
      select jsonb_build_object('id', b.id, 'title', b.title, 'body', b.body, 'level', b.level, 'starts_at', b.starts_at, 'ends_at', b.ends_at)
      from public.server_banners b
      where b.active and b.starts_at <= now() and (b.ends_at is null or b.ends_at > now())
      order by b.starts_at desc, b.id desc
      limit 1
    )
  )
  from public.server_control c
  where c.singleton = true
$$;
