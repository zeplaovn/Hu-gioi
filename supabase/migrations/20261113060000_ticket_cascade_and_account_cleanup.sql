-- Xóa tài khoản phải xóa cả phiếu khởi nguyên.
-- Baseline đã khai báo ON DELETE CASCADE, nhưng production có thể được dựng từ
-- migration cũ hoặc chỉnh tay. Migration này chuẩn hóa khóa ngoại, dọn phiếu mồ
-- côi/phiếu của tài khoản đã bị Supabase Auth xóa mềm, và lập lịch dọn tiếp.

begin;

-- 1) Dọn trước để bước thêm khóa ngoại không gặp dữ liệu mồ côi.
do $$
declare
  has_deleted_at boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'deleted_at'
  ) into has_deleted_at;

  if has_deleted_at then
    execute $sql$
      delete from game.creation_tickets t
      where not exists (
        select 1 from auth.users u
        where u.id = t.owner_id and u.deleted_at is null
      )
    $sql$;
  else
    execute $sql$
      delete from game.creation_tickets t
      where not exists (
        select 1 from auth.users u where u.id = t.owner_id
      )
    $sql$;
  end if;
end $$;

-- 2) Bảo đảm mọi đường xóa auth.users đều kéo theo phiếu khởi nguyên.
do $$
declare
  fk_name text;
  fk_def text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
    into fk_name, fk_def
  from pg_constraint c
  where c.conrelid = 'game.creation_tickets'::regclass
    and c.contype = 'f'
    and c.confrelid = 'auth.users'::regclass
  order by c.conname
  limit 1;

  if fk_name is null then
    alter table game.creation_tickets
      add constraint creation_tickets_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete cascade;
  elsif fk_def not ilike '%on delete cascade%' then
    execute format('alter table game.creation_tickets drop constraint %I', fk_name);
    alter table game.creation_tickets
      add constraint creation_tickets_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 3) Dọn định kỳ phiếu của tài khoản không còn tồn tại hoặc đã xóa mềm.
do $$
begin
  if to_regclass('cron.job') is not null then
    if exists (select 1 from cron.job where jobname = 'hugioi-cleanup-orphan-tickets') then
      perform cron.alter_job(
        (select jobid from cron.job where jobname = 'hugioi-cleanup-orphan-tickets'),
        command := $job$
          do $cleanup$
          begin
            if exists (
              select 1 from information_schema.columns
              where table_schema = 'auth' and table_name = 'users' and column_name = 'deleted_at'
            ) then
              delete from game.creation_tickets t
              where not exists (
                select 1 from auth.users u
                where u.id = t.owner_id and u.deleted_at is null
              );
            else
              delete from game.creation_tickets t
              where not exists (
                select 1 from auth.users u where u.id = t.owner_id
              );
            end if;
          end $cleanup$;
        $job$
      );
    else
      perform cron.schedule(
        'hugioi-cleanup-orphan-tickets',
        '30 */3 * * *',
        $job$
          do $cleanup$
          begin
            if exists (
              select 1 from information_schema.columns
              where table_schema = 'auth' and table_name = 'users' and column_name = 'deleted_at'
            ) then
              delete from game.creation_tickets t
              where not exists (
                select 1 from auth.users u
                where u.id = t.owner_id and u.deleted_at is null
              );
            else
              delete from game.creation_tickets t
              where not exists (
                select 1 from auth.users u where u.id = t.owner_id
              );
            end if;
          end $cleanup$;
        $job$
      );
    end if;
  end if;
end $$;

commit;
