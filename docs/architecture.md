# Kiến trúc Hư Giới — Edge production

> Trạng thái: Hiện hành. Đối chiếu mã nguồn `main` ngày 13/11/2026.

```text
Browser ──> Cloudflare Workers Static Assets (dist/)
  ├── HTTPS ──> Supabase Auth (direct, JWT)
  └── HTTPS ──> Supabase Edge Function api (Deno)
                       └── transaction pooler :6543 ──> PostgreSQL schema game
```

**Frontend:** `client/config.js` đặt `HU_API_BASE` trỏ tới Edge API và `HU_AUTH_MODE='direct'`. `client/session/remote-session.js` gửi intent, `requestId`, `expectedVersion` và bearer JWT; không gửi state, thời gian, RNG hoặc phần thưởng đáng tin cậy. `wrangler.jsonc` chỉ phục vụ `dist/`; `_headers` được build thành `dist/_headers`.

**Backend:** `supabase/functions/api/index.ts` kiểm JWT, consent, CORS, rate limit và route; `tools/build-edge.cjs` bundle `server/`, `engine/`, `data/`. `server/services/player-service.js` xử lý gameplay; `server/repositories/postgres-players.js` dùng transaction, row lock và receipt. Schema `game` có **13 bảng**, bật RLS, không expose Data API và không cấp quyền cho `anon`/`authenticated`.

**API:** **23 route** dưới `/api/v1` (bootstrap, 4 route chat, 1 route ranking, 2 route tạo nhân vật, pavilion, 3 route daily, 2 route mail, 3 route `/me/*`, 6 route theo player id). Chi tiết ở [SYSTEM](SYSTEM.md).

**Gameplay:** state V10 tại `engine/state/player.js`; protocol **v4**, **52 lệnh** tại `engine/protocol/commands.js`, thuộc 8 miền lệnh. Giữ luật từ `engine/` và `data/`; không tự quyết định P0/P1 thay chủ dự án. Nhịp heartbeat và grace lấy từ `server/presence-config.js` (20 giây/60 giây) và backend phản hồi cho client. Offline và tab ẩn không tích lũy.

**Dev/test:** không còn server Node/SQLite. Test dùng kho in-memory (`tests/helpers/memory-players.js`) và PGlite; `tools/online-ci-server.cjs` chỉ phục vụ Playwright CI.

**Trạng thái UI:** `client/ui/core.js` bật `release.chat` và `release.ranking`. Chat có 4 kênh (Thế giới, Tông môn, Đạo hữu, Đạo lữ), gửi/nhận qua `client/session/chat-session.js` + `supabase/functions/api/social.ts`, yêu cầu JWT và consent. Bảng xếp hạng người chơi thật theo Lực chiến hoặc Cảnh giới. Tri kỷ, Luận kiếm, Đấu giá và hoạt động NPC/tông môn vẫn là **mô phỏng**, không phải PvP/multiplayer thực.

Nguồn chi tiết: [runbook Edge](edge-deployment.md), [bảo mật](security.md), [hợp đồng engine](engine-contract.md), [vòng đời nhân vật](gameplay-v9.md), [Thiên Mệnh Các](thien-menh-cac.md), [sổ quyết định](gameplay-decisions.md).