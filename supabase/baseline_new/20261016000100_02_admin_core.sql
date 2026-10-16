-- 02 · Nền tảng quản trị: vai trò (RBAC), nhật ký audit và các hàm kiểm tra quyền dùng chung.
--
-- Thang quyền (private.admin_rank):  viewer 1 < moderator 2 < admin 3 < owner 4.
--   moderator+  : đăng tin admin, xóa chat, tin chat được gắn huy hiệu admin.
--   admin+      : bật/tắt bảo trì, đăng banner, vào game khi đang bảo trì, dùng p_force của save_game.
-- Tài khoản quản trị là một tài khoản Supabase Auth thường; bảng này chỉ cấp vai trò cho UUID đó (xem supabase/README.md).

create table public.admin_users (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null check (role in ('viewer', 'moderator', 'admin', 'owner')),
  enabled    boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id            bigint      generated always as identity primary key,
  admin_user_id uuid        references auth.users (id) on delete set null,   -- xóa tài khoản admin vẫn giữ dấu vết
  action        text        not null,
  target_type   text,
  target_id     text,
  reason        text,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index admin_audit_time_idx  on public.admin_audit_log (created_at desc);
create index admin_audit_admin_idx on public.admin_audit_log (admin_user_id, created_at desc);

-- Mặc định từ chối tất cả: không policy nào => client không đọc/ghi trực tiếp được; chỉ RPC (security definer) chạm vào.
alter table public.admin_users     enable row level security;
alter table public.admin_users     force  row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force  row level security;
revoke all on table public.admin_users, public.admin_audit_log from anon, authenticated;

-- Thứ hạng của một vai trò (0 nếu không hợp lệ).
create function private.admin_rank(p_role text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role when 'viewer' then 1 when 'moderator' then 2 when 'admin' then 3 when 'owner' then 4 else 0 end
$$;

-- Tài khoản p_uid có đang là quản trị viên (bật) với thứ hạng >= p_min_rank không?
create function private.is_admin(p_uid uuid, p_min_rank integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = p_uid and a.enabled and private.admin_rank(a.role) >= p_min_rank
  )
$$;

-- Vai trò (đang bật) của người gọi, hoặc null.
create function private.current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role from public.admin_users a where a.user_id = (select auth.uid()) and a.enabled
$$;

-- Chặn người gọi nếu chưa đăng nhập (not_authenticated) hoặc không đủ vai trò (forbidden). Trả về vai trò của họ.
create function private.require_admin(p_min_role text default 'viewer')
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  r := private.current_admin_role();
  if r is null or private.admin_rank(r) < private.admin_rank(p_min_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return r;
end;
$$;

-- Ghi một dòng audit cho người gọi.
create function private.admin_audit(
  p_action      text,
  p_target_type text  default null,
  p_target_id   text  default null,
  p_reason      text  default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, reason, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_reason, coalesce(p_metadata, '{}'::jsonb))
$$;
