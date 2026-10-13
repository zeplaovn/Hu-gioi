# Kiến trúc mã nguồn — Thiên Vân Đại Lục

Tài liệu này mô tả cách tổ chức code hiện tại và hướng mở rộng khi game lớn hơn. Mục tiêu là giữ dependency rõ ràng, tránh một file trở thành nơi chứa mọi logic và tránh đổi cấu trúc hàng loạt không cần thiết.

## 1. Cấu trúc hiện tại

```text
index.html
css/
  base.css
  game.css
  features.css
  responsive.css
  chat.css
  server-banner.css
js/
  core/             dữ liệu nền, Player, game loop, tu luyện
  systems/          các hệ thống gameplay độc lập
  ui/               render, screen, guide, chat, UX
  online/           Supabase config/cloud/auth/admin bridge
  infrastructure/   asset loader, security, cross-cutting helpers
  main.js            entrypoint
assets/              asset runtime
assets_src/          asset nguồn dùng cho pipeline tạo/cắt asset
scripts/             build, serve, mock, simulation, asset tooling
tests/               Node tests
supabase/
  migrations/        nguồn chuẩn schema/RPC/RLS
  tests/             SQL tests
```

Cách chia này phù hợp với quy mô hiện tại và **chưa cần đổi sang framework** chỉ để đổi folder.

## 2. Dependency direction

Quy ước mong muốn:

```text
core/data
   ↓
core + systems
   ↓
ui

online ─────→ core/state qua API công khai
infrastructure ─→ được dùng bởi nhiều lớp, không chứa gameplay riêng
```

- `core/` không phụ thuộc DOM nếu không thật sự cần.
- `systems/` chứa luật của từng hệ thống gameplay; tránh gọi trực tiếp code của hệ thống khác nếu có thể đi qua API trên `TT`.
- `ui/` được phép đọc state và gọi action, nhưng không nên chứa công thức cân bằng quan trọng.
- `online/` chỉ xử lý Auth, sync, server status và network boundary. Không đặt luật gameplay client-only vào đây.
- `infrastructure/` chỉ dành cho concern dùng xuyên hệ thống như security, assets, persistence helper.

## 3. Khi nào tách một feature thành nhiều file

Không tách file chỉ vì dài. Tách khi một feature có từ hai trách nhiệm độc lập trở lên, ví dụ:

```text
feature data/config
feature state + rules
feature DOM/render
feature network adapter
```

Với feature lớn mới, có thể tạo dần:

```text
js/features/<feature>/
  data.js
  logic.js
  ui.js
```

Chỉ dùng `features/` khi feature thực sự đủ lớn. Feature nhỏ tiếp tục nằm trong `systems/` để tránh cây thư mục quá vụn.

Các ứng viên có thể tách trong tương lai nếu tiếp tục tăng mạnh: bí cảnh, tông môn, thành tựu/luân hồi, economy/auction.

## 4. Quy tắc kích thước và trách nhiệm

Dấu hiệu cần refactor:

- một file phải sửa cho nhiều feature không liên quan;
- một hàm vừa tính luật, vừa mutate state, vừa render DOM;
- một file có nhiều nhóm state toàn cục không liên quan;
- thêm feature mới buộc phải biết quá nhiều implementation detail của feature cũ;
- test một luật gameplay phải dựng gần như toàn bộ UI.

Không dùng số dòng như luật cứng. Số dòng chỉ là tín hiệu để review.

## 5. Script loading và module hóa

Hiện game dùng nhiều `<script>` truyền thống và namespace `TT`, nên **thứ tự load trong `index.html` là một phần của runtime contract**.

Vì vậy:

- không di chuyển/đổi tên hàng loạt file mà không kiểm tra thứ tự load;
- file mới phải khai báo dependency rõ trong comment hoặc docs;
- refactor sang ES modules chỉ nên làm thành một đợt riêng, kèm build/test đầy đủ;
- không trộn nửa CommonJS/nửa ESM trong browser runtime.

Nếu sau này chuyển hoàn toàn sang module/bundler, mục tiêu hợp lý là `src/` + import graph thay vì `<script>` thủ công. Chưa cần làm ở giai đoạn hiện tại.

## 6. Online và security boundary

```text
Browser game
  ├─ public Supabase URL + anon/publishable key
  ├─ Auth session
  ├─ game RPC
  └─ server_status / presence

Admin dashboard
  └─ audited admin RPC + RBAC

Postgres/Supabase
  ├─ RLS
  ├─ SECURITY DEFINER RPC
  └─ admin audit
```

`service_role`, database password, JWT signing secret và các secret server-side không được xuất hiện trong browser repo/config.

Nguồn chuẩn database duy nhất: `supabase/migrations/` trong repo này.

## 7. Asset organization

- `assets/`: chỉ chứa file runtime cần deploy.
- `assets_src/`: sheet/source phục vụ tạo asset, không phải runtime dependency.
- script tạo/cắt asset nằm trong `scripts/`.
- không xóa asset có tên gần giống nhau chỉ vì nghi trùng; phải search mapping trong `js/infrastructure/assets.js` và CSS/JS trước.

Khi asset tăng lớn, nên thêm manifest/source metadata thay vì dựa vào tên file để đoán file nào còn dùng.

## 8. Database migrations

- migration đã dùng ở production là lịch sử bất biến; sửa bằng migration mới thay vì chỉnh file cũ.
- tên file: `YYYYMMDDHHMMSS_mo_ta_ngan.sql`.
- migration phải idempotent khi có lý do compatibility rõ ràng, không lạm dụng `if exists` để che lỗi schema.
- xem `supabase/README.md` cho thứ tự và bootstrap.

## 9. Test placement

```text
tests/              test JS/client
supabase/tests/     test SQL/RLS/RPC
scripts/            công cụ dev/simulation, không phải test assertion chính
```

Khi sửa một bug có thể tái hiện ổn định, ưu tiên thêm test regression trước hoặc cùng commit fix.

## 10. Khi project lớn hơn

Thứ tự nâng cấp được khuyến nghị:

1. tiếp tục tách responsibility trong cấu trúc hiện tại;
2. tách feature lớn thành thư mục riêng khi thực sự cần;
3. chuẩn hóa event/state API giữa feature;
4. tăng test coverage cho luật gameplay và RPC;
5. chỉ sau đó cân nhắc ES modules/bundler hoặc framework UI.

Không nên đổi framework chỉ để giải quyết vấn đề tổ chức file; dependency boundary và ownership của state quan trọng hơn tên công nghệ.
