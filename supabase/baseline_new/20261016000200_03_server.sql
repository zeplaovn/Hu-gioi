-- 03 · Trạng thái máy chủ: bảo trì (có ân hạn + nhật ký), banner thông báo, presence (đang online).
--
-- Bảo trì:
--   * admin_set_maintenance(true) -> server_status() báo ngay (client chuyển sang maintenance.html).
--   * Ân hạn 60 giây: save_game / send_chat của người chơi vẫn được nhận để client kịp lưu tiến trình chưa đồng bộ. Hết ân hạn mới chặn.
--   * Admin (admin/owner) không bao giờ bị chặn, để thử bản mới khi server đóng cửa.
--   * Mỗi đợt bảo trì được ghi vào maintenance_windows; client trừ thời gian bảo trì khỏi phần "vắng mặt"
--     nên người chơi không bị già đi / tọa hóa vì lúc server đóng cửa.

-- Một dòng duy nhất điều khiển máy chủ.
create table public.server_control (
  singleton          boolean     primary key default true check (singleton),
  maintenance_mode   boolean     not null default false,
  maintenance_reason text,
  updated_by         uuid        references auth.users (id) on delete set null,
  updated_at         timestamptz not null default now()
);
insert into public.server_control (singleton) values (true);

-- Nhật ký các đợt bảo trì (ended_at null = đang bảo trì).
create table public.maintenance_windows (
  id         bigint      generated always as identity primary key,
  started_at timestamptz not null,
  ended_at   timestamptz
);
create index maintenance_windows_start_idx on public.maintenance_windows (started_at desc);

create table public.server_banners (
  id         bigint      generated always as identity primary key,
  title      text        not null check (char_length(title) between 1 and 80),
  body       text        not null check (char_length(body) between 1 and 500),
  level      text        not null default 'info' check (level in ('info', 'warning', 'critical')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  active     boolean     not null default true,
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index server_banners_active_idx on public.server_banners (active, starts_at desc, ends_at);

-- Mỗi tài khoản một dòng: phiên chơi gần nhất và lần cuối còn sống.
create table public.server_presence (
  user_id        uuid        primary key references auth.users (id) on delete cascade,
  session_id     uuid        not null,
  last_seen_at   timestamptz not null default now(),
  client_version text,
  realm_level    integer,
  metadata       jsonb       not null default '{}'::jsonb
);
create index server_presence_seen_idx on public.server_presence (last_seen_at desc);

alter table public.server_control      enable row level security;
alter table public.server_control      force  row level security;
alter table public.maintenance_windows enable row level security;
alter table public.maintenance_windows force  row level security;
alter table public.server_banners      enable row level security;
alter table public.server_banners      force  row level security;
alter table public.server_presence     enable row level security;
alter table public.server_presence     force  row level security;
revoke all on table public.server_control, public.maintenance_windows, public.server_banners, public.server_presence
  from anon, authenticated;

-- Trigger: bật bảo trì thì mở một đợt, tắt thì đóng đợt đang mở.
create function private.maintenance_log()
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

create trigger server_control_maintenance_log
  after update of maintenance_mode on public.server_control
  for each row when (new.maintenance_mode is distinct from old.maintenance_mode)
  execute function private.maintenance_log();

-- Người gọi hiện có bị chặn ghi vì bảo trì không? (đang bảo trì + đã hết ân hạn + không phải admin/owner)
create function private.maintenance_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.maintenance_mode from public.server_control c where c.singleton), false)
     and coalesce((select max(w.started_at) from public.maintenance_windows w where w.ended_at is null), '-infinity'::timestamptz)
           + interval '60 seconds' <= clock_timestamp()
     and not private.is_admin((select auth.uid()), 3)
$$;

-- RPC công khai cho màn đăng nhập / trang bảo trì. Không trả dữ liệu quản trị.
--   server_ms: đồng hồ máy chủ để client bù lệch giờ;  maintenance_windows: các đợt 30 ngày gần nhất dạng [bắt_đầu_ms, kết_thúc_ms | null].
create function public.server_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'maintenance',         c.maintenance_mode,
    'maintenance_reason',  coalesce(c.maintenance_reason, ''),
    'server_ms',           floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
    'maintenance_windows', coalesce((
      select jsonb_agg(
               jsonb_build_array(
                 floor(extract(epoch from w.started_at) * 1000)::bigint,
                 case when w.ended_at is null then null else floor(extract(epoch from w.ended_at) * 1000)::bigint end)
               order by w.started_at desc)
      from (select * from public.maintenance_windows
            where coalesce(ended_at, clock_timestamp()) > clock_timestamp() - interval '30 days'
            order by started_at desc
            limit 20) w
    ), '[]'::jsonb),
    'banner', (
      select jsonb_build_object('id', b.id, 'title', b.title, 'body', b.body, 'level', b.level,
                                'starts_at', b.starts_at, 'ends_at', b.ends_at)
      from public.server_banners b
      where b.active and b.starts_at <= now() and (b.ends_at is null or b.ends_at > now())
      order by b.starts_at desc, b.id desc
      limit 1
    )
  )
  from public.server_control c
  where c.singleton
$$;

-- Nhịp sống của client (mỗi ~45 giây). Chỉ ghi dòng của chính người gọi.
-- Giới hạn ghi 30 giây: client gửi mỗi 45 giây nên last_seen_at luôn tươi hơn ngưỡng "online" (90 giây) của dashboard,
-- nhưng gọi dồn dập không tạo thêm ghi (giảm write amplification).
create function public.heartbeat_presence(
  p_session_id     uuid,
  p_client_version text    default null,
  p_realm_level    integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid        := (select auth.uid());
  now_ts timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_session_id is null then raise exception 'invalid_session' using errcode = '22023'; end if;
  if p_realm_level is not null and (p_realm_level < 1 or p_realm_level > 81) then
    raise exception 'invalid_realm' using errcode = '22023';
  end if;

  insert into public.server_presence (user_id, session_id, last_seen_at, client_version, realm_level)
  values (uid, p_session_id, now_ts, left(coalesce(p_client_version, ''), 40), p_realm_level)
  on conflict (user_id) do update set
    session_id     = excluded.session_id,
    last_seen_at   = excluded.last_seen_at,
    client_version = excluded.client_version,
    realm_level    = excluded.realm_level
  where public.server_presence.session_id     is distinct from excluded.session_id
     or public.server_presence.client_version is distinct from excluded.client_version
     or public.server_presence.realm_level    is distinct from excluded.realm_level
     or public.server_presence.last_seen_at   < now_ts - interval '30 seconds';
end;
$$;
