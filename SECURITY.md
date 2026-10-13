# Security Model — Thiên Vân Đại Lục

Game chạy trong browser nên **client luôn là môi trường không đáng tin cậy**. Mã nguồn, state runtime, localStorage và request từ browser đều có thể bị người chơi quan sát hoặc sửa.

Mục tiêu bảo mật của project là:

- bảo vệ tài khoản và dữ liệu khỏi truy cập trái phép;
- hạn chế ghi dữ liệu trực tiếp ngoài contract RPC;
- tách quyền player/admin rõ ràng;
- giảm rủi ro XSS/token theft;
- ghi audit cho thao tác quản trị;
- không giả vờ rằng client-side obfuscation có thể chống cheat tuyệt đối.

## 1. Trust boundaries

```text
Browser game
  ↓ public Supabase config + Auth session
Player-scoped RPC / RLS
  ↓
Postgres

Browser admin dashboard
  ↓ Supabase Auth
Admin RPC
  ↓ RBAC + audit
Postgres
```

Không có `service_role`, database password, JWT signing secret hay secret server-side nào được phép xuất hiện trong browser bundle/config.

## 2. Local save integrity

`js/infrastructure/security.js` cung cấp các lớp bảo vệ local như chữ ký save, validation, backup, rejected-save preservation và chặn đa tab.

Các lớp này giúp chống:

- sửa tay dữ liệu đơn giản;
- save hỏng;
- ghi đè giữa nhiều tab;
- dữ liệu vô lý rõ ràng;
- mất dữ liệu im lặng.

Nhưng chúng **không phải anti-cheat tuyệt đối**. Bất kỳ khóa hay logic nào chạy trong browser đều có thể bị người dùng có đủ thời gian phân tích.

## 3. Server save và RLS

Player data dùng Supabase/Postgres với Row Level Security.

Nguyên tắc:

- player chỉ đọc dữ liệu được phép của chính mình;
- client không ghi trực tiếp bảng save;
- write đi qua `save_game()`;
- RPC kiểm tra auth, kiểu dữ liệu, kích thước, revision/conflict và tính hợp lý cơ bản;
- dữ liệu từ server vẫn phải được coi là input và được clean/validate ở client trước khi dùng.

`save_game()` không biến gameplay thành server-authoritative. Hiện nhiều luật tiến trình vẫn do client tính, nên dữ liệu cạnh tranh/economy quan trọng không nên tin tuyệt đối nếu chưa chuyển computation sang backend.

## 4. Chat

World Chat ghi qua `send_chat()` thay vì insert trực tiếp.

RPC chịu trách nhiệm:

- auth check;
- normalize/length limit;
- rate limit;
- lấy tên hiển thị từ dữ liệu server;
- maintenance guard khi server đóng.

Admin moderation dùng RPC riêng có RBAC/audit.

## 5. Admin Console

Admin Console là website riêng, không phải một "admin mode" trong game client.

Authorization thật nằm ở:

```text
public.admin_users
private.current_admin_role()
private.require_admin()
admin RPC
```

Role hiện tại:

```text
viewer
moderator
admin
owner
```

Không dùng email check hoặc nút ẩn trong JavaScript làm security boundary.

Các action quan trọng như banner, maintenance, admin chat/moderation phải đi qua RPC và ghi `admin_audit_log` khi phù hợp.

## 6. Maintenance mode

`server_status()` công khai trạng thái an toàn cần cho game client.

Khi maintenance bật:

- player thường bị gate phía UI;
- player write RPC quan trọng bị backend guard chặn;
- dashboard vẫn phải hoạt động để admin tắt maintenance;
- admin/owner bypass chỉ được phép theo contract migration production hiện hành.

Client gate chỉ là UX. Backend guard mới là lớp ngăn player write thực sự.

## 7. Secrets và build

Public browser config hợp lệ:

```text
SUPABASE_URL
SUPABASE_ANON_KEY / publishable key
HCAPTCHA_SITEKEY
```

Secret không được đưa vào browser:

```text
service_role
Supabase secret key
database password
JWT signing secret
hCaptcha secret
```

Build script phải từ chối cấu hình nguy hiểm khi có thể phát hiện.

Nếu một secret từng bị commit vào Git, coi như secret đó đã lộ và rotate; xóa file ở commit mới không làm secret biến mất khỏi lịch sử.

## 8. Auth session và XSS

Auth session được browser lưu để duy trì đăng nhập. Vì vậy XSS là rủi ro quan trọng.

Các lớp giảm thiểu gồm:

- CSP;
- tránh `eval` và script inline tùy ý;
- sanitize/escape output;
- hạn chế dùng `innerHTML` với dữ liệu không tin cậy;
- Trusted Types/build policy khi áp dụng;
- security headers ở hosting layer.

CAPTCHA giúp giảm bot/abuse nhưng không thay thế authentication hoặc authorization.

## 9. Security headers

`vercel.json`, `_headers` và CSP trong `index.html` là một phần của deployment security.

Khi thêm external origin mới cho script/connect/frame:

1. xác nhận feature thực sự cần origin đó;
2. mở đúng directive nhỏ nhất;
3. không đổi CSP thành wildcard rộng để "cho chạy";
4. kiểm tra lại hCaptcha/Supabase connectivity sau thay đổi.

## 10. Economy và PvP tương lai

Bất kỳ hệ thống có giá trị cạnh tranh thật như Auction/Trade/PvP reward phải được thiết kế server-authoritative.

Không được làm kiểu:

```text
client trừ item A
client cộng item B
client update hai user riêng lẻ
```

Thay vào đó cần transaction phía server/RPC:

```text
validate ownership
validate balance/state
lock relevant rows
apply transfer atomically
write economy ledger/audit
commit
```

## 11. Known limitations

- Browser code có thể bị reverse-engineer.
- Client-side save signature không chống được attacker kiểm soát runtime.
- Gameplay hiện chưa hoàn toàn server-authoritative.
- Leaderboard dựa trên dữ liệu save có validation giới hạn, không nên dùng cho phần thưởng có giá trị lớn nếu chưa tăng trust model.
- Clock manipulation/offline progression chỉ có thể được kiểm soát triệt để khi thời gian và tiến trình chuyển sang server.

## 12. Tests và source of truth

- JS/client tests: `tests/`
- SQL/RLS/RPC tests: `supabase/tests/`
- migration source of truth: `supabase/migrations/`
- database setup: `supabase/README.md`
- architecture: `docs/ARCHITECTURE.md`
- development hygiene: `docs/DEVELOPMENT.md`

Khi sửa một lỗi security có thể tái hiện ổn định, nên thêm regression test nếu có thể.
