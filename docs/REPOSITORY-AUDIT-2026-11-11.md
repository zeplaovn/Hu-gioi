# Kiểm kê repository — 11/11/2026

> **Kiểm kê có bằng chứng nhưng chưa đầy đủ toàn cây.** GitHub connector hiện có không cung cấp recursive tree/list-directory; code search trả kết quả rỗng. Không suy diễn rằng mọi file đã được quét. Baseline: main commit `82da14cd40f78ffa1f82309e604cbdd734acd190`; nhánh tài liệu `chore/consolidate-game-system-docs-20261111`.

## Đã đọc trực tiếp (blob SHA xác minh)

| Đường dẫn | Blob SHA | Nhận định |
|---|---|---|
| `README.md` | `f7a25f339bd7496c560ca58cd1d27deafd7f178c` | Hiện hành nhưng câu chat/ranking “đang ẩn” lỗi thời |
| `task.txt` | `7f952f29e6e28ffddd46ba2d604efbe02802a32c` | Giữ; roadmap backend, mục 11 ưu tiên |
| `package.json` | `d431d25f43710f033aac6e72680f5baf741f3ece` | Giữ; Node 24, check/test/build |
| `.gitignore` | `b0f131457eec0b8d76b8ca8fbadb31e0bef26a54` | Giữ; bảo vệ secret/artifact |
| `docs/index.md` | `d8493ce766d5e1f15f4706e79652394e1de3faad` | Đã bổ sung hồ sơ tổng hợp trên nhánh audit |
| `docs/architecture.md` | `[đã đọc]` | Giữ; mô tả chat/rank hiện hành |
| `docs/gameplay-v9.md` | `[đã đọc]` | Giữ; luật chết không kế thừa |
| `docs/frontend-optimization.md` | `2c9583c0854d159512fd7b307c16c33cd7d55a77` | Giữ; bằng chứng cleanup đã làm |
| `docs/production-readiness.md` | `ba2f932fd6d9a212e0478101456e3e2f999bdc91` | Giữ, cần cập nhật số lệnh/poll |
| `docs/release-checklist.md` | `c52952c60e9fa88f425f39ab54834a1c342aeed8` | Giữ, release gate |
| `docs/archive/online-deployment.md` | `2f9c877f075b5bb69e79d36fd0287329dbe0f117` | Legacy dev/test; không xóa trước kiểm tra tham chiếu |
| `docs/design-audit.md` | `52227b38a04eecfee17af895a8a25510066e2355` | Giữ bằng chứng độ khó |
| `docs/gameplay-audit.md` | `1f81aae47aea28302cbcc0c4cfe9152c92b1b7e9` | Bản kiểm kê lịch sử, mô tả chat/rank cũ |
| `docs/edge-deployment.md` | `abdf111807b7ef0551f66a96996657b217ee35fe` | Giữ; có mô tả Thiên Tinh qua kiếp mâu thuẫn |
| `docs/internal-db-rebuild.md` | `dccf2976df9cf320083bdebd8eabfd2563fe05f7` | Giữ; chứng cứ reset test và cảnh báo script phá hủy |
| `docs/chat-rank-404-hotfix.md` | `56950c80c384f84424d6de34465d41b5904bd03c` | Giữ, cập nhật PR #78 đã merge |
| `docs/gameplay-decisions.md` | `d2387a5f4d7e9369e488e9f1913b68465b86e0d9` | Giữ; có mâu thuẫn K03 với gameplay-v9 |

## Phát hiện cần sửa theo mức ưu tiên

### P0 — quyết định gameplay
1. `docs/gameplay-decisions.md` K03: “tạo kiếp mới không mất Thiên Tinh” trái `docs/gameplay-v9.md`: Thiên Tinh và nâng cấp bị xóa khi bắt đầu lại. Phải đối chiếu `server/services/player-service.js`, test và quyết định mới nhất trước khi sửa nội dung; không tự sửa luật.
2. `docs/edge-deployment.md` ghi Thiên Mệnh Các tích lũy qua kiếp, mâu thuẫn mô tả không kế thừa hiện hành. Chưa xác nhận trực tiếp logic reset trong code ở đợt kiểm kê này.

### P1 — tài liệu đã lỗi thời
3. `README.md` ghi chat/ranking đang ẩn, trong khi `docs/architecture.md` ghi bật và PR #78 đã merge vào main.
4. `docs/gameplay-audit.md` là ảnh chụp cũ: chat 404/rank ẩn; không dùng như trạng thái hiện hành.
5. `docs/production-readiness.md` ghi 48 lệnh và chat poll 6s; `docs/gameplay-v9.md` ghi 49 lệnh, hotfix chat ghi 10s khi hiện.
6. `docs/chat-rank-404-hotfix.md` ghi PR giao diện chưa merge; PR #78 đã merge.

### P2 — giữ để tham chiếu
7. `docs/archive/online-deployment.md` mô tả Node/SQLite và consent v5; legacy dev/test, không là hướng dẫn triển khai hiện hành.
8. `docs/frontend-optimization.md` xác nhận `supabase/sql/online-social.sql` đã được bỏ do trùng byte-for-byte migration `20261111015058_online_social_and_indexed_leaderboard.sql`. Không xóa migration gốc.
9. `docs/index.md` ghi hai file archive `backend-plan.md` và `supabase-security-setup.md` đã xóa từ commit cũ, vẫn có thể xem trong Git history.

## Cấu trúc phân loại

- **GAME:** `engine/`, `data/`, `client/`, `css/`, `media/`; hồ sơ `docs/GAME.md`.
- **SYSTEM:** `server/`, `supabase/`, `tools/`, `.github/`, `tests/`; hồ sơ `docs/SYSTEM.md`.
- **TỔNG HỢP:** `docs/PROJECT-STATUS.md`, `docs/index.md`, `task.txt`.
- **LỊCH SỬ:** `docs/archive/` và audit gốc; không được dùng thay nguồn sự thật.

## Chưa được kiểm kê đủ
- Danh sách và kích thước **tất cả** file theo cây Git (recursive tree).
- Tài sản không được tham chiếu, file nhị phân lớn, bản sao hash giống nhau.
- Tất cả `supabase/migrations`, tham chiếu trong tests, workflow và scripts.
- Mọi nhánh/PR chưa merge và trạng thái CI cuối cùng (đã thấy ít nhất 50 nhánh ở trang đầu; có cursor tiếp theo).
- `git ls-files`, `git grep`, `git log --all` và build/test trên toàn cây.

## Điều kiện để xóa file
Chỉ đưa file vào danh sách xóa sau khi có (1) cây file đầy đủ, (2) chứng minh không còn tham chiếu runtime/build/test/migration, (3) phương án thay thế hoặc xác nhận bản sao, (4) commit trên nhánh riêng và (5) CI xanh. Không xóa schema/migration đã triển khai, secrets guard, backup/rollback, hay asset chưa xác nhận không dùng.

**Kết quả lượt này:** kiểm kê tài liệu và rủi ro, **chưa xóa file**.
