# Hotfix Truyền âm và Thiên Bảng — Supabase test

> Trạng thái: Hiện hành. Bản sửa API đã triển khai cho môi trường test nội bộ ngày 11/11/2026; giao diện ở PR riêng, chưa merge/deploy Cloudflare.

## Nguyên nhân 404

UI gọi đúng `POST /social/chat/connect`, `POST /social/chat/poll`, `POST /social/chat/send`, `POST /social/chat/leave` và `POST /social/ranking`.
Mã nguồn `supabase/functions/api/http.ts`, `index.ts`, `social.ts` trên `main` **đã định nghĩa** các route này. Tuy nhiên mã Edge Function `api` **ACTIVE v8** trên Supabase vẫn là bản cũ, `http.ts` thiếu các route `/social/*` và `index.ts` không import/dispatch `handleSocial`; vì vậy lỗi xảy ra trước cả xác thực JWT và không liên quan tới dữ liệu bảng.

## Runtime hotfix đã áp dụng

- **Supabase project:** Hugioi (test nội bộ, chưa công khai).
- **Bản mới:** Edge Function `api` v9, ACTIVE, `verify_jwt=false` giữ nguyên vì hàm tự kiểm tra JWT.
- **6 file:** giữ nguyên byte nội dung `game.bundle.mjs` (415699 byte), `auth-user.ts`, `deno.json`; thêm `social.ts`, chèn 5 route vào `http.ts`, dispatch `handleSocial` vào `index.ts`.
- Không đụng gameplay bundle, content version, phiên đăng nhập, chính sách `2026-11-11-v7`, consent hoặc cơ sở dữ liệu; tạo route không đồng nghĩa mở API vô danh.
- Chat vẫn xác minh JWT + consent ở `authenticate`. `social.ts` lấy tên người gửi/quyền tông môn từ DB private; SQL giao dịch khóa ngắn chống gửi đồng thời, giới hạn **15 giây/tin** theo `task.txt` §11.
- Đã đọc lại deployed source v9: năm endpoint có trong `routeOf`, switch có `handleSocial`, auth/consent giữ nguyên, không có thay đổi trong bảng dữ liệu. Trước sửa: DB đã có 1 player và 1 record bảng xếp hạng; không cần reset/migration.

## Giao diện PR

- Chat UI thành cửa sổ messenger desktop giống các cửa sổ khác; bốn kênh, transcript cuộn riêng, bố trí tin người gửi và người nhận khác nhau, ô soạn bám dưới.
- Trên mobile, rút gọn header, điều khiển kênh chia đều theo chiều ngang, vùng tin vẫn cuộn và ô soạn không khuất.
- Chỉ thực hiện `connect/poll` khi cửa sổ chat được mở và không bị thu nhỏ/ẩn tab; nhịp poll bình thường **10 giây**. Đếm ngược 15 giây gửi tiếp sau khi gửi thành công. Các tác vụ chat không chạy khi người chơi đang trong màn gameplay khác.

## Checklist xác nhận trên trình duyệt thật

1. Reload `https://hugioi.blackbearvn.workers.dev` sau khi thoát phiên cũ; kiểm tra không dùng JS cache trước deploy UI.
2. Vào game, mở **Truyền âm** từ menu, vào kênh **Thế giới**. Request `/social/chat/connect` cần trả 200 và payload có `self/messages/channel`.
3. Gửi tin từ tài khoản đang chơi; `/social/chat/send` trả tin nhắn. Gửi tiếp trong 15 giây phải nhận 429 (hoặc thông báo giới hạn), không nhân đôi bản ghi.
4. Chuyển các kênh **Tông môn**, **Đạo hữu**, **Đạo lữ**; tông môn chỉ khả dụng khi gia nhập, backend phải chặn kênh của tông môn khác.
5. Bấm **Bảng xếp hạng**, thử **Lực chiến/Cảnh giới**; `/social/ranking` trả danh sách, không 404.
6. Thu nhỏ/đóng chat: không còn poll mỗi 10 giây. Mở lại: kết nối tự động và input có thể dùng. Thử trên màn 390×844.
7. Nếu response khác 200, ghi lại status HTTP, `error.code` và requestId (không gửi JWT hay mật khẩu). 401/403 là vấn đề Auth/Consent, 404 là lỗi deploy sai route; 5xx cần xem Edge logs hoặc DB query.

Mức kiểm chứng tại thời điểm hotfix: **đã xác nhận deploy v9 active và mã route**, nhưng chưa có quyền dùng JWT tài khoản người dùng để xác minh request 200 trực tiếp. Những bước trên vẫn phải thực hiện trong trình duyệt thật.

## Lưu ý về phiên bản và release

Lần triển khai v9 là **hotfix tối thiểu trên runtime cũ** để không đổi luật chơi giữa phiên nội bộ. Khi deploy chính thức mã nguồn sau merge, **phải build lại `game.bundle.mjs` từ đúng commit** và deploy đủ mọi module của `supabase/functions/api`; nếu chỉ deploy 5 file cũ từ dashboard, lỗi 404 sẽ tái diễn. Đừng thay `social.ts` bằng bản 2 giây từ nhánh khác. Việc cache leaderboard 12 giờ, TTL chat 1 giờ và loại bỏ trigger realtime là việc riêng của `task.txt` §11, **chưa thực hiện** bởi hotfix này.

**Không chạy migration và không thay đổi dữ liệu Auth.**
