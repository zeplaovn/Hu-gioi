-- Dashboard cần biết tin nào của quản trị viên: trả thêm cột is_admin (trước đây dashboard nhận diện bằng name = '[ADMIN]',
-- hỏng từ khi tin admin mang tên 'Thiên Đạo' và admin chat bằng tài khoản game có tên riêng).
drop function if exists public.admin_list_chat(integer);
create or replace function public.admin_list_chat(p_limit integer default 100)
returns table(id bigint, user_id uuid, name text, body text, created_at timestamptz, is_admin boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select c.id, c.user_id, c.name, c.body, c.created_at, c.is_admin
  from public.chat_messages c
  order by c.id desc
  limit greatest(1, least(coalesce(p_limit,100), 300));
end;
$$;
revoke all on function public.admin_list_chat(integer) from public, anon, authenticated;
grant execute on function public.admin_list_chat(integer) to authenticated;
