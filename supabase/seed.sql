-- CHỈ chạy trên database local (`supabase start` / `supabase db reset`), KHÔNG chạy trên production.
-- Tăng tốc thời gian tu luyện ×2000 để thử cả đường đi trong vài chục phút:
--   tầng đầu ≈ 5 giây thật, cả kiếp sạch (60 ngày thiết kế) ≈ 43 phút.
-- Thọ nguyên tính theo thời gian đã nhân tốc độ nên tỉ lệ giữ nguyên.
update game.rules set value = '2000'::jsonb where key = 'time_scale';
