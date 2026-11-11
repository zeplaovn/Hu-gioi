# Hư Giới — kế hoạch chuẩn bị bản production (nhánh `final`)

> Trạng thái: Hiện hành. **Kế hoạch chuẩn bị, CHƯA SẴN SÀNG production.**
> Ngày đối chiếu: 11/11/2026.
> Nguồn chỉ đạo: [`task.txt`](../task.txt), toàn bộ 11 mục được lưu nguyên văn; **mục 11 có ưu tiên cao nhất khi có mâu thuẫn**.
> Nhánh `final` bắt đầu từ `perf/cleanup-css-ui-20261111` (PR #70). Không tự merge, migrate hoặc deploy production.

## 1. Baseline và phạm vi đã có bằng chứng

- `main` chưa chứa PR #70. Trên commit `8eb12e67` của nhánh tối ưu, GitHub Actions đã xác nhận: Security regression, UI mobile verification, Release dependency/secret audit và Limited-release Chromium smoke **đều đạt**. Bản `final` sau khi thêm task/tài liệu **phải chạy CI riêng**.
- `npm run check`: 4/4; `npm test`: 316/316 trong workflow Security regression của PR #70. `npm run build:min` xuất một CSS production từ 15 stylesheet, **193.944 byte trước gzip/Brotli** (theo log CI); không suy ra Web Vitals từ số đó.
- `edge:budget` trong CI cũ mô phỏng **408.000 Edge calls/tháng / 50 người chơi**, **không gồm chat/retry/nhiều tab**. Đây không phải lưu lượng production và chưa xác minh quota Free tại thời điểm triển khai.
- Runtime được đối chiếu: `client/ui/core.js` bật `release.chat=true`, `release.ranking=true`; chat client còn polling 6 giây; tài liệu trước đó có dòng “đang ẩn” là cũ. State V9, protocol V2, 48 lệnh.
- API Edge dùng policy `2026-11-11-v7`, **không phải v5**. Trạng thái policy/migration thật ở Supabase production **chưa xác minh**.
- Không có thay đổi luật game, SQL migration hoặc triển khai backend trong nhánh `final` ở bước chuẩn bị này.

## 2. Ưu tiên triển khai theo task (phải thực hiện trong PR riêng)

| Mốc | Công việc | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|
| **F0 / P0** | Đo theo route: Edge calls/giờ, SQL round-trips, write/WAL, egress, p50/p95, CPU; kịch bản 50/500/5.000 người | Bảng baseline, `npm run edge:budget`, `tools/simulate-edge-calls.cjs`, số đo môi trường test và nguồn quota chính thức | Chưa thực hiện |
| **F1 / P1** | Chat **1 tin/15 giây**, tin đọc có TTL 1 giờ và xóa vật lý sớm sau đó | Test giới hạn cạnh tranh, lọc thời gian cả lịch sử/poll, idempotency, dọn thực tế, rollback và UX đếm ngược | Chưa thực hiện |
| **F1 / P1** | Chat giảm poll còn ~8–12 giây **chỉ khi chat mở và tab hiện**, bỏ heartbeat/count mỗi poll; cache/isolate theo kênh nếu phù hợp | Đo Edge calls và SQL/route; so p95, độ trễ nhận tin; không để stale private channel | Chưa thực hiện |
| **F1 / P1** | Xếp hạng **snapshot 12 giờ/lần** theo Lực chiến và Cảnh giới | Test snapshot, tuổi dữ liệu hiển thị, loại nhân vật chết, không mất kiểm tra `sect_id`; không viết theo heartbeat | Chưa thực hiện |
| **F2 / P2** | Sync thích ứng, auth/consent cache, giảm DB write/round-trip và payload; cân nhắc lazy state | Test online-only, tab ẩn/hiện, revision/RNG/idempotency không đổi, p95 không xấu hơn baseline | Chưa thực hiện |
| **F3 / P3** | Receipt TTL/compact, `pavilion_receipts` retention, chat ephemeral/UNLOGGED, cleanup ticket, TOAST/HOT/leaderboard indexes | Chính sách retention cho từng bảng; đo WAL/bloat; migration additive + backfill + rollback | Chưa thực hiện |
| **F4** | Kiểm thử release trên staging, rollback rehearsal và phê duyệt production | Tất cả gate trong [release-checklist](release-checklist.md) đạt và có bằng chứng | Chưa thực hiện |

**Thứ tự xử lý:** giảm tải backend → giảm lưu trữ → giữ UX mượt → bảo mật thiết yếu. Tránh thêm lớp bảo vệ phức tạp không cần thiết theo quyết định ở mục 11.3.

## 3. Quy tắc không được tự thay đổi

- Backend/server là nguồn sự thật của thời gian, state, RNG, vật phẩm/giá/thưởng; JWT, quyền sở hữu, RLS, Data API private, truy vấn tham số hóa và consent giữ nguyên.
- Mọi cơ chế idempotency phải giữ bảo đảm replay/concurrency, không bỏ receipt trước khi có cơ chế thay thế được kiểm thử.
- Không xóa bảng dữ liệu đang hoạt động hoặc bỏ trigger trước khi người đọc mới đã chuyển đổi và có rollback. Đề xuất `UNLOGGED`, TTL, `pg_cron` cần kiểm chứng điều kiện Supabase và số đo thật; không xem là mặc định sẵn sàng.
- `docs/gameplay-decisions.md` còn mô tả Thiên Tinh/Thiên Mệnh Các xuyên kiếp, trong khi `PlayerService.resetAfterDeath()` và `PostgresPlayers.deletePlayer()` đang xóa kho sau tử vong. **Mâu thuẫn này phải được người sở hữu game duyệt trước production; không âm thầm sửa engine/data hoặc công bố mô tả trái runtime**.
- Bảo toàn tài khoản/người chơi thật: mọi smoke test dùng tài khoản test riêng, không xóa production, không chạy migration thật từ CI của PR.
- Bảng xếp hạng 12 giờ không được thay đổi luật xếp lại từ đầu sau tử vong; không được hiển thị nhân vật đã chết từ snapshot cũ sau khi người chơi reset nếu yêu cầu hiện tại là loại họ ngay (cần thiết kế invalidate/filter và test).
- Giới hạn 1 tin/15 giây phải là **rate limit server-side**, đồng hồ client chỉ giúp UX; không dùng cache trả nhầm tin giữa kênh tông môn.

## 4. Gate triển khai

1. **Source gate:** duyệt `task.txt` là nguồn yêu cầu; xóa/đánh dấu mọi mô tả mâu thuẫn trong bộ tài liệu release sau khi có quyết định gameplay. Build `dist/` không chứa server/tests/secrets. Tất cả checks nhánh `final` xanh.
2. **Backend gate:** từng mục F1/F2/F3 có PR riêng, test tự động, benchmark trước/sau, kế hoạch rollback; tính năng mới bật qua feature flag/canary. Không đặt mặc định khi S0 hoặc gameplay còn chưa được duyệt.
3. **Database gate:** backup/restore trên DB thử; đối chiếu migration history, policy consent v7, quyền schema; migration additive staging trước, không DROP production.
4. **Product gate:** chat đủ 4 kênh, rate limit/TTL đúng, bảng xếp hạng đúng nhịp và quy tắc chết, PvE/tu luyện online, 12 chính kinh/8 kỳ kinh, bản đồ, cửa sổ desktop, quest, đăng nhập đều có smoke và kiểm tra trên màn hình nhỏ.
5. **Operations gate:** xác nhận quota, cấu hình môi trường Supabase/Cloudflare, giám sát tỷ lệ lỗi/latency/Edge calls/storage, cảnh báo ngân sách, runbook sự cố và kịch bản rollback staging.
6. **Release approval:** người sở hữu dự án đánh dấu các gate hoàn thành bằng bằng chứng trước khi merge `final` vào `main` hoặc chạy workflow deploy thủ công.

## 5. Lệnh kiểm chứng trên checkout nhánh final

```sh
npm ci
npm run check
npm test
npm run build:min
npm run build:edge
npm run edge:budget
node tools/simulate-edge-calls.cjs
```

Đối chiếu các workflow GitHub Actions: `security-tests.yml`, `ui-verification.yml`, `release-security-audit.yml`, `release-browser-smoke.yml`. Công việc production cần thêm test PostgreSQL test/staging, `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements` và latency thực; **CI green không đồng nghĩa sẵn sàng production**.
