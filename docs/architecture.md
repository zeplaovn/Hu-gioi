# Kiến trúc Hư Giới — online-only

> Nguồn sự thật là mã đang chạy trong `engine/`, `server/` và [hợp đồng engine](engine-contract.md).
> **State V9, protocol v2, 48 lệnh, 9 miền luật**. Không có gameplay offline.

## Ranh giới

| Lớp | Trách nhiệm |
|---|---|
| `data/` | Catalog/balance/nội dung thuần, không DOM hoặc mạng. |
| `engine/` | State V9, kiểm lệnh, đúng một rule domain/lệnh; không DOM, `Date.now`, `Math.random` hoặc IO. |
| `client/` | UI classic script, Supabase Auth và `RemoteSession`; chỉ hiển thị snapshot máy chủ. |
| `server/` | JWT/consent, `PlayerService`, giờ/RNG, SQLite/revision/receipt, CORS, rate limit và HTTP. |
| `legacy/` | Adapter offline lịch sử chỉ để kiểm thử/migration, không nạp trong `index.html` và `dist/`. |

Không cần bundler/framework. Node >=24 cho `node:sqlite`.

## Luồng gameplay

```text
UI.command(type, payload)
 → RemoteSession (JWT, requestId, expectedRevision)
 → /api/v1/players/{id}/commands
 → PlayerService → engine/protocol/commands.js → đúng một miền engine/rules/
 → SQLite transaction (state, receipt, phần thưởng)
 → { revision, state, result, logs, report } → UI
```

Máy chủ quyết định thời gian, RNG, giá, kết quả và tài nguyên; client không gửi state để ghi đè và không lưu nhân vật vào `localStorage`. Theo `server/heartbeat-policy.js`: sync mỗi **5 giây**, giới hạn **24 lượt/phút** (burst 8), pause bucket riêng; grace **20 giây**, ẩn tab/offline tạm dừng tất cả tiến trình. Không cộng giờ offline.

Thiên Mệnh Các giữ Thiên Tinh và nâng cấp **theo tài khoản**, độc lập đạo thân tử vong; xem [thien-menh-cac.md](thien-menh-cac.md).

## Frontend và Node API

`client/config.js` là nguồn công khai duy nhất cho `HU_API_ORIGIN`, Supabase URL và publishable key. `tools/build-dist.cjs` sinh `dist/client/config.js`, `dist/index.html` và `dist/_headers` cùng CSP. Node static dùng cùng công thức CSP. Script cổ điển vẫn nạp theo đúng thứ tự `index.html`, không bundle.

Frontend tách API HTTPS được hỗ trợ với `HU_API_ORIGIN` frontend và `HU_ALLOWED_ORIGINS` phía Node. Login gateway/gameplay API đều kiểm allowlist; `HU_AUTH_TRUSTED_PROXY_IPS` chỉ tin IP reverse proxy thực và dùng chung bộ phân giải client IP. `script-src 'self'`, `connect-src` không wildcard. Xem [online-deployment.md](online-deployment.md).

`tools/build-dist.cjs` không đóng gói `server/`, `tests/`, `docs/`, `legacy/` hoặc secrets.

## Thay đổi gameplay sau này

Mọi lệnh mới phải có schema trong `engine/protocol/commands.js`, đúng **một miền** `engine/rules/`, tài liệu [engine-contract.md](engine-contract.md), test và UI tương ứng. Nếu thêm module, cập nhật `engine/game.js` và thứ tự script. Mọi thay đổi state phải có migration an toàn, giữ bản lưu cũ, giới hạn JSON-safe <=64 KB.

Chạy `npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run build:min`. Chat nhiều người, xếp hạng thật, PvP giữa người thật, tông môn chung và market escrow chưa phải tính năng đã hoàn tất; xem [gameplay-decisions.md](gameplay-decisions.md).
