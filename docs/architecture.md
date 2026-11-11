# Kiến trúc Hư Giới — Edge production

> Trạng thái: Hiện hành.

```text
Browser ──> Cloudflare Static Assets (dist/)
  ├── HTTPS ──> Supabase Auth (direct, JWT)
  └── HTTPS ──> Supabase Edge Function api (Deno)
                       └── transaction pooler :6543 ──> Postgres schema game
```

**Frontend:** `client/config.js` đặt `HU_API_BASE` trỏ tới Edge API và `HU_AUTH_MODE='direct'`. `client/session/remote-session.js` gửi intent, requestId, revision và bearer JWT; không gửi state/time/RNG tin cậy. `wrangler.jsonc` chỉ phục vụ `dist/`; `_headers` được build thành `dist/_headers`.

**Backend:** `supabase/functions/api/index.ts` kiểm JWT, consent, CORS và route; `tools/build-edge.cjs` bundle `server/`, `engine/`, `data/`. `server/services/player-service.js` xử lý gameplay, còn `server/repositories/postgres-players.js` dùng transaction và receipt. `game` có RLS, không được expose Data API; các bảng cấm quyền `anon`/`authenticated`.

**Gameplay:** state V9 tại `engine/state/player.js`; protocol v2, 48 lệnh tại `engine/protocol/commands.js`. Giữ luật từ `engine/` và `data/`; không quyết P0/P1 thay chủ dự án. Nhịp heartbeat và grace lấy từ `server/presence-config.js` và backend phản hồi cho client. Offline và tab ẩn không tích lũy.

**Dev/legacy:** `server/main.js` và `server/repositories/sqlite-players.js` chỉ dùng Node/SQLite dev/test. `LocalSession` (legacy/dev-only) và `LocalStore` (legacy/dev-only) không thuộc gói frontend.

**Trạng thái UI bản hiện hành:** `client/ui/core.js` bật `release.chat` và `release.ranking`. Chat có 4 kênh (Thế giới, Tông môn, Đạo hữu, Đạo lữ), gửi và nhận qua `client/session/chat-session.js` + `supabase/functions/api/social.ts`, yêu cầu JWT và consent; bảng xếp hạng người chơi thật theo Lực chiến hoặc Cảnh giới. Các tương tác Tri kỷ, Luận kiếm, Đấu giá và hoạt động NPC/tông môn mô phỏng **không** trở thành PvP/multiplayer thực. Khi chết và bắt đầu lại, nhân vật được khởi tạo lại từ đầu; không hồi sinh nhân vật cũ. Không nhầm tính năng xã hội thật với cơ chế NPC mô phỏng.

Nguồn chi tiết: [runbook Edge](edge-deployment.md), [bảo mật](security.md), [hợp đồng engine](engine-contract.md), [Gameplay V9](gameplay-v9.md), [Thiên Mệnh Các](thien-menh-cac.md), [sổ quyết định](gameplay-decisions.md).
