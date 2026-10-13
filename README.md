# Thiên Vân Đại Lục

Game tu tiên idle theo **thời gian thật** chạy trên trình duyệt, viết bằng HTML/CSS/JavaScript thuần.

Production: `https://hugioi.vercel.app`

Định hướng cốt lõi của dự án là mỗi nhân vật là một **kiếp tu hành có lịch sử, lựa chọn, nhân quả và di sản riêng**; thời gian, thọ nguyên và tọa hóa là một phần thật của gameplay.

## Repo trong hệ sinh thái

```text
zeplaovn/Hu-gioi            game + backend migrations + tests
zeplaovn/Hu-gioi-dashboard  Admin Console
zeplaovn/Hu-gioi-wiki       player wiki + public roadmap
```

Không copy schema/RPC sang dashboard hoặc wiki. Database source of truth nằm trong repo game.

## Chạy local

Yêu cầu Node.js 18+ cho dev tooling.

```bash
npm install
npm run serve
```

Sau đó mở:

```text
http://localhost:8000
```

Game source vẫn là static web app; Node được dùng cho build, test và tooling.

## Scripts

```bash
npm run serve    # static dev server
npm test         # Node/client regression tests
npm run build    # production build -> dist/
npm run mock     # mock Supabase cho phát triển/test cục bộ
```

Các simulation/asset tool khác nằm trong `scripts/` và không phải runtime dependency.

## Cấu trúc mã nguồn

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
  core/             player state, game loop, progression core
  systems/          gameplay systems
  ui/               screens, rendering, chat, UX
  online/           Supabase/Auth/cloud/admin bridge
  infrastructure/   assets, security, cross-cutting concerns
  main.js
assets/              runtime assets
assets_src/          source assets cho pipeline tạo/cắt asset
scripts/             build/dev/simulation/asset tools
tests/               JS/client tests
supabase/
  migrations/        database/RPC/RLS source of truth
  tests/             SQL/RLS/RPC tests
docs/                engineering docs
```

Chi tiết boundary và hướng scale project: `docs/ARCHITECTURE.md`.

Quy ước development/cleanup/migration: `docs/DEVELOPMENT.md`.

## Gameplay chính

Game hiện có các nhóm hệ thống lớn:

- tu luyện idle theo thời gian thật;
- cảnh giới/tầng và đột phá;
- thọ nguyên, tuổi và tọa hóa;
- linh căn/ngũ hành;
- kỳ ngộ;
- bí cảnh;
- linh điền;
- luyện đan, vẽ phù, luyện khí;
- tông môn, nhiệm vụ, chức vị, kho;
- thành tựu/Thiên Mệnh/meta progression;
- tài khoản Supabase, cloud save, leaderboard và World Chat;
- banner server và maintenance mode.

Tài liệu gameplay/public roadmap được duy trì ở repo `Hu-gioi-wiki` thay vì tiếp tục nhồi số liệu cân bằng vào README kỹ thuật này.

## Supabase

Game dùng Supabase cho Auth, cloud save, leaderboard, chat, presence và Admin Console backend.

**Không chạy migration theo danh sách copy trong README này.** Danh sách chuẩn và luôn cập nhật nằm tại:

```text
supabase/README.md
```

Database migration source of truth:

```text
supabase/migrations/
```

Nguyên tắc:

- migration production cũ không sửa lại để "cho đẹp";
- thay đổi schema/RPC bằng migration mới;
- browser chỉ dùng public anon/publishable config;
- không đưa `service_role`/secret key/database password vào frontend.

## Admin Console và server control

Admin Console nằm ở repo riêng `Hu-gioi-dashboard`.

Game client chỉ có bridge an toàn:

```text
js/online/admin_bridge.js
```

Bridge đọc các contract cần cho player như:

- presence heartbeat;
- `server_status()`;
- banner ticker;
- maintenance gate.

Authorization admin thật nằm trong PostgreSQL/RPC/RBAC, không nằm trong game JavaScript.

## Build configuration

Production build có thể dùng các environment variable tùy feature/config hiện hành, gồm:

```text
TVDL_SALT
SUPABASE_URL
SUPABASE_ANON_KEY
HCAPTCHA_SITEKEY
```

Không commit `.env` hoặc secret vào Git.

`dist/` là build output và được ignore.

## Security

Threat model hiện tại: `SECURITY.md`.

Điểm quan trọng nhất: browser là môi trường không đáng tin cậy. Obfuscation/chữ ký local giúp tăng độ khó và bảo vệ integrity cơ bản, nhưng không thay thế server-authoritative logic cho economy/PvP/competition có giá trị.

## Tests

Client regression tests:

```bash
npm test
```

SQL/RLS/RPC tests nằm trong:

```text
supabase/tests/
```

Không coi build thành test gameplay; thay đổi logic quan trọng nên có regression test khi có thể.

## Engineering docs

```text
docs/README.md
  ├─ ARCHITECTURE.md
  └─ DEVELOPMENT.md
SECURITY.md
supabase/README.md
```

## Quy tắc repo hygiene

- không commit file `temp`, `backup`, redeploy trigger hoặc roadmap `.txt` ở root;
- roadmap public thuộc wiki;
- SQL production thuộc `supabase/migrations/`;
- build output thuộc `dist/` và không commit;
- asset runtime ở `assets/`, asset source ở `assets_src/`;
- không xóa asset/migration chỉ vì tên trông cũ — phải kiểm tra reference và production history trước.

## Hướng scale

Hiện cấu trúc `core / systems / ui / online / infrastructure` vẫn phù hợp và chưa cần framework.

Khi feature lớn hơn, ưu tiên:

1. tách responsibility trong cấu trúc hiện tại;
2. tách feature lớn thành module/thư mục riêng khi có ownership rõ;
3. tăng test coverage và API boundary;
4. sau đó mới cân nhắc ES modules/bundler/framework nếu thực sự giải quyết vấn đề cụ thể.

Xem `docs/ARCHITECTURE.md` để biết tiêu chí refactor.
