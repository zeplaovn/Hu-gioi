/* Cấu hình Supabase. Hai giá trị này là CÔNG KHAI theo thiết kế của Supabase (dữ liệu được bảo vệ bằng Row Level Security trong
   supabase/migrations), nhưng vẫn nên đặt bằng biến môi trường lúc build: SUPABASE_URL và SUPABASE_ANON_KEY -> tools/build.mjs sẽ thay hai chuỗi dưới đây.
   Để nguyên (hoặc để trống) = game chạy ngoại tuyến như trước, chỉ lưu trên máy.
   TUYỆT ĐỐI KHÔNG đặt service_role key / secret key vào đây: build sẽ từ chối. */
TT.CLOUD = { url: "__SUPABASE_URL__", anonKey: "__SUPABASE_ANON_KEY__" };
