# Hư Giới — Tổng hợp công việc và trạng thái mới nhất
> Trạng thái: Hiện hành. Đối chiếu GitHub main tại `82da14cd40f78ffa1f82309e604cbdd734acd190` (11/11/2026). Nội dung này phân biệt mã đã merge với deployment và nghiệm thu thực tế.

**Tình trạng phát hành: thử nghiệm nội bộ; chưa xác nhận production-ready.** Đây là **một file tổng hợp duy nhất** về các việc đã làm, còn lại và các quyết định; chi tiết gameplay ở [GAME.md](GAME.md), chi tiết backend ở [SYSTEM.md](SYSTEM.md).

## I. Công việc đã có trên main (có thể kiểm tra bằng mã và lịch sử Git)

| Hệ | Nội dung đã có trong mã/main | Bằng chứng/giới hạn |
|---|---|---|
| GAME | State V10, protocol v4, 52 lệnh; server quyết định thời gian/RNG/state | `engine/`, `data/`, `engine/protocol/commands.js` |
| GAME | Bế quan tu luyện online có báo cáo server; không tự độ kiếp | Nhánh triển khai, cần kiểm thử và triển khai đồng bộ client/Edge |
| GAME | Online-only; tab ẩn/offline không tích lũy; tử vong một mạng, tạo lại không kế thừa | `server/services/player-service.js`, `docs/gameplay-v9.md` |
| GAME | Thiên Tinh và Thiên Mệnh Các trong kiếp hiện tại, quầy starter trước tạo nhân vật | PR #77 đã merge, `tests/creation-pavilion-shop.test.cjs`; **giá test chưa duyệt** |
| GAME | Sự kiện Lịch luyện 45% quái, 30% NPC, 25% kỳ duyên; Tâm Ma | `data/adventures.js`, `engine/rules/adventures.js`; cần duyệt cân bằng |
| GAME | Kinh Mạch Đồ 12 chính kinh (xanh), 8 kỳ kinh (vàng), asset WebP; nghề phụ và UI màn chơi | `docs/asset-pack-crafting-meridians.md`; **kinh mạch mới là hiển thị**, chưa có luật vận hành |
| GAME | Chat 4 kênh, UI messenger desktop-window và mobile, rank Lực chiến/Cảnh giới | PR #78 đã merge; phải thử thiết bị và tài khoản thật |
| SYSTEM | Supabase Auth/JWT, consent v7, private schema game, RLS, receipt/CAS | `server/`, `supabase/`, `docs/security.md` |
| SYSTEM | Schema test nội bộ được dựng lại, migration history chuẩn và kiểm tra tử vong/rank | PR #73; chỉ mô tả môi trường test, **không reset production** |
| SYSTEM | Edge consent v8 và chat/rank hotfix v9 đã báo cáo áp dụng trên test | PR #76 và #78; **chưa có authenticated browser smoke 200** |
| SYSTEM | Source frontend có build CSS bundle/hash; giảm polling chat khi ẩn/đóng | `tools/build-dist.cjs`, `client/session/chat-session.js` |
| DOCS | Tổng hợp GAME/SYSTEM/PROJECT-STATUS, gỡ tài liệu snapshot và chỉnh thông tin lỗi thời | Nhánh `chore/consolidate-game-system-docs-20261111` |

## II. Những việc CHƯA HOÀN THÀNH hoặc chưa đủ bằng chứng

1. **Backend F0:** benchmark thực tế Edge calls/giờ, SQL round-trips, p50/p95 latency, WAL, DB size, byte response/egress; mô hình 50/500/5.000 người. Mô phỏng quota cũ không phải đo production.
2. **Chat F1:** 15 giây/tin ở server và client đã có mã; nhánh `perf/chat-11-1-20261112` đã thêm **TTL 1 giờ, xóa vật lý 5 phút, UNLOGGED, conditional rate limit, cache/singleflight, optimistic send** theo `task.txt` §11.1. **Chưa chạy migration/deploy production** và chưa đo WAL/latency thực tế.
3. **Ranking F1:** hiện có rank live, loại người chết; **ảnh chụp 12 giờ/lần, giảm trigger/ghi DB** chưa triển khai đầy đủ theo §11.2.
4. **Backend F2/F3:** tối ưu sync, xác minh JWT/cache, receipts và retention `pavilion_receipts`, `creation_tickets`, state JSONB, response delta; cần migration additive, rollback, đo trước/sau.
5. **GAME:** luật kinh mạch Z=100, 12 sách nghề, nội dung cao giới và các mục P0/P1 chưa chốt; kinh mạch hiển thị không đồng nghĩa gameplay đã triển khai.
6. **Release:** CI cho commit cuối, test mobile thật 390×844 và desktop, consent/bootstrap, chat/rank JWT 200, reset tử vong, migration, rollback; chủ dự án xác nhận.

## III. Kiểm kê file main trước dọn

- Git tree `main`: **953 file** trong **1.183 entry** gồm thư mục; khoảng **59,47 MiB** file tracked.
- `media/`: **698 file**, khoảng **57,29 MiB**; không phát hiện blob SHA trùng nhau trên toàn cây.
- `docs/`: 23 Markdown gốc. Không xóa asset, mã nguồn, migration, tests hoặc tools chỉ vì tên cũ.
- **Đã chọn loại bỏ khỏi nhánh tổng hợp:** `docs/archive/online-deployment.md`, `docs/gameplay-audit.md`, `docs/frontend-optimization.md`, `docs/chat-rank-404-hotfix.md`, `docs/production-readiness.md`, `docs/REPOSITORY-AUDIT-2026-11-11.md` (audit tạm của nhánh). Nội dung vận hành/việc còn mở được quy về hồ sơ hiện hành; lịch sử vẫn xem trong Git.
- Không xóa `docs/design-audit.md` (bằng chứng thiết kế), `docs/gameplay-decisions.md` (quyết định chưa duyệt), `docs/engine-contract.md` (hợp đồng API), các runbook Edge, SQL/migrations hoặc test.

## IV. Cách sử dụng bộ tài liệu
- **[GAME.md](GAME.md)**: chỉ có luật game, UI, tính năng, gameplay chờ duyệt.
- **[SYSTEM.md](SYSTEM.md)**: runtime, auth, API, DB, performance, release.
- **[docs/index.md](index.md)**: mục lục các tài liệu chuyên môn vẫn còn dùng.
- **[task.txt](../task.txt)**: yêu cầu tối ưu backend; §11 là ưu tiên mới nhất. Mọi hạng mục “đã hoàn thành” phải có code/test/deployment proof tương ứng.

Không coi việc merge tài liệu vào main là cấp phép chạy migration, deploy Supabase/Cloudflare hoặc công bố game.

## V. Xóa tài sản/công cụ đã thay thế (11/11/2026)
- Loại bỏ `media/assets/world/bg/logo.png` (giao diện và preload dùng `logo.webp`) và `media/assets/world/bg/forest.webp` (ảnh nền cũ chỉ còn trong preload, không còn đường hiển thị từ mã client). Xóa đường dẫn preload forest để giảm tải không cần thiết.
- Loại `tools/install-custom-assets.py` — công cụ cài lại ZIP của đợt nhập asset, trong khi toàn bộ 15 WebP đã có sẵn trên Git; không dùng trong CI hay runtime.
- **Giữ** `bi_canh.png` vì đang là fallback khi `bi_canh.webp` thất bại; giữ `tra_cuu_item.html` vì test item-art đọc, giữ atlas, bảng thiết kế, file XLSX/CSV làm nguồn tác giả, assets NPC, và adapters dev/test.
- Không thay đổi API, game rules, Supabase migrations, cơ chế shop/chat/rank hoặc dữ liệu người chơi. Mọi xóa file đều còn trong lịch sử Git.

## VI. Dọn demo/tool — 11/11/2026
- Kiểm kê trên `main` trước đợt này: **1 demo** (`demo/player-pack-preview.html`) và **11 tool** trong `tools/`. Demo sprite độc lập không thuộc giao diện phát hành; đã loại bỏ và thay hướng dẫn thử bằng UI game hiện hành.
- **Không xóa 11 tool còn có điểm sử dụng:** `build-dist.cjs`, `build-edge.cjs`, `check-css-bundle.cjs`, `simulate-edge-calls.cjs` được gọi qua npm; `bench-service.cjs`, `edge-http-smoke.cjs`, `online-ci-server.cjs`, `release-browser-smoke.py`, `release-security-audit.cjs`, `ui-proof.py` được gọi trong GitHub Actions; `backup-db.cjs` còn kiểm thử hồi quy SQLite trong `tests/game-api.test.cjs` (chỉ dành cho dev/test).
- `tools/release-browser-smoke.py` vẫn đang chạy trong CI, nhưng có một số điều kiện kiểm tra chat/ranking ở phiên bản cũ; đây là **nợ bảo trì test cần cập nhật**, không phải tool không dùng. Không bỏ gate browser smoke chỉ để giảm file.
- Không sửa gameplay, backend, SQL, asset dùng trong game, hoặc triển khai production.
