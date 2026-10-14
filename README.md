# Thiên Vân Đại Lục

Game tu tiên idle theo **thời gian thật** chạy trên trình duyệt, viết bằng HTML/CSS/JavaScript thuần.

Production: `https://hugioi.vercel.app`

## Repo trong hệ sinh thái

```text
zeplaovn/Hu-gioi            game + backend migrations + tests
zeplaovn/Hu-gioi-dashboard  Admin Console
zeplaovn/Hu-gioi-wiki       player wiki + public roadmap
```

Database source of truth chỉ nằm trong repo game.

## Lưu dữ liệu

Game dùng mô hình **database-only persistence**:

```text
Đăng nhập
   ↓
Supabase player_saves
   ↓
RAM của tab đang chơi
   ↓
save_game() RPC
   ↓
Supabase player_saves
```

- `player_saves` trên Supabase là nguồn dữ liệu bền vững duy nhất của tiến trình game.
- Save nhân vật và meta progression không còn được lưu vào `localStorage`.
- Khi mở game, dữ liệu được tải từ database trước khi tạo `Game`.
- Trong lúc chơi, state tồn tại trong bộ nhớ của tab và được ghi lại qua `save_game()`.
- Khi revision trên máy chủ mới hơn, bản database thắng và client tải lại.
- Không còn chế độ chơi offline rồi đồng bộ sau.
- `localStorage` vẫn có thể được dùng cho phiên đăng nhập Supabase và preference UI nhỏ; chúng không phải gameplay save.

## Chạy local

Yêu cầu Node.js 18+ và cấu hình Supabase hợp lệ:

```bash
npm install
npm run serve
```

Các lệnh chính:

```bash
npm run serve
npm test
npm run build
npm run mock
```

## Cấu trúc mã nguồn

```text
index.html                    browser entrypoint
styles/                       stylesheet runtime
src/
  bootstrap/                  startup/entrypoint
  game/
    core/                     data, player, game loop, train
    features/                 idle, farm, crafts, sect, meta, minigames
    maps/                     registry + map module Hạ/Tiên/Thần Giới
  platform/                   assets + security + runtime memory store
  services/                   Supabase config/cloud/auth/admin bridge
  ui/                         screens, scene, guide, chat, UX
assets/                       runtime assets
assets_src/                   source sheets / asset pipeline input
scripts/                      build/dev/simulation/asset tools
tests/                        JS/client tests
supabase/
  migrations/                 database/RPC/RLS source of truth
  tests/                      SQL/RLS/RPC tests
docs/                         engineering docs
```

`src/` là nguồn runtime duy nhất. Không tạo lại cây `js/` cũ.

### Dependency direction

```text
game/core + game/features + game/maps
          ↓
          ui

platform  → shared browser concerns + runtime state adapter
services  → network/auth/server boundary
bootstrap → wiring cuối cùng
```

Game vẫn dùng namespace `TT` và `<script>` truyền thống; thứ tự load trong `index.html` vẫn là runtime contract cho đến khi có một đợt migration riêng sang ES modules.

## Thiên Vân Địa Đồ

Bản đồ được tách theo **đại thế giới** thay vì tiếp tục mở rộng trong một feature file:

```text
src/game/maps/registry.js
src/game/maps/ha_gioi.js
src/game/maps/tien_gioi.js
src/game/maps/than_gioi.js
src/game/maps/world_map_ui.js
```

- **Hạ Giới**: playable, gồm 9 khu vực theo progression hiện tại.
- **Tiên Giới**: module + preview asset độc lập; chưa bật gameplay để không thay đổi flow Phi Thăng trong phase map architecture.
- **Thần Giới**: module + preview asset độc lập; dành cho expansion sau Tiên Giới.
- Registry chung quản lý world/region/travel; gameplay riêng của từng thế giới phải tiếp tục tách thành module riêng.
- Asset runtime map đã tối ưu nằm trong `assets/maps/`; source parallax dung lượng lớn không được nhét nguyên vào production bundle.

Chi tiết kiến trúc: `docs/world-map-architecture.md`.

## Gameplay chính

- tu luyện idle theo thời gian thật;
- cảnh giới/tầng và đột phá;
- thọ nguyên, tuổi và tọa hóa;
- linh căn/ngũ hành;
- kỳ ngộ, bí cảnh, linh điền;
- Thiên Vân Địa Đồ với Hạ Giới và kiến trúc expansion Tiên Giới/Thần Giới;
- luyện đan, vẽ phù, luyện khí;
- tông môn;
- thành tựu/Thiên Mệnh/meta progression;
- Supabase Auth + database save + leaderboard + World Chat;
- banner server + maintenance mode.

Gameplay/public roadmap thuộc repo `Hu-gioi-wiki`.

## Supabase

Nguồn chuẩn:

```text
supabase/README.md
supabase/migrations/
```

Nguyên tắc:

- migration production cũ không sửa lại;
- thay đổi schema/RPC bằng migration mới;
- browser chỉ dùng public anon/publishable config;
- không đưa `service_role`, database password hoặc secret server-side vào frontend;
- `SUPABASE_URL` và `SUPABASE_ANON_KEY` là bắt buộc đối với build game DB-only.

## Admin Console và server control

Admin Console nằm ở repo `Hu-gioi-dashboard`.

Game bridge:

```text
src/services/admin_bridge.js
```

Bridge chỉ xử lý contract dành cho client như presence heartbeat, `server_status()`, banner ticker và chuyển hướng sang `maintenance.html` khi bảo trì. Admin vào game lúc bảo trì qua `staff.html` (cổng đăng nhập riêng); hai trang này là bundle độc lập trong `src/standalone/`, không nạp mã game. Authorization admin thật nằm trong PostgreSQL/RPC/RBAC.

## Build configuration

Các environment variable production hiện dùng:

```text
TVDL_SALT
SUPABASE_URL
SUPABASE_ANON_KEY
HCAPTCHA_SITEKEY
```

`npm run build` tạo `dist/`. Vercel Preview có thể build bằng dev salt để kiểm tra PR; Vercel Production vẫn bắt buộc `TVDL_SALT`. Supabase config là bắt buộc vì game không còn fallback sang local save.

## Security và tests

Threat model: `SECURITY.md`.

```bash
npm test
```

Map registry/travel có regression test riêng tại `tests/test_world_map.mjs`. SQL/RLS/RPC tests nằm trong `supabase/tests/`.

## Engineering docs

```text
docs/README.md
docs/ARCHITECTURE.md
docs/DEVELOPMENT.md
docs/REFACTOR_PLAN.md
docs/world-map-architecture.md
SECURITY.md
supabase/README.md
```

## Repo hygiene

- không commit file temp/backup/redeploy trigger;
- roadmap public thuộc wiki;
- SQL production thuộc `supabase/migrations/`;
- build output thuộc `dist/`;
- asset runtime ở `assets/`, source asset ở `assets_src/`;
- không xóa migration hoặc asset chỉ vì tên trông cũ; phải kiểm tra reference/history trước.
