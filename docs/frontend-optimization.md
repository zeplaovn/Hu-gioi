# Dọn nguồn và tối ưu frontend — Hư Giới

> Trạng thái: Hiện hành.
> Phạm vi: source/Cloudflare Static Assets/UI JavaScript. Không đổi gameplay `engine/`, `data/`, schema Postgres, API hoặc chính sách bảo mật.

## Nguồn sự thật và vệ sinh repository (11/11/2026)

- Runtime production: `dist/` trên Cloudflare Workers Static Assets + Supabase Edge `api` và schema Postgres `game`; không dùng Node/SQLite để phục vụ production.
- UI hiện hành: `client/ui/core.js` bật `release.chat` và `release.ranking`; chat thật có 4 kênh (Thế giới, Tông môn, Đạo hữu, Đạo lữ), bảng xếp hạng theo Lực chiến/Cảnh giới. Tương tác Tri kỷ, Luận kiếm, Đấu giá, NPC tông môn vẫn mô phỏng.
- Auth/consent runtime: `supabase/functions/api/index.ts` và `server/auth/consent.js` dùng `2026-11-11-v7`. Các migration trong `supabase/migrations/` phải áp dụng **theo thứ tự sau khi được duyệt**. Không chạy lại migration đã có.
- Bỏ `supabase/sql/online-social.sql` vì byte-for-byte trùng với `supabase/migrations/20261111015058_online_social_and_indexed_leaderboard.sql`. Giữ nguyên mọi migration đã được version hóa. Không chạy SQL trên production.
- `client/session/local-session.js`, `client/persistence/local-store.js`, Node/SQLite, `docs/archive/` được **giữ** phục vụ dev/test/audit; `build:min` loại bỏ adapter offline khỏi `dist/`. Không tự xóa hình hoặc âm thanh khi chưa chứng minh không được tham chiếu.

## Mốc ban đầu và sau thay đổi (static analysis, không phải Lighthouse/production benchmark)

| Hạng mục | Trước | Sau (thiết kế đã commit) | Kiểm chứng |
|---|---|---|---|
| Stylesheet được tham chiếu trong trang game | 15 | 1 (`assets/styles.<sha256-16>.css`) | `npm run build:min` gọi `tools/check-css-bundle.cjs` |
| Số stylesheet riêng trong `dist/` phục vụ trang game | 15 | 0 (gộp vào 1 asset; vẫn có `css/legal.css`) | Bộ kiểm tra build |
| Callbacks timer log khi hàng đợi rỗng | `setInterval(pumpLog, 24)` (~41,7 callback/s, tính theo cấu hình) | 0 callback/s theo logic của `scheduleLogPump` | `tests/ui-perf-contract.test.cjs` |
| CSS nguồn | 15 file, khoảng 211.114 ký tự (chưa nén) | Không thay source, chỉ gộp ở build | Đối chiếu CSS trước/sau, byte output in ra khi build |
| Edge invocations / SQL / state | Không đo lại ở PR này | Không thay đổi | Giai đoạn backend theo `task.txt` |

**Lưu ý:** số lượng request được đếm theo thẻ `<link>`, không suy ra mức cải thiện LCP/CPU hay chi phí mạng. HTTP/2 có multiplexing; một bundle lớn làm giảm khả năng cache từng phần. Cache `immutable` chỉ áp dụng URL có hash, nên bản phát hành mới luôn có tên mới. `index.html` vẫn `no-cache`; `css/legal.css` vẫn riêng. Nội dung SVG/data URI, `url('../media/...')` giữ nguyên đường dẫn tương đối từ thư mục `assets/`.

## Thay đổi JavaScript ngoài game engine

- `client/ui/shell.js`: log typewriter chỉ đặt timer 24 ms khi có log đang gõ/hàng đợi; tab ẩn không tiếp tục bơm, quay lại tab sẽ khởi động từ chỗ dừng.
- `client/ui/idle-hud.js`: một `MediaQueryList` dùng chung; cache DOM buttons theo `isConnected`; chỉ cập nhật một số nhãn khi nội dung thực sự đổi; dùng chung một timestamp cho thông báo nghề.
- Không đổi thứ tự lệnh, `revision`, RNG, state, cơ chế online hay điều kiện tử vong.

## Kiểm chứng và rollback

Chạy trong checkout đầy đủ với Node.js 24+:

```sh
npm ci
npm run check
npm test
npm run build:min
npm run build:edge
npm run edge:budget
```

Quan sát thêm trên staging: Network waterfall (15 → 1 request CSS), cache headers của `assets/styles.*.css`; Chrome Performance (callback timer khi không có log), ảnh chụp UI desktop/mobile, console error và FCP/LCP p50/p95. Chưa có số đo browser/DB production trong PR này.

Rollback: revert các commit frontend nếu phát hiện lỗi hiển thị hoặc build. Các migration không thay đổi; không cần backfill, thay schema hay phục hồi dữ liệu. Không tự chạy deploy hoặc merge PR.
