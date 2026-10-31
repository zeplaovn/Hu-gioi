# Kế hoạch thiết kế backend — Hư Giới

> Trạng thái: đề xuất thiết kế, chưa triển khai. Engine chung đã sẵn sàng (`HU_GAME.READY === true`); `server/` vẫn là khung (xem [architecture.md](architecture.md), [engine-contract.md](engine-contract.md)); các mô tả "hiện có" trong tài liệu này tham chiếu cài đặt cũ ở commit `5f6b9bc`.
> Phạm vi: game chính trong repository này  
> Mục tiêu: đưa game idle tu tiên một người chơi hiện tại thành game online nhiều người chơi, server-authoritative, vẫn dùng chung bộ luật `engine/`.

---

## 0. Tóm tắt điều hành

### 0.1 Mục tiêu

- Giữ nguyên trải nghiệm idle: tu vi tăng theo thời gian, kể cả khi offline.
- Chuyển toàn bộ quyết định gameplay quan trọng lên server: thời gian, RNG, giá, phần thưởng, đột phá, bí cảnh, tông môn, giao dịch.
- Client chỉ gửi **ý định** (`type` + `payload`), không gửi state, thời gian, RNG, giá hay phần thưởng.
- Dùng chung `engine/rules`, `engine/protocol`, `engine/state` cho client và server; không fork luật game. `PlayerService` cần viết lại theo khung `server/services/player-service.js`.
- Mở rộng dần: online single-player → chat/presence → PvP/tông môn/thị trường → live ops.

### 0.2 Stack đề xuất

| Thành phần | Đề xuất | Ghi chú |
|---|---|---|
| Runtime | Node.js 20 LTS trở lên | Tái dùng trực tiếp `engine/*.js` và `data/*.js` (CommonJS) |
| HTTP API | Fastify | Nhẹ, schema validation, plugin, hiệu năng tốt |
| Database | PostgreSQL 16 | Nguồn sự thật cho account, player, receipt, outbox, social |
| Cache / realtime | Redis 7 | Presence, rate limit, leaderboard cache, pub/sub; không phải nguồn sự thật |
| Queue | `pg-boss` giai đoạn đầu, BullMQ khi cần | Worker outbox, mail, market, leaderboard |
| Auth | Provider abstraction; tự quản hoặc Supabase Auth | Không để client ghi state trực tiếp |
| Realtime | WebSocket giai đoạn 3 | MVP dùng HTTP polling + sync |
| Deploy | Docker + reverse proxy same-origin | Static client và API cùng origin |
| Observability | pino + Prometheus + OpenTelemetry | Log, metric, trace, alert |

### 0.3 Quyết định cốt lõi

1. **Server-authoritative**: mọi thay đổi state đi qua `PlayerService` + transaction database.
2. **Idle simulation lười**: không chạy tick 1 giây cho toàn bộ người chơi; tính catch-up khi có request và định kỳ bằng worker.
3. **PostgreSQL là nguồn sự thật**: Redis chỉ giữ dữ liệu tạm (presence, rate limit, cache bảng xếp hạng).
4. **REST cho gameplay, WebSocket cho realtime**: command/sync qua HTTP; chat/presence/notify qua WS ở giai đoạn 3.
5. **Một nhân vật / account / server** ở MVP; nhiều server là shard logic, không phải nhiều nhân vật cùng lúc.
6. **Snapshot đầy đủ ở v1**: dễ đúng, dễ debug; delta/patch chỉ thêm khi có số liệu chứng minh cần.
7. **Offline mode tách khỏi online**: bản offline vẫn chạy `file://`; bản online không ghi gameplay vào localStorage.
8. **Save offline nhập vào online là luồng riêng**, có kiểm tra và giới hạn, không dùng state client làm nguồn sự thật.

### 0.4 Phạm vi MVP

| Trong MVP | Ngoài MVP (giai đoạn sau) |
|---|---|
| Đăng ký/đăng nhập, refresh token, đăng xuất | OAuth Google/Apple, 2FA người chơi |
| Tạo nhân vật có preview do server gieo | Nhiều slot nhân vật, đổi tên có phí |
| Sync + 46 lệnh hiện có qua API | Chat thế giới, presence, bạn bè thật |
| Catch-up offline, chống gian lận thời gian | PvP thật, tông môn chung, thị trường |
| Revision, requestId, receipt, retry an toàn | Đấu giá realtime, world boss |
| Rate limit, log, metric, health check | Season pass, IAP, live ops |
| Postgres persistence + backup | Đa vùng, sharding, hot-state Redis |
| Bảng xếp hạng cơ bản (có thể sau MVP) | Moderation chat đầy đủ, CMS |

### 0.5 Thời gian dự kiến

Với 1 backend + 1 fullstack + 0.5 DevOps + 0.5 QA: **12–17 tuần** đến bản launch-ready. Nếu làm một mình: **5–7 tháng**. Chi tiết ở mục 14.

---

## 1. Hiện trạng workspace

### 1.1 Những gì đã có

| Khu vực | File / thành phần | Trạng thái |
|---|---|---|
| Dữ liệu | `data/*.js` | Giữ nguyên: cân bằng, công thức, vật phẩm, nhân vật, bản đồ, tông môn, bí cảnh |
| Luật game | `engine/rules/*.js` | Đủ 9 miền, đã cài đặt và có test hành vi |
| State | `engine/state/player.js` | Khung; cần schema V7 + normalize V4–V7 |
| Protocol | `engine/protocol/commands.js` | Hoàn chỉnh: 46 lệnh, validate, execute |
| Service | `server/services/player-service.js` | Khung giao diện: create/sync/command, revision, receipt |
| Repository | `server/repositories/player-repository.js` | Khung hợp đồng `transact/get/create` |
| Máy chủ | `server/main.js`, `server/http/*` | Chạy: file tĩnh + `/api/health` |
| Chat | `server/chat/chat-service.js` | Khung; client `chat-session.js` đã có |
| Client offline | `client/session/local-session.js`, `client/persistence/local-store.js` | LocalSession đồng bộ, localStorage |
| UI | `client/ui/*` | Gọi `UI.command(type, payload)` đồng bộ |
| Kiểm tra | `npm run check`, `npm test` | Cú pháp, ranh giới engine, hợp đồng lệnh, thứ tự script, hành vi 9 miền |
| Bảo mật tĩnh | `index.html`, `_headers` | CSP `connect-src 'self'`, hỗ trợ `file://` cho gameplay offline |

`npm test` hiện kiểm tra hợp đồng engine, hành vi 9 miền luật, chuyển bản lưu V4–V7, LocalSession và UI entry. Test contract server, concurrency, load và E2E trong lộ trình bên dưới vẫn là hạng mục cần bổ sung.

### 1.2 Khoảng trống so với online

- Chưa có engine, `PlayerService`, API gameplay HTTP/WebSocket, auth hoặc database bền vững; chat chưa có máy chủ.
- Kho lưu trữ đầu tiên (bộ nhớ) sẽ mất dữ liệu khi process dừng và chỉ khóa trong một process; chỉ dùng cho dev/test.
- `PlayerService` cần nhận đồng hồ và RNG qua tham số, rồi sang DB clock/seed theo người chơi.
- `UI.command` đang đồng bộ; `RemoteSession` bất đồng bộ sẽ cần refactor call site.
- Chưa có khái niệm account, session, player thuộc account, server/shard.
- Chưa có idempotency bền vững ngoài process, chưa có outbox/worker.
- Chưa có rate limit, audit, admin, observability, backup.
- Các tính năng social/PvP/đấu giá hiện tại vẫn là **mô phỏng theo từng nhân vật**, chưa phải dữ liệu chung giữa người chơi.
- CSP đang chặn mọi kết nối mạng; bản online cần CSP/CORS/origin khác bản offline.

### 1.3 Ràng buộc kỹ thuật

- `engine/` và `data/` phải chạy được cả browser classic script và Node CommonJS; không được import DB/network/timer vào hai thư mục này.
- Không có build step cho client; giữ client vanilla JS, có thể thêm `RemoteSession` như một classic script.
- State V7 là JSON lớn; mọi thay đổi phải qua `normalize` và kiểm tra giới hạn.
- Protocol v1 đã có hợp đồng rõ: `protocolVersion`, `requestId`, `expectedRevision`, `type`, `payload`.
- Client không được gửi `now`, RNG, giá, phần thưởng hoặc state; server không được tin snapshot client gửi lại.
- Snapshot không được lộ seed bí cảnh hoặc seed RNG server.

### 1.4 Có thể học từ `Hu-gioi` nhưng không lặp lại lỗi

`Hu-gioi` đã có Supabase Auth, chat, leaderboard, admin, maintenance. Có thể tái dùng **mô hình vận hành** (auth, chat, leaderboard, status page), nhưng **không tái dùng `save_game()` kiểu client gửi state lên**. Đó là client-authoritative và không phù hợp với game cạnh tranh. Workspace đã có `PlayerService` đúng hướng hơn: server chạy cùng bộ luật, client chỉ gửi lệnh.

---

## 2. Nguyên tắc thiết kế

1. **Một nguồn luật duy nhất**: server và client cùng dùng `engine/`; không copy công thức sang backend.
2. **Server sở hữu thời gian và RNG**: client chỉ hiển thị dự đoán; mọi kết quả chính thức do server trả.
3. **Intent, not state**: payload chỉ chứa ý định và ID; không chứa giá, phần thưởng, state, thời gian.
4. **Idempotency mặc định**: mọi lệnh có `requestId`; retry không nhân đôi phần thưởng.
5. **Revision để chống ghi đè**: mỗi mutation tăng revision; command phải khai báo `expectedRevision`.
6. **Transaction ngắn, tuần tự theo người chơi**: khóa row player; không gọi mạng bên ngoài trong transaction.
7. **Outbox thay vì side effect trực tiếp**: event cho leaderboard/mail/analytics được ghi cùng transaction, worker xử lý sau.
8. **Nguồn sự thật rõ ràng**: gameplay state ở `players.state`; social/market/mail ở bảng quan hệ; Redis chỉ là cache/tạm.
9. **Có thể vận hành**: log, metric, trace, backup, kill switch, maintenance ngay từ MVP.
10. **Tương thích ngược**: protocol version, schema version, content version; migration expand/contract.
11. **Giảm tải ghi**: sync không được biến thành ghi full state 10 giây/lần ở quy mô lớn; có lộ trình hot/cold.
12. **Không tin client**: kể cả save offline nhập vào cũng phải qua kiểm tra và giới hạn.

---

## 3. Kiến trúc tổng thể

### 3.1 Sơ đồ

```text
Người chơi
  │ HTTPS (same-origin)
  ▼
Reverse proxy / CDN
  ├── /                → static client (HTML/CSS/JS/media)
  ├── /api/v1/*        → Fastify API
  └── /ws              → WebSocket gateway (giai đoạn 3)
          │
          ├── AuthProvider (tự quản hoặc Supabase Auth)
          ├── PlayerService ──► PostgresPlayers ──► PostgreSQL
          ├── Social/Sect/Market/Leaderboard/Mail services ──► PostgreSQL
          ├── Outbox ──► Workers ──► Redis / analytics / mail / notification
          └── Redis: presence, rate limit, leaderboard cache, pub/sub
```

### 3.2 Thành phần

| Thành phần | Trách nhiệm | Không được làm |
|---|---|---|
| Static client | Render, gửi intent, hiển thị snapshot, reconnect | Không tính phần thưởng, không ghi state online |
| API gateway | Auth, validation, rate limit, routing, error mapping | Không chứa luật game |
| PlayerService | Điều phối create/sync/command, revision, receipt | Không truy cập SQL trực tiếp |
| Repository | Transaction, row lock, load/save state, receipt, outbox | Không chứa luật game |
| Domain services | Social, sect, market, mail, leaderboard | Không đọc/ghi state player tùy tiện ngoài transaction |
| Workers | Outbox, mail, market settlement, leaderboard, cleanup | Không cấp thưởng không idempotent |
| Redis | Presence, rate limit, cache, pub/sub | Không là nguồn sự thật của tiến trình |
| PostgreSQL | Nguồn sự thật bền vững | Không expose trực tiếp ra internet |

### 3.3 Luồng command

```text
Client
  │ POST /api/v1/players/{id}/commands
  ▼
Auth middleware → principal {accountId, sessionId, roles}
  ▼
Rate limit → validate envelope → resolve player ownership
  ▼
PlayerService.execute
  ▼
BEGIN
  SELECT player ... FOR UPDATE
  SELECT receipt theo (player_id, request_id)
  ├── có receipt cùng fingerprint → trả response cũ + snapshot mới
  ├── có receipt khác fingerprint → REQUEST_ID_REUSED
  └── chưa có
        ├── revision != expectedRevision → REVISION_CONFLICT
        ├── advance(now, mode) → catch-up
        ├── C.execute(game, command, now)
        ├── checkMeta, snapshot, redact
        ├── UPDATE player (state, revision, rng_counter)
        ├── INSERT receipt
        └── INSERT outbox event
COMMIT
  ▼
Response: revision, serverTime, state, result, report, logs, achievements, died, replayed
```

### 3.4 Luồng idle / sync

```text
Client mở game / tab visible / mỗi 30–60 giây
  │ POST /api/v1/players/{id}/sync
  ▼
Xác định online/offline từ last_seen_at + presence
  ▼
advance(now, { offline, maxSeconds })
  ├── online: hiệu suất 100%, chia lô tối đa 5 phút/lần
  └── offline: áp offline_cap + offline_efficiency
  ▼
Kết toán dungeon/sect/craft/garden/encounter/auto-combat
  ▼
Lưu state + revision (chỉ khi state thay đổi)
  ▼
Trả snapshot; client nội suy thanh tiến trình giữa các lần sync
```

### 3.5 Realtime (giai đoạn 3)

- WebSocket chỉ dùng cho **presence, chat, notification, invite**; state gameplay vẫn qua HTTP sync.
- Auth bằng ticket ngắn hạn `POST /api/v1/realtime/ticket`, không đặt access token trong URL.
- Redis pub/sub để fan-out giữa các gateway instance; không cần sticky session.
- Message có `eventId` để client dedupe; chat có `messageId` tăng dần để catch-up.

---

## 4. Quyết định kiến trúc (ADR tóm tắt)

| ID | Quyết định | Lý do | Hệ quả |
|---|---|---|---|
| ADR-001 | API Node riêng, không cho client ghi DB/BaaS | Giữ luật server-authoritative, tái dùng `engine/` | Phải vận hành API + DB |
| ADR-002 | PostgreSQL là nguồn sự thật | Transaction, revision, receipt, outbox, quan hệ | Cần migration/backup/PITR |
| ADR-003 | Lazy simulation, không global tick | Idle game không cần 1 Hz; tiết kiệm CPU/DB | Client phải sync định kỳ |
| ADR-004 | Transaction + row lock theo player | Đơn giản, đúng, chống ghi đè | Một player bị serialize; chấp nhận được |
| ADR-005 | Snapshot đầy đủ ở v1 | Dễ đúng, dễ debug, state nhỏ | Tốn băng thông hơn delta; tối ưu sau |
| ADR-006 | Same-origin cho static + API | Cookie/CSP/CORS đơn giản, an toàn hơn | Cần reverse proxy |
| ADR-007 | 1 nhân vật/account/server | Đơn giản hóa quyền sở hữu, leaderboard | Nhiều slot để sau |
| ADR-008 | Offline mode tách build | Giữ trải nghiệm `file://` | Hai cấu hình CSP/config |
| ADR-009 | Social thật ở giai đoạn 3 | MVP không bị scope creep | Trước đó social vẫn mô phỏng server-side |
| ADR-010 | AuthProvider abstraction | Có thể dùng tự quản hoặc Supabase | Thêm interface/adapter |

---

## 5. Mô hình dữ liệu

### 5.1 Quyền sở hữu dữ liệu

| Dữ liệu | Nguồn sự thật | Ghi chú |
|---|---|---|
| Account, email, password hash | `accounts` | Không bao giờ trả password hash |
| Session, refresh token | `auth_sessions` | Hash token, rotate |
| Tiến trình nhân vật (qi, realm, bag, equipment…) | `players.state` JSONB | Server-only; client chỉ nhận snapshot |
| Revision, schema/content version | `players` | Không nằm trong state |
| Receipt idempotency | `player_receipts` | TTL, unique theo player |
| Outbox event | `outbox` | Ghi cùng transaction |
| Bạn bè, chat, tông môn, market, mail | Bảng quan hệ | Giai đoạn 3 |
| Leaderboard | `leaderboard_entries` + Redis cache | Derived từ state/server events |
| Settings UI (âm thanh, hiệu ứng) | Client local hoặc account preferences | Không bump revision gameplay |
| Save offline | localStorage/JSON | Chỉ nhập qua luồng riêng |

### 5.2 Bảng core

Xem DDL đầy đủ ở Phụ lục A. Tóm tắt:

- `accounts`: danh tính, trạng thái, `token_version`.
- `auth_identities`: OAuth/provider subject (nếu dùng).
- `auth_sessions`: phiên, refresh token hash, family, revoke.
- `servers`: shard/region, `content_version`, `min_client_version`, trạng thái.
- `players`: account, server, name, status, revision, schema/content version, state JSONB, RNG seed/counter server-only.
- `creation_tickets`: preview tạo nhân vật do server gieo, dùng một lần.
- `player_receipts`: idempotency + response tóm tắt.
- `outbox`: event bất đồng bộ.
- `admin_audit`: thao tác admin.

### 5.3 Player state

- Giữ schema V7 trong `players.state`; `schema_version` là cột riêng.
- `state` phải JSON-safe: không `NaN`, `Infinity`, `undefined`, function; kiểm tra trước khi ghi.
- Giới hạn kích thước khuyến nghị: **64 KB/player** (snapshot nén); vượt ngưỡng → cảnh báo/quarantine.
- `H.normalize(state, now)` khi load; nếu normalize sửa nhiều hoặc phát hiện bất thường → log `STATE_REPAIRED`, cảnh báo.
- `snapshot(state)` clone rồi xóa các trường server-only:
  - `dungeon.active.seed`
  - mọi trường `rng*`, `serverOnly*`, `creationTicket*` nếu có
  - không trả `rng_seed`, `rng_counter` (nằm ngoài state)
- `settings` hiện nằm trong state để tương thích; online mode coi đây là dữ liệu client: lưu local/`account_preferences`, server không nhận command đổi settings và không bump revision. Không để client tự sửa state server vì settings.
- `logs` giữ tối đa 38 dòng như hiện tại; không phải dữ liệu kinh tế.

### 5.4 Revision và receipt

- `revision` bắt đầu 0, tăng 1 mỗi lần mutation commit (command, sync có thay đổi, admin correction).
- `expectedRevision` bắt buộc với command; sync không cần.
- Receipt lưu:
  - `request_id` (unique theo player)
  - `fingerprint` = hash canonical của `{type, payload}`
  - `revision` gốc
  - `response` JSONB **không chứa state** (chỉ result/report/logs/achievements/died/serverTime)
  - `expires_at` (khuyến nghị 7 ngày)
- Replay cùng fingerprint → trả response cũ + snapshot hiện tại + `replayed: true`.
- Replay khác fingerprint → `REQUEST_ID_REUSED` (409, không retry).
- Receipt hết hạn → retry cũ có thể nhận `REVISION_CONFLICT`; client sync rồi quyết định.

### 5.5 Outbox

- Ghi event cùng transaction với state/receipt.
- Worker poll `FOR UPDATE SKIP LOCKED`, publish, mark `published_at`.
- Event ví dụ: `player.progressed`, `player.died`, `player.reincarnated`, `market.order.filled`, `mail.created`, `achievement.unlocked`.
- Consumer phải idempotent theo `event.id`; retry có backoff; dead-letter sau N lần.

### 5.6 Bảng social/market (giai đoạn 3)

- `friendships`, `blocks`: quan hệ player, trạng thái pending/accepted/blocked.
- `chat_channels`, `chat_messages`: world/sect/private/system; retention 30 ngày.
- `sects`, `sect_members`, `sect_contribution_ledger`: tông môn, chức vị, cống hiến.
- `market_orders`, `market_trades`: escrow, order book, fee.
- `mail`, `mail_attachments`: thư hệ thống/quà, claim idempotent.
- `leaderboard_entries`: board/season/player/score/tiebreak.
- `payment_orders`, `currency_ledger`: jade/IAP, audit.

### 5.7 Index, partition, retention

| Bảng | Index chính | Partition/retention |
|---|---|---|
| `players` | `(account_id, server_id)` unique; `(server_id, name)` unique | Hash partition khi > 10M row |
| `player_receipts` | PK `(player_id, request_id)`; index `expires_at` | Xóa theo TTL hàng ngày |
| `outbox` | partial index `WHERE published_at IS NULL` | Archive sau 30 ngày |
| `chat_messages` | `(channel_id, id DESC)` | Partition tháng; xóa sau 30–90 ngày |
| `leaderboard_entries` | `(server_id, board, season_id, score DESC, tiebreak)` | Archive theo season |
| `admin_audit` | `(created_at)`, `(admin_account_id)` | Giữ 1 năm |
| `payment_orders` | unique `(provider, provider_ref)` | Giữ theo yêu cầu kế toán |

---

## 6. Thiết kế API

### 6.1 Quy ước

- Base path: `/api/v1`.
- JSON UTF-8; body tối đa 64 KB cho command, 1 MB cho import save.
- `Authorization: Bearer <access_token>`; access token 15 phút; refresh token HttpOnly cookie (same-origin) hoặc secure storage (native).
- Mọi response có `requestId` (header `X-Request-Id`) để trace.
- Thời gian: epoch milliseconds UTC, khớp `serverTime` hiện tại của service.
- Version: URL `v1`, body `protocolVersion`, header `X-Client-Version`; server trả `minClientVersion`, `contentVersion`.
- Không bao giờ nhận `playerId` trong payload command; player lấy từ URL và kiểm tra ownership.

### 6.2 Endpoint chính

| Method | Path | Auth | Mục đích |
|---|---|---|---|
| POST | `/auth/register` | no | Đăng ký email/password + captcha |
| POST | `/auth/login` | no | Đăng nhập |
| POST | `/auth/refresh` | refresh cookie | Rotate refresh token |
| POST | `/auth/logout` | yes | Revoke session hiện tại |
| GET | `/me` | yes | Account, session, quyền |
| GET | `/bootstrap` | yes | Server list, player list, `serverTime`, `contentVersion`, feature flags |
| POST | `/creation/preview` | yes | Server gieo tuổi/chủng tộc/linh căn, trả ticket |
| POST | `/players` | yes | Tạo nhân vật từ ticket + name/gender/talent |
| GET | `/players/{id}/state` | yes | Snapshot hiện tại (không catch-up) |
| POST | `/players/{id}/sync` | yes | Catch-up + persist + snapshot |
| POST | `/players/{id}/commands` | yes | Chạy một command |
| POST | `/players/{id}/commands:batch` | yes | Nhiều command trong một transaction (tùy chọn) |
| GET | `/leaderboards/{board}` | yes | Top + rank của mình |
| GET | `/social/friends` | yes | Danh sách bạn, online status (giai đoạn 3) |
| POST | `/social/friends/requests` | yes | Gửi lời mời (giai đoạn 3) |
| GET | `/mail` | yes | Hộp thư (giai đoạn 3) |
| POST | `/mail/{id}/claim` | yes | Nhận quà, idempotent (giai đoạn 3) |
| POST | `/realtime/ticket` | yes | Ticket WS ngắn hạn (giai đoạn 3) |
| WS | `/ws` | ticket | Presence/chat/notify (giai đoạn 3) |
| POST | `/imports/save` | yes | Nhập save offline (feature flag) |

Admin API đặt ở host/port riêng, không public: xem player, grant mail, ban, rollback, audit.

### 6.3 Command envelope

```json
{
  "protocolVersion": 1,
  "requestId": "01J9Z6K3V8Q2M4T7R1X5C9B0NA",
  "expectedRevision": 42,
  "type": "buy",
  "payload": { "code": "HERB-001" }
}
```

- `requestId`: 1–128 ký tự `[A-Za-z0-9_-]`, unique theo player, client giữ nguyên khi retry.
- `expectedRevision`: revision client đã thấy gần nhất.
- `type`: một trong 46 lệnh của `engine/protocol/commands.js`.
- `payload`: đúng schema của lệnh; server validate lại bằng `C.validate`.

### 6.4 Response command

```json
{
  "protocolVersion": 1,
  "revision": 43,
  "serverTime": 1793100000000,
  "schemaVersion": 7,
  "contentVersion": "2026-10-28.1",
  "state": { "created": true, "name": "Bạch Thanh Vân", "realm": 0, "stage": 1, "qi": 12.5, "bag": { "HERB-001": 9 } },
  "result": null,
  "report": { "seconds": 12.4, "exp": 123, "stone": 0, "batches": 0 },
  "logs": ["Đến Thanh Vân Sơn."],
  "achievements": [],
  "died": false,
  "replayed": false,
  "nextSyncInMs": 30000
}
```

- `state` là snapshot đầy đủ, đã redact; client thay thế state cũ, không merge tùy tiện.
- `replayed: true` nghĩa là request đã được xử lý trước đó; client không hiện lại toast/thưởng.
- `report` giữ cấu trúc hiện tại của `Game.advance`.
- `died: true` → client mở màn tọa hóa; chỉ `reincarnate` được phép.

### 6.5 Sync

```json
POST /api/v1/players/{id}/sync
{ "lastRevision": 42 }
```

- Không cần `requestId`; sync là reconciliation, có thể gọi lại.
- Server quyết định online/offline dựa trên `last_seen_at`/presence, **không nhận cờ offline từ client**.
- Sync trả cùng cấu trúc response command, không có `result`.
- Nếu state không đổi (elapsed 0), có thể giữ nguyên revision; nếu có thay đổi, tăng revision.
- Rate limit khuyến nghị: 4 lần/phút/player, burst 8; client nên sync mỗi 30–60 giây khi tab visible.

### 6.6 Batch (tùy chọn, khuyến nghị cho UI nhiều bước)

```json
POST /api/v1/players/{id}/commands:batch
{
  "protocolVersion": 1,
  "batchRequestId": "01J...",
  "expectedRevision": 42,
  "commands": [
    { "requestId": "01J...a", "type": "equip", "payload": { "code": "EQ-001" } },
    { "requestId": "01J...b", "type": "strike", "payload": {} }
  ]
}
```

- Tối đa 20 command; tất cả trong một transaction; một revision bump; all-or-nothing.
- Nếu một command lỗi, trả `index` của command lỗi; không command nào được ghi.
- Receipt cho batch theo `batchRequestId`; retry cả batch an toàn.

### 6.7 Mã lỗi

| Code | HTTP | Retryable | Ý nghĩa |
|---|---:|---|---|
| `UNAUTHENTICATED` | 401 | no | Thiếu/sai token |
| `FORBIDDEN` | 403 | no | Không sở hữu player hoặc thiếu quyền |
| `PLAYER_NOT_FOUND` | 404 | no | Player không tồn tại |
| `PLAYER_EXISTS` | 409 | no | Đã có nhân vật trên server |
| `PLAYER_DEAD` | 409 | no | Thọ nguyên cạn; chỉ reincarnate |
| `INVALID_REQUEST` | 400 | no | Envelope sai |
| `INVALID_COMMAND` | 400 | no | Type/payload sai |
| `INVALID_PROFILE` | 400 | no | Hồ sơ tạo nhân vật sai |
| `REVISION_CONFLICT` | 409 | yes | Revision lệch; sync rồi thử lại |
| `REQUEST_ID_REUSED` | 409 | no | RequestId dùng cho payload khác |
| `RATE_LIMITED` | 429 | yes | Vượt rate limit; có `Retry-After` |
| `TICKET_EXPIRED` | 410 | no | Ticket tạo nhân vật hết hạn |
| `CONTENT_VERSION_MISMATCH` | 426 | no | Client cần cập nhật |
| `GAME_RULE_VIOLATION` | 422 | no | Luật game từ chối (thiếu tiền, hồi chiêu…) |
| `STATE_CORRUPT` | 500 | no | State lỗi; quarantine |
| `MAINTENANCE` | 503 | yes | Bảo trì; có `Retry-After` |
| `INTERNAL` | 500 | yes | Lỗi không xác định |

Error envelope:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Tiến trình đã thay đổi. Hãy đồng bộ lại.",
    "requestId": "01J...",
    "retryable": true,
    "details": { "currentRevision": 44 }
  }
}
```

- Không trả stack trace, SQL, hay state nội bộ.
- Lỗi luật game hiện tại là tiếng Việt không có code; giai đoạn 1 bọc thành `GAME_RULE_VIOLATION`, giai đoạn 2 thêm `code` ổn định cho từng lỗi trong `engine/rules`.

### 6.8 WebSocket protocol (giai đoạn 3)

```text
C→S { op: "hello", ticket, lastEventId? }
S→C { op: "hello", accountId, playerId, serverTime, heartbeatMs: 25000 }

C→S { op: "ping", t }
S→C { op: "pong", t, serverTime }

S→C { op: "notify", eventId, kind: "mail"|"sect"|"pvp"|"chat", payload }
C→S { op: "chat.send", channelId, body, clientMsgId }
S→C { op: "chat.message", messageId, channelId, sender, body, at }
```

- Không gửi full state qua WS ở MVP; chỉ notify.
- Giới hạn message 4 KB; rate limit 20 message/phút; max 3 kết nối/account.
- Heartbeat 25 giây; Redis presence TTL 60 giây.
- Reconnect exponential backoff + jitter; sau reconnect gọi sync HTTP.

### 6.9 Rate limit đề xuất

| Scope | Giới hạn | Burst | Ghi chú |
|---|---|---|---|
| Login | 5/phút/IP, 10/giờ/account | 10 | CAPTCHA sau vài lần sai |
| Register | 3/giờ/IP | 5 | Email verification |
| Command | 10/giây/player | 30 | Một in-flight/player ở client |
| Sync | 4/phút/player | 8 | 30–60 giây/lần |
| Chat | 1/2 giây, 20/phút | 5 | World chat chặt hơn |
| Market | 1/5 giây | 3 | Chống spam order |
| Save import | 1/ngày/account | 1 | Feature flag |
| Admin | 60/phút | 10 | Audit mọi thao tác |

---

## 7. Luồng nghiệp vụ cốt lõi

### 7.1 Tạo nhân vật có ticket

1. `POST /creation/preview`:
   - Server gieo `age` 14–30, `race` theo trọng số, `roots`/`rootType`, lưu vào `creation_tickets.preview`.
   - Trả `ticketId`, preview, `expiresAt` (10 phút), số lượt còn lại.
   - Giới hạn 5 preview/ngày/account (cấu hình được) để chống reroll vô hạn.
2. Client chọn `name`, `gender`, phân bổ đúng 8 điểm `talent`.
3. `POST /players` với `ticketId`, `name`, `gender`, `talent`:
   - Transaction: khóa ticket, kiểm tra chưa dùng/hết hạn; kiểm tra name unique theo server; validate talent; tạo state bằng `H.createCharacter` với preview server giữ.
   - `INSERT players`; đánh dấu ticket used; outbox `player.created`.
   - Trả snapshot + revision 0.
4. Không nhận `age`, `race`, `roots`, `stone`, `state` từ client.

### 7.2 Command pipeline (pseudocode)

```js
async execute(principal, playerId, request) {
  const accountId = principal.accountId;
  validateEnvelope(request);
  const command = C.validate({ type: request.type, payload: request.payload });
  const fingerprint = canonicalHash(command);

  return repository.transact(playerId, async tx => {
    const player = await tx.getPlayerForUpdate(playerId);
    if (!player || player.accountId !== accountId) throw notFound();
    const receipt = await tx.getReceipt(playerId, request.requestId);
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw requestIdReused();
      return replay(receipt, player);
    }
    if (player.revision !== request.expectedRevision) throw revisionConflict(player.revision);

    const now = await tx.now();                    // clock_timestamp()
    const mode = await presence.mode(playerId, now); // online/offline
    const game = new Game(player.state, rngFor(player), log);
    const report = game.advance(now, advanceOptions(mode));
    const result = C.execute(game, command, now);
    const achievements = game.checkMeta(now);
    const revision = player.revision + 1;

    await tx.savePlayer({ state: game.s, revision, rngCounter: nextCounter });
    await tx.saveReceipt({ requestId, fingerprint, revision, response });
    await tx.outbox({ type: 'player.progressed', playerId, revision });
    return response({ revision, now, state: snapshot(game.s), result, report, achievements });
  });
}
```

- `rngFor(player)` dùng `HMAC(rng_seed, rng_counter++)`, không lộ seed.
- Nếu transaction lỗi, toàn bộ catch-up + command rollback; lần sau tính lại.
- Retry SQLSTATE `40001`/`40P01` tối đa 3 lần với jitter; callback phải pure (không side effect ngoài DB).
- `statement_timeout` 5 giây, `lock_timeout` 2 giây, `idle_in_transaction_session_timeout` 10 giây.

### 7.3 Idle, offline và thời gian

**Nguyên tắc:** server quyết định online/offline, không tin client.

- Đọc `last_seen_at` **cũ** trước để quyết định mode, rồi mới cập nhật `last_seen_at = now`; tránh việc request hiện tại tự biến thành online.
- Presence WS TTL 60 giây; có presence active trong 300 giây → online.
- Nếu `now - last_seen_at > 300 giây` → offline; ngược lại online. Ngưỡng cấu hình được; nếu có WS presence thì ưu tiên presence.
- Offline:
  - `advance(now, { offline: true })` dùng `F.offline_cap(s.offlineCap)` (8h base, tối đa 24h) và `F.offline_efficiency` (60% base, tối đa 100%).
  - Auto-combat dùng kỳ vọng số trận (`collectLoot(n, true)`), không loop từng trận.
- Online:
  - Hiệu suất 100%, không áp offline cap.
  - Giới hạn CPU mỗi request: `maxSeconds = 300`; nếu còn dư, trả `pendingSeconds` và client sync tiếp.
  - Auto-combat: loop từng trận nếu khoảng ngắn; nếu > 60 giây dùng kỳ vọng để tránh 300-turn cap và RNG churn.
- `advance` cần refactor nhẹ để tách `offline` khỏi `maxSeconds`:
  ```js
  advance(now, offlineOrOptions = false) {
    const opts = typeof offlineOrOptions === 'boolean'
      ? { offline: offlineOrOptions }
      : offlineOrOptions;
    // offline: cap + efficiency; maxSeconds: giới hạn CPU; aggregateCombat: bulk
  }
  ```
  Giữ tương thích boolean cho test/client offline hiện tại.
- `lastUpdate` luôn `Math.max(lastUpdate, now)`; nếu đồng hồ lùi, không cộng tiến trình, ghi log.
- Dungeon dùng seed lưu server-side, deterministic; snapshot xóa seed.
- Craft queue/sect mission lưu `end`, `success/chance`, `quality` tại thời điểm bắt đầu; kết quả không đổi khi balance thay đổi.
- Death: nếu hết tuổi thọ trong catch-up, cắt thời gian tại mốc chết, set `died`; command khác `reincarnate` bị chặn.

### 7.4 Revision, conflict và retry

- Client giữ `revision` từ response gần nhất; gửi kèm command.
- Command queue của client: **một in-flight/player**, các command sau xếp hàng; không chạy sync nền chen giữa command.
- `REVISION_CONFLICT`:
  1. Client gọi sync lấy state/revision mới.
  2. Nếu hành động vẫn còn hợp lệ/theo ý người chơi, gửi lại với `requestId` **mới** và revision mới.
  3. Không tự động retry mù các hành động tiêu tiền; hiển thị xác nhận nếu cần.
- Network timeout:
  - Giữ nguyên `requestId`, retry cùng payload; server trả `replayed:true` nếu đã commit.
  - Không tạo `requestId` mới cho đến khi nhận ack hoặc quyết định hủy.
- Receipt TTL 7 ngày; cleanup job chạy hàng ngày.

### 7.5 Tọa hóa / chuyển thế

- `advance` phát hiện `isDead()`; response `died:true`.
- Chỉ command `reincarnate` được phép khi dead; `C.execute` đã chặn các lệnh khác.
- `prestige` chỉ qua command, không có `force` từ client.
- Server kiểm tra `age >= maxLife`, `rebirths`, `meta`; transaction lưu state mới + receipt + outbox `player.reincarnated`.

### 7.6 Nhập save offline (feature flag)

1. Client upload JSON ≤ 1 MB; server hash SHA-256, kiểm tra `save_imports.source_hash` chưa dùng.
2. Validate: schema V4–V7, `created`, kích thước, item codes, giới hạn bag/realm/age/resources; chạy `H.normalize`.
3. Chấm điểm rủi ro: realm quá cao so với `totalRunExp`, item/jade bất thường, social/auction có dấu hiệu sửa.
4. Chính sách đề xuất:
   - Giữ name/gender/race/roots/talent/realm/stage/bag/equipment/tech/manuals/meta hợp lệ.
   - Reset `stone` về mức trần theo realm, `jade = 0`, `social/sect/auction/dungeon/pvp` về mặc định, `lastUpdate = now`.
   - Clamp `age`, `rebirths`, `daoVan`; cấp mail “founder” thay vì giữ nguyên tài nguyên.
   - Nếu rủi ro cao: `pending` để admin review; không tạo player.
5. Một account chỉ import một lần; lưu audit; local save vẫn giữ làm backup.
6. Không bao giờ dùng endpoint này để nhận state trong gameplay thường.

### 7.7 Achievements / meta

- `game.checkMeta(now)` sau mỗi command/sync; thành tựu idempotent theo `meta.achievements`.
- Điểm Thiên mệnh và lịch sử chuyển thế nằm trong state; server là nguồn sự thật.
- Outbox `achievement.unlocked` cho analytics/notification; client hiển thị từ response, không tự cấp điểm.

### 7.8 Content version và job đang chạy

- `content_version` là hash của `data/` + `engine/rules` tại thời điểm deploy; trả trong bootstrap/response.
- Active dungeon/sect mission nên lưu **snapshot định nghĩa** (floors, boss, element, seconds, contribution) trong state server-only hoặc bảng job, để đổi balance không làm hỏng job đang chạy.
- Khi deploy balance mới: settle các player đang online/active trước khi chuyển version; player offline sẽ catch-up bằng version mới (chấp nhận hoặc version hóa công thức nếu cần công bằng tuyệt đối).
- Client version mismatch → `426 CONTENT_VERSION_MISMATCH`, yêu cầu reload.

---

## 8. Multiplayer và tính năng xã hội

> MVP giữ các lệnh `meetFriend`, `giftFriend`, `discuss`, `npcGift`, `npcOffer`, `duel`, `bid`, `joinSect`… là mô phỏng server-side theo từng nhân vật. Giai đoạn 3 mới thay bằng dữ liệu chung. Không trộn hai nguồn sự thật cho cùng một tính năng.

### 8.1 Presence và chat

- Presence: Redis key `presence:{playerId}` TTL 60s, heartbeat WS 25s; online status chỉ là tạm thời.
- Kênh: world (theo server), sect, private (bạn bè), system.
- Lưu `chat_messages` Postgres; fan-out Redis pub/sub; client catch-up bằng `afterId`.
- Chống spam: rate limit, trùng lặp, link, CAPTCHA khi bị flag; mute/ban; report.
- Moderation: filter tiếng Việt/Anh, chuẩn hóa Unicode, log bằng chứng, admin queue; retention 30 ngày.
- Không hiển thị IP/email; chỉ player ID/name công khai.

### 8.2 Bạn bè

- Lời mời → chấp nhận/từ chối; block; tối đa 100 bạn.
- Quan hệ lưu theo `player_id` (trong cùng server) hoặc `account_id` nếu cross-server sau này.
- Online status lấy từ Redis; không lưu vào Postgres.
- Quà tặng/affinity: nếu giữ mô phỏng, vẫn server-side; nếu thật, dùng ledger + cooldown + chống multi-account.

### 8.3 PvP bất đồng bộ (khuyến nghị thay vì realtime)

- Lưu `pvp_snapshot` (stats, tech, manuals, equipment, CP) khi player đổi trang bị/công pháp hoặc logout; refresh định kỳ.
- Matchmaking theo rating ±100, mở rộng dần; cùng server; bracket realm.
- Trận đấu mô phỏng server-side, seed lưu để audit; tối đa 60 turn; trả battle log.
- Rating Elo K=32; mùa giải soft reset; thưởng qua mail/outbox; giới hạn trận/ngày.
- Chống win-trading: phát hiện cặp đối thủ lặp, cùng IP/device, rating bất thường; giảm/khóa thưởng.
- Realtime PvP để giai đoạn sau; không cần cho idle game.

### 8.4 Tông môn

- `sects`, `sect_members`, `sect_contribution_ledger`; chức vị: chưởng môn/trưởng lão/chấp sự/nội môn/ngoại môn.
- Giai đoạn 3a: roster, chat, gia nhập/rời, cống hiến, quyền lợi; nhiệm vụ tông môn vẫn mô phỏng per-player.
- Giai đoạn 3b: nhiệm vụ chung, kho tông môn, sect boss/war.
- Nếu vừa dùng `state.sect` vừa dùng bảng quan hệ, `state.sect` chỉ là projection; mọi thay đổi join/leave/contribution phải qua sect service và ghi cả hai trong cùng transaction. Không để shared rule tự sửa membership khi online.
- Sect boss: row `sect_boss(hp, max_hp, ends_at)`; damage bằng `UPDATE ... SET hp = GREATEST(0, hp - $1) RETURNING`; ghi contribution; thưởng idempotent khi hạ.
- Scheduler dùng advisory lock/pg-boss singleton để spawn/reset.

### 8.5 Thị trường / đấu giá

- MVP: giữ “đấu giá NPC” mô phỏng per-player; không gọi là thị trường chung.
- Giai đoạn 3: market fixed-price trước, đấu giá sau.
- Escrow:
  1. Transaction khóa player seller, kiểm tra bag, trừ item, tạo order.
  2. Buyer: khóa buyer + seller theo thứ tự UUID để tránh deadlock; trừ tiền, cộng tiền seller trừ fee, chuyển item, đóng order.
  3. Hủy/hết hạn: trả item qua mail/direct add, idempotent.
- Item key gồm quality (`EQ-001@2`), validate bằng `H.item`; quantity nguyên dương.
- Giá sàn/trần theo NPC price; log trade; giới hạn tần suất; chống RMT.
- Không dùng chung bảng với auction mô phỏng.

### 8.6 Mail

- Thư hệ thống, quà, đền bù, kết quả market/PvP.
- `attachments` JSONB `[{code, qty}]`; validate item/qty.
- Claim idempotent: `UPDATE mail SET claimed_at=now() WHERE id=$1 AND player_id=$2 AND claimed_at IS NULL RETURNING *`; sau đó add item trong cùng transaction.
- Hết hạn: worker xử lý; quyết định mất quà hay auto-claim (khuyến nghị cảnh báo trước).
- Tối đa 100 mail; phân trang.

### 8.7 Bảng xếp hạng

- Board: `realm` (realm/stage/totalRunExp), `power` (CP), `pvp` (rating), `sect` (level/contribution).
- `leaderboard_entries` + Redis ZSET cache; cập nhật qua outbox, debounce 30–60s.
- Top 100 + rank của mình; mùa giải `season_id`; archive + thưởng khi rollover.
- Chỉ score server tính; loại banned/flagged; kiểm tra biên trên theo realm để phát hiện bất thường.
- Tie-break xác định (ví dụ updated_at asc) để kết quả ổn định.

### 8.8 World event / live ops

- Scheduler (pg-boss/advisory lock) cho event, boss, season.
- Event definition trong config/DB; participation/reward idempotent.
- Không chạy event trong transaction dài; worker xử lý batch.
- Feature flag + kill switch từng event.

### 8.9 Mẫu nhất quán

- **Outbox** cho event sau commit.
- **Idempotency key** cho mọi reward/claim.
- **Row lock theo thứ tự xác định** cho giao dịch nhiều player.
- **Saga/compensation** cho cross-service (market + mail + ledger); không distributed transaction.
- **Advisory lock** cho job singleton (season rollover, boss spawn).
- **Retry + dead-letter** cho worker; consumer idempotent.

---

## 9. Kinh tế và chống gian lận

### 9.1 Currency ledger

- `currency_ledger(player_id, currency, delta, balance_after, reason, ref_type, ref_id, created_at)`.
- Ghi đầy đủ cho **jade/paid currency**; stone/contribution có thể aggregate/ngưỡng để tránh 10M row/ngày.
- Double-entry cho tiền nạp/hoàn tiền; single-entry có reason cho tiền game.
- Báo cáo faucet/sink hàng ngày: tu luyện, combat, quest, sect, dungeon, encounter, market, shop, upgrade, fee.
- Cảnh báo lạm phát: net faucet > ngưỡng, một nguồn tăng đột biến.

### 9.2 Kiểm tra state và invariant

Trước khi ghi:

- `revision` nguyên, không âm, tăng đơn điệu.
- `lastUpdate` không vượt `now + 60s`; nếu lùi, clamp + log.
- `realm` 0–13; `stage` 1–`STAGES[realm]`.
- `qi <= need + epsilon`; `hp <= stats.HP`; `mp <= maxMp`.
- Bag: code hợp lệ, count nguyên 0–1e9; equipment là subset của bag; `activeManuals <= 3`; `learned` hợp lệ.
- `stone/jade/daoVan` hữu hạn, không âm; `jade` nguyên.
- `age <= maxLife` trừ khi `completed`; `meta`/friends/logs trong giới hạn.
- State JSON-safe, ≤ 64 KB.
- Nếu vi phạm: `STATE_CORRUPT`/quarantine, không tự sửa im lặng; alert.

### 9.3 Chống gian lận

- Server tính mọi giá/phần thưởng/RNG/thời gian.
- `expectedRevision` + receipt chống replay/dup.
- Rate limit + velocity + upper bound theo realm/thời gian:
  - exp/giờ, stone/giờ, item/giờ, số trận dungeon/sect/ngày.
  - So sánh với trần lý thuyết từ `engine/rules` + dung sai.
- Phát hiện bất thường: command cadence, requestId trùng payload khác, revision gap, nhiều account cùng device/IP, market price bất thường.
- Shadow ban/flag thay vì auto-ban; admin review; audit.
- Không log state/token; log hash/size.
- Client modding không sửa được state server; chỉ có thể spam → rate limit.

### 9.4 RNG và audit

- `rng_seed` + `rng_counter` lưu cột server-only; mỗi lần dùng `HMAC(seed, counter++)`.
- Dungeon seed lưu trong state server-only, snapshot redact.
- Command log (type, requestId, revision, result code, timestamp) giữ 30–90 ngày để điều tra.
- Battle/dungeon result lưu seed + summary để replay khi có tranh chấp.
- Không dùng `Math.random` trên server.

### 9.5 Payment / IAP (nếu monetize)

- `payment_orders` + webhook provider (Stripe/Apple/Google) có signature; idempotent theo `provider_ref`.
- Grant jade qua outbox/ledger, không trực tiếp từ client.
- Refund/chargeback: trừ lại hoặc âm balance có kiểm soát; flag fraud.
- Không bán trực tiếp sức mạnh gây lạm phát; ưu tiên cosmetic/convenience.
- Loot box (nếu có): công bố tỷ lệ, tuân thủ pháp lý.
- Legal review về giấy phép game/payment tại Việt Nam.

### 9.6 Admin và support

- Admin API riêng, RBAC, 2FA, IP allowlist.
- Xem player read-only; search; grant mail; ban/unban; reset password; rollback state; xem receipt/outbox/economy.
- Mọi thao tác có reason + audit; giới hạn grant/ngày; four-eyes cho giá trị lớn.
- Không sửa SQL trực tiếp trong production trừ break-glass có audit.
- Template hỗ trợ; compensation mail idempotent.

---

## 10. Hiệu năng và khả năng mở rộng

### 10.1 Bài toán ghi

State hiện tại ~2–20 KB (khởi tạo ~2.2 KB; late game có thể 10–20 KB). Nếu sync ghi full state:

| Quy mô | Sync 60s | Ghi/giây | Băng thông state (6 KB) | Ghi/ngày |
|---|---:|---:|---:|---:|
| 1k CCU | 60s | ~17 | ~0.1 MB/s | ~8.6 GB |
| 10k CCU | 60s | ~167 | ~1.0 MB/s | ~86 GB |
| 100k CCU | 60s | ~1.667 | ~10 MB/s | ~864 GB |

Đây là **rủi ro chính**. Không được để sync 10–30 giây ghi full JSONB ở quy mô lớn.

**Lộ trình:**

1. **MVP ≤ 2k CCU**: Postgres write-through, sync 60s, command ghi ngay. Đơn giản, đúng.
2. **2k–10k CCU**: tách hot/cold:
   - `players` giữ cột hot: `qi, hp, mp, stone, jade, realm, stage, age, last_update, revision, rng_counter`.
   - `player_cold_state` JSONB cho bag/equipment/social/sect/dungeon…
   - Sync chỉ update hot columns; command đổi item mới update cold. So sánh hash để tránh ghi cold nếu không đổi.
3. **>10k CCU**: cân nhắc Redis hot state + checkpoint:
   - Player active giữ state trong Redis, lease theo player; command ghi Redis + outbox/command log; checkpoint Postgres mỗi 60s hoặc khi logout.
   - Redis AOF + replica; chấp nhận mất tối đa vài phút tiến trình idle nếu sự cố, hoặc replay từ checkpoint.
   - Chỉ làm khi có load test và runbook; không đưa vào MVP.

### 10.2 Cấu hình DB

- Connection pool 20–50/instance; PgBouncer transaction mode khi nhiều instance.
- `statement_timeout=5s`, `lock_timeout=2s`, `idle_in_transaction_session_timeout=10s`.
- `pg_stat_statements`, `auto_explain`, slow query log.
- Autovacuum tuned cho bảng `players`/`receipts`; theo dõi bloat.
- Read replica cho leaderboard/analytics; **không** đọc player state từ replica khi command.
- Backup PITR + daily full; test restore hàng tháng.

### 10.3 Cache và queue

- Config/content: load vào memory, immutable theo `content_version`.
- Leaderboard: Redis ZSET + Postgres rebuild.
- Presence/rate limit: Redis; nếu Redis down, fallback in-memory conservative, gameplay vẫn chạy.
- Outbox worker: batch 100, poll 100ms; backoff; dead-letter.
- Mail/market/season worker: pg-boss; scale ngang; job idempotent.

### 10.4 Sharding / đa vùng

- Bước 1: một Postgres primary + read replica, một region.
- Bước 2: `servers` logic + region; route player theo `server_id`; social trong cùng server.
- Bước 3: shard theo `server_id` trước, hash player sau; account DB global.
- Tránh cross-shard transaction; dùng outbox/saga. Không hỗ trợ chuyển server/merge server ở MVP.
- Latency idle game chấp nhận 100–200ms; ưu tiên đúng hơn realtime.

### 10.5 Mục tiêu tải

| Giai đoạn | DAU / CCU | Mục tiêu |
|---|---:|---|
| MVP | 5k / 500 | p95 command < 250ms; p95 sync < 200ms |
| Growth | 50k / 5k | p95 < 300ms; DB CPU < 70%; không lỗi 5xx |
| Scale | 200k / 20k | sharding/hot-state; p95 < 400ms; multi-region |

- Load test bằng k6: login, sync 60s, command 1–5/phút/player, chat.
- Test catch-up xấu nhất: offline 24h, auto bật, dungeon/sect/craft đang chạy.
- Theo dõi `state_bytes`, `catchup_seconds`, `revision_conflicts`, `replays`, `queue_lag`.

---

## 11. Bảo mật

### 11.1 Checklist kiểm soát

| Khu vực | Kiểm soát |
|---|---|
| AuthN | Argon2id; password ≥ 8; JWT access 15 phút; refresh rotate + reuse detection; 2FA admin |
| AuthZ | Kiểm tra ownership `account_id` → `player_id`; RBAC admin; không IDOR |
| Input | Schema validation; body limit; `secure-json-parse`; chặn `__proto__`/`constructor`; command payload qua `C.validate` |
| Transport | TLS 1.3; HSTS; same-origin; CORS allowlist nếu tách origin |
| Token | Access token trong memory; refresh HttpOnly `Secure` `SameSite=Lax`; không localStorage |
| CSRF | Same-origin + SameSite; nếu cross-origin dùng double-submit/CSRF token |
| XSS | Escape output; CSP; sanitize chat/name; không `innerHTML` với dữ liệu người dùng |
| SQL | Parameterized query; không dynamic SQL từ client; whitelist JSONB path |
| DoS | Rate limit; body/message limit; connection limit; edge DDoS protection |
| Abuse | CAPTCHA register/login; device/IP reputation; shadow ban; report/mute |
| Secrets | Secret manager; env validation; rotate JWT/DB keys; không commit `.env` |
| Dependencies | `npm ci`; lockfile; audit; SBOM; image scan; no postinstall lạ |
| Data | Encryption at rest; TLS DB; PII tối thiểu; retention; export/delete |
| Admin | Host riêng; 2FA; IP allowlist; audit; least privilege |
| Payment | Webhook signature; idempotency; fraud/refund process |
| Backup | Encrypted; cross-region; restore drill; access log |

### 11.2 CSP cho bản online

Bản offline giữ CSP chặt hiện tại (`connect-src 'none'`, cho phép `file:`). Bản online:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
media-src 'self';
object-src 'none';
frame-src 'none';
worker-src 'none';
base-uri 'none';
form-action 'none';
frame-ancestors 'none'
```

- Same-origin thì `connect-src 'self'` là đủ; một số trình duyệt cần thêm `wss://<host>` cho WebSocket, nên kiểm tra browser matrix. Nếu API khác origin, thêm đúng `https://api...` và `wss://...`.
- Không dùng `file://` cho bản online; `file://` không gửi được cookie/CORS đúng.
- Cấu hình qua `client/config.js` hoặc build script; không hard-code secret.
- `_headers` bổ sung HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; HTML `no-store`, asset hash immutable.

### 11.3 Auth flow đề xuất

- Register: email + password + captcha; gửi email xác nhận; chưa xác nhận có thể chơi giới hạn (tùy sản phẩm).
- Login: rate limit; generic error; optional 2FA.
- Access token: JWT `sub=accountId`, `sid`, `ver`, `jti`, `exp=15m`; ký RS256/EdDSA; JWKS nội bộ.
- Refresh: random 256-bit, hash SHA-256 trong DB; rotate mỗi lần; reuse → revoke family.
- Logout: revoke refresh + session; access token hết hạn tự nhiên (15m). Ban khẩn cấp: cache `account.status`/`token_version` để chặn sớm.
- WebSocket: ticket 60s, one-time; verify Origin; không token trong query string.
- Account deletion: soft delete, revoke token, ẩn khỏi chat/leaderboard, purge sau 30 ngày; export JSON theo yêu cầu.

### 11.4 Quyền riêng tư / pháp lý

- Tối thiểu PII: email, IP (log ngắn hạn), device signal thô.
- Chat/name là nội dung công khai; có quy tắc và moderation.
- Consent analytics; ẩn danh ID; không bán dữ liệu.
- Trẻ vị thành niên: age gate, hạn chế chat/payment nếu cần; legal review.
- Việt Nam: giấy phép game, phân loại nội dung, quy định thanh toán; tham vấn pháp lý trước launch.
- Lưu payment record theo yêu cầu kế toán/thuế; tách retention.

---

## 12. Vận hành, quan sát, SLO

### 12.1 Log / metric / trace

- Log JSON (pino), có `requestId`, `accountId` hash, `playerId`, route, latency, error code; **không** log token/state/email/password.
- Metric Prometheus:
  - HTTP: `http_request_duration_seconds`, `http_requests_total{status}`
  - Game: `game_commands_total{type,status}`, `game_command_duration_seconds`, `game_sync_total`, `game_catchup_seconds`, `game_revision_conflicts_total`, `game_replays_total`, `game_state_bytes`
  - DB: pool, query duration, replication lag, bloat
  - Queue: jobs, lag, failures
  - WS: connections, messages, disconnects
  - Economy: faucet/sink theo nguồn
- Trace OpenTelemetry: span `command.execute`, `sync`, `db.transaction`, `outbox.publish`; sample 1–10%; không gắn payload/state.
- Dashboard: overview, gameplay, economy, social, DB/Redis, workers, security.

### 12.2 Alert

- 5xx > 1% trong 5 phút.
- p95 command > 500ms trong 10 phút.
- DB CPU > 80% / connection pool cạn / replication lag > 30s.
- Queue lag > 5 phút / dead-letter tăng.
- Revision conflict > 5% hoặc replay > 10% (retry storm).
- Login failure/CAPTCHA spike.
- Economy faucet > 3σ hoặc jade grant bất thường.
- Backup fail, certificate sắp hết hạn, disk > 80%.
- Chat report/moderation backlog.

### 12.3 SLO

| Chỉ số | Mục tiêu |
|---|---|
| API availability | 99.9%/tháng |
| p95 command | < 250ms |
| p95 sync | < 200ms |
| Error rate 5xx | < 0.5% |
| RPO | ≤ 5 phút |
| RTO | ≤ 1 giờ |
| Chat delivery p95 | < 1s (giai đoạn 3) |

### 12.4 Backup / DR

- Postgres PITR (WAL archive) + daily full; retention 30 ngày; copy cross-region.
- Restore drill hàng tháng; đo RTO thực tế.
- Redis không phải nguồn sự thật; nếu dùng hot state, bật AOF + replica và có quy trình rebuild.
- Object storage versioning cho assets; CDN purge.
- Runbook: DB failover, Redis down (chat/presence degrade, gameplay tiếp tục), queue backlog, hot player, exploit, payment outage, maintenance.

### 12.5 CI/CD và migration

- CI: `npm ci`, `npm run check`, `npm test`, test DB (Postgres service), lint, build Docker, scan image, migration dry-run.
- CD: staging → canary 5–10% → production; feature flag; rollback image.
- Migration expand/contract:
  1. Add nullable column/table.
  2. Backfill theo batch.
  3. Deploy code đọc/ghi cả hai.
  4. Thêm constraint; bỏ cột cũ sau.
- `CREATE INDEX CONCURRENTLY` ngoài transaction; tránh lock dài.
- Deploy balance/content: settle player active trước; thông báo client reload nếu content version đổi.
- Maintenance mode: chặn command, cho login/sync read-only nếu an toàn; drain; deploy; resume; grace period.

### 12.6 Kill switch

- Theo server: tắt command/chat/market/PvP.
- Theo feature flag: tắt save import, leaderboard, event.
- Maintenance page; status page; in-game mail thông báo.
- Không cần deploy để bật/tắt.

---

## 13. Kiểm thử và nghiệm thu

### 13.1 Test pyramid

| Loại | Phạm vi | Công cụ | Gate |
|---|---|---|---|
| Unit | shared rules, normalize, protocol, service với fake repo/clock/RNG | `node:test` | mỗi PR |
| Contract | cùng bộ test chạy với kho bộ nhớ và `PostgresPlayers` | `node:test` + Postgres | mỗi PR |
| Integration | API + DB + Redis + auth + outbox | Testcontainers/docker compose | mỗi PR |
| Concurrency | 2 command cùng revision; 2 instance; duplicate requestId; deadlock retry | script + DB | mỗi PR |
| Crash | commit xong nhưng mất response; retry receipt | fault injection | trước release |
| Migration | V4–V7, V8 tương lai, up/down, backfill | SQL test | trước release |
| Load | login/sync/command/chat; 500 → 5k CCU | k6 | trước release |
| Security | authz/IDOR, replay, rate limit, oversized body, injection, XSS, CSRF, token reuse | ZAP + test | trước launch |
| Chaos | DB/Redis down, queue backlog, clock skew, deploy giữa load | Toxiproxy/script | trước launch |
| Client E2E | login, create, sync, command, reconnect, conflict, death | Playwright | trước release |
| Economy | bot simulation 30 ngày; faucet/sink; không âm; item conservation | script | mỗi balance change |

### 13.2 Test bắt buộc cho MVP

- Hai người chơi tiến triển độc lập; response không sửa được repository.
- Hai command cùng revision: một thắng, một `REVISION_CONFLICT`.
- Cùng `requestId` cùng payload: chỉ trừ tiền một lần, `replayed:true`.
- Cùng `requestId` khác payload: `REQUEST_ID_REUSED`.
- Transaction lỗi rollback cả catch-up; lần sau chạy lại được.
- Restart process/DB: state/revision/receipt còn nguyên.
- Đồng hồ lùi: không cộng tiến trình, không revision âm.
- Offline 8h/24h: cap/efficiency đúng; dungeon/sect/craft kết toán một lần.
- Snapshot không lộ `dungeon.active.seed`, RNG seed.
- Tọa hóa chặn command; reincarnate đúng một lần.
- Rate limit trả 429 + `Retry-After`.
- Auth: không token, token hết hạn, player của account khác → 401/403/404 đúng.
- State quá lớn/không JSON-safe → bị chặn, không ghi DB.
- Parity: cùng clock/RNG, `LocalSession` và `PlayerService` cho cùng state sau cùng chuỗi lệnh.

### 13.3 Acceptance criteria MVP

- Account register/login/refresh/logout hoạt động; một player/account/server.
- Tạo nhân vật qua preview ticket; không nhận state/age/race/roots từ client.
- Tất cả 41 command chạy qua API; response khớp luật shared.
- Postgres persistence qua restart; backup/restore đã thử.
- Revision/idempotency/concurrency tests pass.
- Offline catch-up đúng; không phụ thuộc đồng hồ client.
- Rate limit, error envelope, request logging, health/metrics.
- Client online mode chơi được end-to-end; reconnect/conflict có UX.
- Load test 500 CCU đạt p95 mục tiêu.
- Security checklist cơ bản pass; không có secret trong client.
- Staging deploy + rollback đã thử.

---

## 14. Lộ trình triển khai

> Giả định: 1 backend, 1 fullstack, 0.5 DevOps, 0.5 QA. Có thể chạy song song client/backend sau khi chốt API.

### Phase 0 — Nền tảng (tuần 1)

- Chốt ADR-001…010; freeze MVP scope.
- Tạo `server/` skeleton, `docker-compose` Postgres/Redis, env schema, error envelope, pino, health check.
- Migration 0001 core; `PostgresPlayers` + contract tests.
- Viết `PlayerService` trên repository interface; DB clock/RNG; player ownership.
- CI: check/test/DB test.

**Exit:** `npm test` pass với cả Memory và Postgres; API health chạy local.

### Phase 1 — Online single-player (tuần 2–4)

- Auth register/login/refresh/logout; account/session.
- Bootstrap, creation preview/ticket, create player.
- Sync + command API; receipt; outbox; rate limit; error mapping.
- State validation/redaction; request logging; metrics; admin seed script.
- Staging deploy; load test 500 CCU.

**Exit:** chơi online qua HTTP; restart không mất dữ liệu; concurrency/rollback tests pass.

### Phase 2 — Client online mode (tuần 4–6)

- `RemoteSession` async; command queue; snapshot apply; server time offset; reconnect/backoff.
- Refactor `UI.command`/call site sang async (toàn bộ call site trước khi bật online); pending/disable button; conflict UX.
- Online build/config; CSP/CORS same-origin; auth UI; character select; cached snapshot read-only.
- Save import feature flag; E2E Playwright; canary.

**Exit:** chơi online end-to-end; không ghi gameplay vào localStorage; p95 đạt; rollback an toàn.

### Phase 3a — Social nền tảng (tuần 6–7)

- WS gateway; presence; friends; world/sect chat; mail; leaderboard.
- Moderation/admin tools; economy ledger; anti-cheat alerts.
- Load test 1k CCU.

**Exit:** chat/presence/leaderboard/mail hoạt động; moderation có quy trình.

### Phase 3b — PvP/tông môn/thị trường (tuần 8–10)

- Async PvP; sect roster/membership; market fixed-price (feature flag).
- Load test 1k CCU; test escrow/dup item/currency.

**Exit:** PvP/sect/market hoạt động; không dup item/currency.

### Phase 4 — Live ops & scale (tuần 11–15)

- Season/event; battle pass/IAP (nếu có); analytics; A/B/feature flags.
- Hot/cold state; Redis hot-state nếu cần; partition; multi-region; DR drill.
- Security audit/pen test; load test 10k CCU; on-call/runbook.

**Exit:** launch checklist pass; SLO/alert/backup/restore; rollback đã thử; legal review xong.

### Ước lượng

| Cách làm | Thời gian |
|---|---|
| Team 3–4 người như trên | 12–17 tuần |
| 1 backend + 1 fullstack | 4–6 tháng |
| Solo | 6–9 tháng |

MVP nên dừng ở Phase 2 (online single-player + client) trước khi làm social, để có phản hồi thực tế và tránh scope creep.

---

## 15. Rủi ro và quyết định mở

### 15.1 Rủi ro

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Write amplification do sync full state | Cao | DB phình/chi phí | Sync 60s; hot/cold; Redis hot-state khi >10k CCU |
| Refactor `UI.command` async làm hỏng UI | Cao | Chậm Phase 2 | Làm cuốn chiếu từng screen; test E2E; pending state |
| Save offline bị sửa để gian lận | Cao | Phá leaderboard/economy | Import riêng, cap, flag, review, jade=0 |
| Scope creep social/PvP/market | Cao | Trễ launch | MVP chỉ online single-player; feature flag |
| Redis down | Trung bình | Mất chat/presence | Degrade; gameplay qua Postgres vẫn chạy |
| Schema/content thay đổi làm hỏng job | Trung bình | Sai thưởng | Freeze job params; content version; settle trước deploy |
| Chat độc hại/legal | Trung bình | Rủi ro cộng đồng/pháp lý | Moderation, report, age gate, legal review |
| Payment fraud | Trung bình | Mất tiền | Webhook signature, idempotency, fraud rules |
| Multi-server consistency | Thấp (MVP) | Sai dữ liệu | Một primary; shard theo server; outbox/saga |
| Rò rỉ secret/token | Thấp | Chiếm account | Secret manager, CSP, không localStorage, audit |
| Team capacity | Trung bình | Trễ | Cắt scope; ưu tiên Phase 1–2 |

### 15.2 Quyết định cần chốt

| Quyết định | Lựa chọn | Đề xuất | Vì sao |
|---|---|---|---|
| Stack | Node+Fastify+Postgres+Redis / Supabase hybrid / khác | Node+Fastify+Postgres; Supabase Auth tùy chọn | Tái dùng shared, kiểm soát luật |
| Auth | Tự quản / Supabase Auth / OAuth | Tự quản hoặc Supabase Auth sau interface | Tránh lock-in; có thể đổi |
| Số nhân vật | 1/server / nhiều slot | 1/server | Đơn giản quyền, leaderboard |
| Offline mode | Giữ / bỏ / tách build | Tách build | Giữ trải nghiệm cũ, tránh lẫn state |
| Realtime | HTTP polling / WS chat / realtime PvP | HTTP MVP; WS chat/presence Phase 3 | Idle không cần realtime |
| Save import | Không / full / capped | Capped + flag | Chống gian lận |
| Monetization | Không / cosmetic / jade | Cosmetic + convenience | Tránh pay-to-win/lạm phát |
| Quy mô launch | 500 / 5k / 20k CCU | 500–1k CCU | Phù hợp MVP |
| Hosting | Tự vận hành / managed | Managed Postgres + Redis, API container | Giảm ops |
| Chat | Không / world / sect | World + sect + private Phase 3 | Nhu cầu xã hội |

---

## 16. Việc cần làm ngay

- [ ] Chốt các quyết định ở 15.2; viết ADR-001 (stack) và ADR-002 (persistence).
- [ ] Mở rộng khung `server/` hiện có + `docker-compose.yml` (Postgres 16, Redis 7) + `.env.example`.
- [ ] Viết migration 0001 core; script `npm run db:migrate`.
- [ ] Implement `PostgresPlayers` với `transact`, row lock, receipt, outbox; bổ sung và chạy bộ test gameplay/contract.
- [ ] Viết `PlayerService` (khung đã có): principal/account, player ownership, DB clock, RNG seed/counter, ticket tạo nhân vật.
- [ ] Làm auth MVP + `GET /bootstrap` + `POST /players` + `POST /sync` + `POST /commands`.
- [ ] Thêm error envelope, rate limit, request logging, health/metrics, CI.
- [ ] Viết `RemoteSession` + refactor `UI.command` async trên 2–3 screen đầu; đo UX.
- [ ] Tạo online build/config/CSP; staging same-origin; thử cookie/refresh.
- [ ] Load test 500 CCU; security checklist; backup/restore drill.
- [ ] Demo nội bộ; quyết định Go/No-Go cho Phase 3.

---

## Phụ lục A — DDL core

```sql
-- PostgreSQL 16. Chạy trong migration, không chạy tay trên production.
create extension if not exists citext;

create table accounts (
  id uuid primary key default gen_random_uuid(),
  email citext unique,
  password_hash text,
  status text not null default 'active' check (status in ('active','locked','deleted')),
  token_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table auth_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  provider text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (provider, subject)
);

create table auth_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  refresh_token_hash text not null unique,
  family_id uuid not null,
  user_agent text,
  ip inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index auth_sessions_account_idx on auth_sessions (account_id);

create table servers (
  id text primary key,
  name text not null,
  region text not null,
  status text not null default 'open' check (status in ('open','maintenance','closed')),
  content_version text not null,
  min_client_version text not null,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  server_id text not null references servers(id),
  name citext not null,
  status text not null default 'active' check (status in ('active','dead','banned','deleted')),
  revision bigint not null default 0 check (revision >= 0),
  schema_version int not null,
  content_version text not null,
  state jsonb not null,
  state_bytes int not null default 0 check (state_bytes <= 65536),
  rng_seed bytea not null,
  rng_counter bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (account_id, server_id),
  unique (server_id, name)
);
create index players_server_idx on players (server_id, updated_at desc);
create index players_leaderboard_idx on players
  (server_id, ((state->>'realm')::int) desc, ((state->>'stage')::int) desc, updated_at asc);

create table creation_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  server_id text not null references servers(id),
  preview jsonb not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index creation_tickets_account_idx on creation_tickets (account_id, used_at);

create table player_receipts (
  player_id uuid not null references players(id) on delete cascade,
  request_id text not null,
  fingerprint text not null,
  revision bigint not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (player_id, request_id)
);
create index player_receipts_expires_idx on player_receipts (expires_at);

create table outbox (
  id bigint generated always as identity primary key,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  attempts int not null default 0,
  last_error text
);
create index outbox_unpublished_idx on outbox (id) where published_at is null;

create table admin_audit (
  id bigint generated always as identity primary key,
  admin_account_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on admin_audit (created_at desc);
```

Ghi chú:

- `players.state` không chứa `rng_seed`; seed/counter là cột riêng, không trả client.
- `state_bytes` do application set; check constraint bảo vệ DB.
- Unique `(server_id, name)` dùng `citext`; cần filter tên xấu/reserved trước khi insert.
- `auth_sessions` thay cho bảng `refresh_tokens` riêng; nếu cần nhiều refresh token/thiết bị, thêm bảng con.

## Phụ lục B — Ví dụ API

### Tạo preview

```http
POST /api/v1/creation/preview
Authorization: Bearer <access>
Content-Type: application/json

{ "serverId": "live-1" }
```

```json
{
  "ticketId": "01J9Z...",
  "expiresAt": 1793100600000,
  "preview": { "age": 19, "race": "linh", "roots": [72,41,38,55,47], "rootType": "Song" },
  "rollsLeft": 4
}
```

### Tạo player

```http
POST /api/v1/players
Authorization: Bearer <access>
Content-Type: application/json

{
  "ticketId": "01J9Z...",
  "serverId": "live-1",
  "name": "Bạch Thanh Vân",
  "gender": "nu",
  "talent": { "ngoTinh": 8 }
}
```

### Sync

```http
POST /api/v1/players/8f14.../sync
Authorization: Bearer <access>
Content-Type: application/json

{ "lastRevision": 42 }
```

### Conflict

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Tiến trình đã thay đổi. Hãy đồng bộ lại.",
    "retryable": true,
    "details": { "currentRevision": 44 }
  }
}
```

### WebSocket hello

```json
{ "op": "hello", "ticket": "rt_...", "lastEventId": 1024 }
```

```json
{ "op": "hello", "accountId": "acc_...", "playerId": "8f14...", "serverTime": 1793100000000, "heartbeatMs": 25000 }
```

## Phụ lục C — Mapping với code hiện tại

| Hiện tại | Giữ / đổi | Ghi chú |
|---|---|---|
| `engine/protocol/commands.js` | Giữ, mở rộng nhẹ | 46 lệnh; thêm error code ổn định ở giai đoạn 2 |
| `engine/rules/*.js` | Viết lại theo `engine-contract.md` | Thiết kế `advance` có `offline`/`maxSeconds`/`aggregateCombat` ngay từ đầu; không copy luật cũ |
| `engine/state/player.js` | Viết lại V7; thêm migration V8 sau | `normalize` khi load; schema/content version ở DB |
| `server/services/player-service.js` | Viết theo khung | Principal/account, player ownership, DB clock/RNG, ticket, batch |
| `server/repositories/player-repository.js` | Cài bản bộ nhớ cho dev/test | Thêm `PostgresPlayers` cùng contract |
| `client/session/local-session.js` | Giữ cho offline | Thêm `RemoteSession` async |
| `client/persistence/local-store.js` | Chỉ offline | Online dùng IndexedDB read-only cache; không ghi gameplay |
| `client/ui/*` | Refactor dần | `UI.command` async; pending/disable; conflict UX |
| `index.html` CSP | Tách offline/online | Online `connect-src 'self'`; offline giữ `none`/`file:` |
| `_headers` | Bổ sung | HSTS, cache, security headers |
| Bộ test backend (cần bổ sung) | Tạo mới | Contract, concurrency, integration, load, E2E |
| `Hu-gioi` auth/chat/leaderboard | Tham khảo mô hình | Không dùng `save_game()` client-authoritative |

## Phụ lục D — Phạm vi 46 lệnh

| Nhóm | Lệnh | Ghi chú online |
|---|---|---|
| Tu luyện / meta | `breakthrough`, `prestige`, `reincarnate`, `upgrade`, `buyMeta`, `upgradeOffline` | Server-authoritative; `prestige` không có force |
| Inventory | `buy`, `sell`, `equip`, `learn`, `activate`, `use`, `craft`, `forge`, `garden`, `absorb`, `sellYao` | Giá/tỉ lệ server tính |
| Chiến đấu | `strike`, `skill`, `castManual`, `activateArtifact`, `setAuto`, `setEnemyKind`, `travel` | Catch-up/auto server; rate limit |
| Thế giới | `claimQuest`, `claimFragments`, `manualEncounter`, `bid` | `bid` là đấu giá NPC mô phỏng ở MVP |
| Tông môn | `joinSect`, `leaveSect`, `donateSect`, `setBlessing`, `setSectRepeat`, `startSectMission`, `claimSectMission`, `abortSectMission`, `buySect` | MVP mô phỏng per-player; Phase 3 roster/chat thật |
| Bí cảnh / linh căn | `startDungeon`, `abortDungeon`, `temperRoot` | Seed server-only; job params freeze |
| Social | `meetFriend`, `giftFriend`, `discuss`, `npcGift`, `npcOffer`, `duel` | MVP mô phỏng; Phase 3 thay bằng player thật |

---

*Tài liệu này là kế hoạch thiết kế, không phải cam kết triển khai. Các con số thời gian và tải cần điều chỉnh theo team và dữ liệu load test thực tế.*
