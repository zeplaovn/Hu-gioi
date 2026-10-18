/* Cấu hình Supabase. Hai giá trị này là CÔNG KHAI theo thiết kế của Supabase (dữ liệu được bảo vệ bằng Row Level Security trong
   supabase/migrations), nhưng vẫn nên đặt bằng biến môi trường lúc build: SUPABASE_URL và SUPABASE_ANON_KEY -> tools/build.mjs sẽ thay hai chuỗi dưới đây.
   Để nguyên (hoặc để trống) = game chạy ngoại tuyến như trước, chỉ lưu trên máy.
   hcaptcha = site key hCaptcha (công khai, biến môi trường HCAPTCHA_SITEKEY): bật ô xác minh ở đăng ký / đăng nhập / quên mật khẩu; phải bật CAPTCHA (hCaptcha + secret) ở Supabase Auth > Attack Protection.
   TUYỆT ĐỐI KHÔNG đặt service_role key / secret key vào đây: build sẽ từ chối. */
window.TT = window.TT || {};                                   // các trang độc lập (maintenance.html, staff.html) nạp file này mà không có mã game
TT.CLOUD = { url: "__SUPABASE_URL__", anonKey: "__SUPABASE_ANON_KEY__", hcaptcha: "__HCAPTCHA_SITEKEY__" };
