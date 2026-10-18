# Kiến trúc mã nguồn — Thiên Vân Đại Lục

## Cấu trúc chuẩn

```text
index.html
styles/
  base.css
  game.css
  features.css
  responsive.css
  chat.css
  server-banner.css
src/
  bootstrap/
    main.js
  game/
    core/
      data.js
      player.js
      game.js
      train.js
    features/
      idle_data.js
      idle.js
      farm.js
      crafts.js
      minigames.js
      sect.js
      meta.js
  platform/
    assets.js
    security.js
  services/
    config.js
    cloud.js
    auth.js
    admin_bridge.js
  ui/
    ui.js
    scene.js
    screens.js
    guide.js
    chat.js
    ux.js
assets/
assets_src/
scripts/
tests/
supabase/
```

`src/` là source tree runtime duy nhất. Không tạo lại `js/` song song.

## Boundary

### `src/game/core`
State/model và vòng đời gameplay nền. Không đặt Auth, Supabase hoặc UI-specific behavior ở đây nếu không cần thiết.

### `src/game/features`
Luật của từng hệ thống gameplay. Feature lớn được tách tiếp thành thư mục riêng khi có nhiều trách nhiệm độc lập.

### `src/ui`
Render DOM, screen navigation, guide/chat/UX. UI có thể gọi action của game nhưng không nên sở hữu công thức cân bằng cốt lõi.

### `src/services`
Network boundary: Supabase config, Auth, cloud sync, presence/server status. Không đưa quyền admin thật vào client.

### `src/platform`
Concern dùng xuyên hệ thống như asset registry và local integrity/security.

### `src/bootstrap`
Wiring cuối cùng. Không biến entrypoint thành nơi chứa business logic.

## Dependency direction

```text
game/core ← game/features
     ↓          ↓
          ui

platform → dùng xuyên lớp
services → network/server boundary
bootstrap → ghép các lớp và start app
```

Tránh dependency ngược từ core sang UI/services.

## Script loading

Runtime hiện vẫn dùng `<script>` truyền thống + namespace `TT`. Vì vậy thứ tự trong `index.html` là contract. Refactor sang ES modules/bundler phải là một đợt riêng có test/build/preview đầy đủ.

## Khi feature lớn hơn

Không tách file chỉ vì nhiều dòng. Tách khi có trách nhiệm rõ, ví dụ:

```text
src/game/features/sect/
  data.js
  state.js
  missions.js
  shop.js

src/game/features/meta/
  achievements.js
  reincarnation.js
  legacy.js
```

Các hotspot hiện cần ưu tiên khi tiếp tục mở rộng: `idle`, `meta`, `sect`, `game` và `auth`.

## Asset organization

- `assets/`: runtime/deploy.
- `assets_src/`: source sheet, không deploy.
- asset tooling ở `scripts/`.
- trước khi xóa asset phải kiểm tra registry/CSS/runtime references.

## Database

`supabase/migrations/` là source of truth duy nhất cho schema/RPC/RLS. Migration production đã áp dụng là lịch sử bất biến; thay đổi tiếp theo luôn dùng migration mới.

## Security boundary

```text
Browser game
  → public Supabase config
  → Auth session
  → player-safe RPC/server status

Admin dashboard
  → Supabase Auth
  → audited admin RPC/RBAC

Postgres
  → RLS + SECURITY DEFINER + audit
```

Không đưa `service_role`, DB password hoặc JWT signing secret vào browser.

## Tests

```text
tests/              JS/client regression
supabase/tests/     SQL/RLS/RPC
scripts/            dev/simulation/tooling
```

`tests/path_aliases.mjs` chỉ giữ compatibility cho các test cũ trong lúc test suite chưa đổi toàn bộ path fixture; runtime không dùng file này.
