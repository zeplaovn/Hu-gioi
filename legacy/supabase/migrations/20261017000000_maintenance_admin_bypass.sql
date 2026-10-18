-- Bảo trì: quản trị viên (vai trò admin / owner, đang bật) vẫn vào game và lưu / chat được để thử bản mới trước khi mở cửa.
-- Người chơi thường vẫn bị chặn như cũ. Việc ẩn màn hình bảo trì ở client chỉ là giao diện; quyền thật nằm ở hàm này.
create or replace function private.maintenance_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.maintenance_mode from public.server_control c where c.singleton = true), false)
     and not exists (
       select 1 from public.admin_users a
       where a.user_id = (select auth.uid()) and a.enabled and private.admin_rank(a.role) >= 3
     )
$$;
revoke all on function private.maintenance_active() from public, anon, authenticated;
