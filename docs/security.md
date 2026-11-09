# Bảo mật và bảo vệ mã nguồn

## Giới hạn cần biết

Game chạy hoàn toàn trong trình duyệt (`data/`, `engine/`, `client/` là JavaScript tải về máy người chơi). **Không có cách nào giấu tuyệt đối mã đã gửi tới trình duyệt**: nén hay làm rối chỉ làm khó, không ngăn được. `client/platform/content-guard.js` (chặn chuột phải, F12, Ctrl+S...) cũng chỉ là rào cản giao diện, người dùng vẫn mở được DevTools hoặc tải file trực tiếp.

Cách duy nhất để một phần luật chơi và dữ liệu không rời máy chủ là chuyển chúng sang server (xem [backend-plan.md](backend-plan.md)). Đồng thời đó cũng là cách chống sửa bản lưu: bản lưu `localStorage` hiện sửa được tự do.

## Những gì đã được siết

| Hạng mục | Cách làm |
|---|---|
| Máy chủ tĩnh `npm start` | Allowlist trong `server/http/static.js`: chỉ `index.html`, `css/`, `client/`, `engine/`, `data/`, `media/`. Không phân biệt hoa/thường, chặn `..`, `\`, byte rỗng, symlink thoát gốc, file ẩn, `.md`, `.map`, `.xlsx`, `.csv`, `.html` trong `media/`. |
| Header bảo mật | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP gắn trên mọi phản hồi (kể cả 404). Cùng nội dung với `_headers` cho Cloudflare Pages/Netlify. |
| Bảng thiết kế | `media/assets/enemy.xlsx`, `npc.xlsx`, `vat_pham.xlsx`, `Doi_Chieu_Ten_Anh.csv`, `tra_cuu_item.html`, `bang_tra_cuu.json` không client nào nạp nên không phục vụ và không vào `dist/`. |
| Bản đưa lên host | `npm run build` tạo `dist/` chỉ chứa file chạy game. `npm run build:min` xóa chú thích và nén JS/CSS (cần `esbuild`). Xuất bản **thư mục `dist/`**, không xuất bản gốc repo. |
| Kiểm thử | `tests/static-security.test.cjs` kiểm các đường dẫn bị chặn, thoát thư mục và header. |

## Triển khai

- Cloudflare Pages / Netlify / Vercel: build command `npm run build:min`, output directory `dist`. Nếu để output là gốc repo thì `server/`, `tests/`, `docs/`, `tools/` và các bảng `.xlsx` sẽ bị tải được, vì `_headers` không chặn được file.
- Tắt chỉ mục thư mục (directory listing) và không bật source map trên host.
- nginx: chỉ `root` vào `dist/`.

## Việc còn lại (cần quyết định thiết kế)

1. Chuyển luật nhạy cảm và bảng cân bằng sang server (`PlayerService`), client chỉ gửi lệnh và hiển thị state.
2. Ký hoặc kiểm bản lưu ở server để chặn sửa `localStorage`.
3. Kiểm lịch sử git xem từng có file bí mật hay gói nhị phân bị commit (`.gitignore` có nhắc `.deb`); nếu có secret thì phải xoay khóa, xóa khỏi lịch sử không đủ.
4. Khi có tài khoản: token trong bộ nhớ, refresh token HttpOnly, rate limit, theo checklist ở `backend-plan.md`.
