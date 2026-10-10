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

Đổi `SALT` trong `js/security.js` thành chuỗi riêng của bạn trước khi phát hành (đổi xong, save cũ sẽ bị coi là hỏng).

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
`_headers` (Cloudflare/Netlify) và `vercel.json` đặt CSP chặt (`script-src 'self'`, không cho kết nối ra ngoài, không cho nhúng iframe), `nosniff`, `no-referrer`... `index.html` cũng có CSP dạng thẻ `<meta>` để bản chạy trực tiếp vẫn được bảo vệ phần nào.
