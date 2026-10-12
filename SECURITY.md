# Bảo mật & chống gian lận

Game chạy 100% trong trình duyệt, nên **mã nguồn luôn được tải về máy người chơi** và **save nằm trong máy họ**.
Không có cách nào chặn tuyệt đối; các lớp dưới đây chỉ nâng độ khó.

## 1. Chống sửa save (`js/security.js`)
| Lớp | Chặn được | Không chặn được |
|---|---|---|
| Chữ ký HMAC-SHA256 trên save, Thiên Mệnh và file xuất | Sửa tay `localStorage` / file JSON, chép đè save lạ | Người đọc code lấy khóa (`SALT`) rồi tự ký lại |
| Kiểm tra tính hợp lý (cảnh giới ≤ số tháng đã chơi, tuổi khớp thời gian, chỉ số ≤ 40, linh thạch ≤ trần theo thời gian, vật phẩm phải có trong danh sách...) | Save "ký đúng nhưng số liệu vô lý", item/skill không tồn tại | Số liệu vô lý nhưng vẫn nằm trong giới hạn |
| Thiên Mệnh: điểm đã tiêu phải khớp đúng giá nâng cấp, tổng điểm không vượt mức kiếm được | Cộng điểm tay | — |
| Save cũ chưa ký được chấp nhận **một lần** để chuyển đổi; sau đó bắt buộc có chữ ký | Xóa chữ ký để lách | Người xóa luôn khóa `tu_tien_sec_v1` rồi nạp save tự tạo (vẫn bị lọc hợp lý ở trên) |

**Khóa ký không còn nằm trong repo.** `js/security.js` chỉ chứa chỗ giữ chỗ `__TVDL_SALT__`; `npm run build` thay nó bằng biến môi trường `TVDL_SALT`.
- Tạo khóa: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, rồi đặt vào Vercel / Cloudflare > Environment Variables với tên `TVDL_SALT`.
- Build trên CI mà thiếu `TVDL_SALT` sẽ **báo lỗi và dừng**, để không phát hành nhầm bản dùng khóa dev.
- Chạy trực tiếp từ mã nguồn (không build) dùng khóa dev tạm, save của bản dev không dùng được cho bản phát hành.
- Đặt một lần rồi giữ nguyên: đổi khóa thì mọi save đã ký bằng khóa cũ bị coi là hỏng. Khóa cũ từng nằm trong lịch sử git công khai nên **đã coi như lộ**.

| Lớp bổ sung | Tác dụng |
|---|---|
| Bản sao lưu tự động (`tu_tien_save_v2_bak`, làm mới tối đa 5 phút/lần) | Save bị hỏng hoặc bị từ chối thì khôi phục được bản hợp lệ gần nhất bằng một nút ở màn tạo nhân vật |
| Giữ lại dữ liệu bị từ chối (`..._rejected`) | Không âm thầm mất dữ liệu khi chữ ký sai |
| Báo lỗi khi không ghi được (bộ nhớ đầy, chế độ riêng tư) | Trước đây lỗi ghi bị bỏ qua im lặng; nay có thông báo và chỉ báo "Đã lưu / Chưa lưu được" trên thanh trên cùng |
| Chỉ một tab được ghi save | Tab thứ hai ghi save thì tab cũ tự dừng, tránh ghi đè lẫn nhau và cộng dồn tu vi vắng mặt ở nhiều tab |
| Nhập dữ liệu có xem trước + xác nhận, giới hạn 1 MB | Không ghi đè save chỉ bằng một cú bấm; chặn dữ liệu quá lớn |

Kiểm thử tự động: `npm test` (SHA-256 và HMAC đối chiếu `node:crypto` và RFC 4231, phát hiện sửa save, sao lưu và khôi phục, lỗi ghi, chặn đa tab, làm sạch dữ liệu, ô nhiễm prototype).

**Muốn chống gian lận thật sự** (bảng xếp hạng, đua top, mua bán) thì phải có máy chủ: server giữ khóa, nhận hành động của người chơi, tự tính kết quả và lưu save. Khi đó client chỉ hiển thị.

## 2. Che mã nguồn (`npm run build`)
- Gộp + nén + làm rối toàn bộ `js/` thành một file `dist/app.<hash>.js`, chuỗi bị tách và mã hóa base64.
- `dist/` chỉ chứa thứ cần chạy: **không** có `assets_src/`, `tools/`, `*.bat`, `*.sh`, README, `.git`.
- Làm rối chỉ là rào cản, không phải mã hóa: ai kiên nhẫn vẫn đọc được bằng DevTools.

## 3. Quan trọng: repo GitHub đang công khai
Nếu repo **public** thì toàn bộ mã gốc ai cũng xem được trên GitHub, bất kể bạn làm rối bản deploy. Hãy:
1. Chuyển repo sang **Private** (Settings → General → Danger Zone → Change visibility).
2. Deploy bằng **Cloudflare Pages / Netlify / Vercel** nối với repo private, lệnh build `npm run build`, thư mục xuất bản `dist`.
   (GitHub Pages cho repo private cần gói trả phí; nếu dùng Pages, hãy đẩy riêng `dist/` sang một repo public khác.)
3. Không commit khóa, token hay mật khẩu vào repo. Nếu từng commit, hãy coi như đã lộ và đổi.

## 4. Header bảo mật
`_headers` (Cloudflare/Netlify) và `vercel.json` đặt cùng một bộ header: CSP chặt (`script-src 'self'`, **không còn `'unsafe-inline'` cho style**, không kết nối ra ngoài, không worker, không iframe, `require-trusted-types-for 'script'`, `upgrade-insecure-requests`), HSTS, `nosniff`, `no-referrer`, COOP/CORP `same-origin`, `X-Frame-Options: DENY`. `index.html` cũng có CSP dạng thẻ `<meta>` để bản chạy trực tiếp vẫn được bảo vệ phần nào. Mã nguồn không dùng `innerHTML` / `eval`, và bản build đã được thử chạy dưới đúng bộ header này.

## 5. Giới hạn còn lại (nói thẳng)
- Người đọc được bundle vẫn có thể lấy khóa ký và tự ký save. Làm rối chỉ làm chậm họ.
- Chỉnh đồng hồ máy tiến lên vẫn nhận được thời gian vắng mặt (tối đa 2 giờ mỗi lần). Chỉ có máy chủ mới chặn được.
- Sao chép save cũ về lại (quay ngược tiến trình) không thể phát hiện nếu không có máy chủ.

## 6. Tài khoản và lưu trên máy chủ (Supabase)
**Đã có:**
- Dữ liệu người chơi nằm trong bảng có **Row Level Security**: mỗi tài khoản chỉ đọc được dòng của mình; client **không có quyền insert/update/delete trực tiếp**, chỉ ghi được qua hàm `save_game()` (kiểm tra đăng nhập, kiểu và kích thước dữ liệu, tần suất, và số phiên bản để không đè dữ liệu của thiết bị khác). Đã kiểm thử trên Postgres thật: người dùng B không thấy dữ liệu của A, `anon` bị chặn cả đọc lẫn ghi, ghi trực tiếp vào bảng bị từ chối, xóa tài khoản thì xóa luôn dữ liệu.
- Chỉ dùng khóa **anon / publishable** (công khai theo thiết kế). Build từ chối `service_role` và `sb_secret_`; `SUPABASE_URL` phải là https (trừ localhost khi thử).
- CSP vẫn chặt: `connect-src` chỉ mở đúng một địa chỉ dự án Supabase.
- Đăng ký không tiết lộ email nào đã tồn tại (khi bật Confirm email). Đăng xuất xóa bản lưu tạm để không lộ dữ liệu sang người dùng kế tiếp trên cùng trình duyệt.
- Dữ liệu tải về từ máy chủ không được tin: vẫn qua `cleanPlayer()`; dữ liệu trên máy đã bị từ chối thì không bao giờ được đẩy lên máy chủ.

**Giới hạn (nói thẳng):**
- **Game vẫn do client quyết định.** Máy chủ chỉ kiểm tra hình thức dữ liệu, không biết nó có "hợp lệ theo luật chơi" hay không; người dùng biết gọi API vẫn có thể ghi một nhân vật mạnh bất thường lên chính tài khoản của họ (HMAC trên máy không giúp được vì khóa nằm trong bundle). Điều này không tệ hơn trước khi có tài khoản, nhưng **đừng dựng bảng xếp hạng hay tính năng cạnh tranh trên dữ liệu này**. Muốn chống gian lận thật phải chuyển logic tính tiến trình sang máy chủ (Edge Function / hàm Postgres).
- Phiên đăng nhập (access + refresh token) lưu trong `localStorage`, giống SDK chính thức của Supabase. Một lỗ hổng XSS sẽ lộ được phiên, nên CSP chặt, Trusted Types và việc không dùng `innerHTML` là lớp bảo vệ chính.
- Chưa có CAPTCHA khi đăng ký, chưa có chức năng xóa tài khoản trong game (xóa user ở Supabase Dashboard sẽ xóa dữ liệu theo). Cả hai cần thêm Edge Function hoặc cấu hình riêng.
- Client đã kiểm thử với Supabase **giả** (bám sát API Auth / PostgREST) và SQL kiểm thử trên Postgres thật, nhưng chưa chạy trên một dự án Supabase thật. Lần đầu triển khai hãy thử đăng ký, đăng nhập, lưu, đăng xuất trên bản staging.
