-- 01 · Nền tảng: schema private, dữ liệu người chơi (player_saves), xóa tài khoản, đồng hồ máy chủ.
--
-- Quy ước toàn bộ baseline (đọc một lần, áp dụng cho cả 10 file):
--   * Client chỉ ĐỌC bảng trực tiếp (qua RLS). Mọi lần GHI đi qua hàm RPC đã kiểm tra.
--   * Hàm `security definer` luôn `set search_path = ''` và gọi đối tượng bằng tên đầy đủ (public.x, private.x, auth.x).
--   * Hàm nội bộ nằm ở schema `private` (anon/authenticated không có quyền dùng schema này).
--   * Quyền RPC: revoke hết rồi grant đúng role ở file 09; từng file chỉ khai báo nhiệm vụ của nó.
--   * Mã lỗi trả về client là chuỗi ngắn (not_authenticated, conflict, too_fast...) để client so sánh `message`.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- player_saves: đúng một dòng cho mỗi tài khoản (auth.users).
-- ---------------------------------------------------------------------------------------------------------------------
create table public.player_saves (
  user_id         uuid        primary key references auth.users (id) on delete cascade,
  save            jsonb,                                  -- { count, player }; null nếu chưa tạo nhân vật
  meta            jsonb       not null default '{}'::jsonb, -- Thiên Mệnh, thành tựu, lịch sử các kiếp (meta.best, meta.history)
  rev             bigint      not null default 0,         -- +1 mỗi lần ghi; phát hiện xung đột giữa các thiết bị
  trusted_game_ms bigint      not null default 0,         -- sổ cái thời gian: tiến độ đã được máy chủ xác nhận (mili giây game)
  trusted_game_at timestamptz not null default now(),     -- thời điểm ghi sổ cái lần cuối
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint player_saves_save_object check (save is null or jsonb_typeof(save) = 'object'),
  constraint player_saves_meta_object check (jsonb_typeof(meta) = 'object'),
  constraint player_saves_save_size   check (save is null or octet_length(save::text) <= 262144),
  constraint player_saves_meta_size   check (octet_length(meta::text) <= 262144),
  constraint player_saves_ledger_sane check (trusted_game_ms >= 0)
);

alter table public.player_saves enable row level security;
alter table public.player_saves force row level security;

-- Chỉ chủ tài khoản được đọc dòng của mình. Không có policy insert/update/delete: ghi trực tiếp luôn bị từ chối.
create policy player_saves_select_own on public.player_saves
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.player_saves from anon, authenticated;
grant select on table public.player_saves to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- delete_account(): người chơi tự xóa tài khoản. Mọi bảng tham chiếu auth.users đều `on delete cascade` (dữ liệu của họ)
-- hoặc `on delete set null` (dấu vết quản trị / sổ cái), nên lệnh này không bao giờ vướng khóa ngoại.
-- ---------------------------------------------------------------------------------------------------------------------
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- game_clock(): đồng hồ máy chủ (mili giây từ epoch). Client lấy một lần khi vào game rồi chạy tiếp bằng đồng hồ đơn điệu,
-- nên chỉnh giờ thiết bị không đổi được thời gian tu luyện / linh điền / bí cảnh.
-- VOLATILE có chủ ý: kết quả đổi theo từng lần gọi, không được để Postgres cache.
-- ---------------------------------------------------------------------------------------------------------------------
create function public.game_clock()
returns bigint
language sql
volatile
set search_path = ''
as $$
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint
$$;
