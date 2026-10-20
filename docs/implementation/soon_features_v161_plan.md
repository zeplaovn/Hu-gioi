# Kế hoạch PR hợp nhất: mở 12 mục “Sắp mở” (Thiên Vân Đại Lục v1.6.1)

Trạng thái lúc lập kế hoạch (20/10/2026):
- PR #30 đã merge vào `main`: ưu tiên dữ liệu cân bằng v1.6.1.
- PR #32 đã merge vào `main`, mang theo commit nền thọ nguyên online của PR #31 (commit `2947c196`).
- Tiếp tục toàn bộ phần **chưa triển khai** ở **duy nhất PR #31**, base `main`. Không tạo PR con và không merge nếu chủ dự án chưa duyệt.

## 12 mục trong cùng một PR

| Đợt | Mục | Hoàn thành |
|---|---|---|
| 1 — Vòng chơi | Lịch luyện (combat turn-based có seed/log từ SQL, quái/drop CSV, không chết thật ở nội dung thường) | [ ] |
| 1 — Vòng chơi | Nghỉ ngơi (HP/thể lực, cooldown server) | [ ] |
| 1 — Vòng chơi | Luyện hóa linh thạch (quy đổi giới hạn theo tầng) | [ ] |
| 1 — Vòng chơi | Cửa hàng đan dược (giá động, mua/dùng/buff) | [ ] |
| 1 — Vòng chơi | Công pháp (học/nâng/trang bị, tương hợp) | [ ] |
| 2 — Nhân vật | Linh căn (sinh, khám phá, reroll giới hạn) | [ ] |
| 2 — Nhân vật | Tông môn (gia nhập/rời, nhiệm vụ, cống hiến, shop) | [ ] |
| 2 — Nhân vật | Nghề phụ (luyện đan, luyện khí, linh điền, hàng đợi) | [ ] |
| 3 — Thế giới | Bí cảnh (vé, lượt, chiến đấu, rương thưởng) | [ ] |
| 3 — Thế giới | Kỳ ngộ (RNG/cooldown, log, không offline-death) | [ ] |
| 3 — Thế giới | Bảng xếp hạng (TM, cảnh giới cao nhất, kiếp dài nhất; chỉ đọc, phân trang) | [ ] |
| 3 — Thế giới | Thiên Vân Địa Đồ (ba đại giới, khóa theo cảnh giới, di chuyển server) | [ ] |

PvP chỉ cân nhắc **sau khi hoàn tất 12 mục**, nằm ngoài phạm vi PR này.

## Điều kiện bắt buộc cho từng commit tính năng

1. Ghi thiết kế ngắn: bảng, RPC, endpoint, công thức và nguồn cân bằng (ưu tiên v1.6.1; tham chiếu docs/design và legacy).
2. Dữ liệu tĩnh sửa ở `data/`, sinh migration mới bằng `tools/gen-static.mjs`; không sửa migration đã áp dụng. `pnpm gen:check` xanh.
3. PostgreSQL quyết định trạng thái, phần thưởng và RNG; giao dịch và `FOR UPDATE`; RLS + FORCE, chỉ service_role. Edge xác thực JWT và validate/rate-limit, không chứa game rule.
4. Intent/idempotency cho mọi hiệu ứng; xác nhận hai bước cho nguy cơ chết thật; offline không bao giờ tự gây tử vong.
5. Giao diện HTML/CSS/ES modules thuần, mở mục trong `menu.js` chỉ khi end-to-end chạy thật; không `innerHTML`, mobile không tràn.
6. Test DB (happy/errors/race/replay/permadeath), handler và helper; `pnpm test`, `pnpm build:web`, QA desktop 1366px/mobile 390px, console sạch.
7. Trước merge: cập nhật mô tả PR với migrations, kết quả test, ảnh, rollback và các câu hỏi còn mở.

## Thông số cần xác nhận trước khi đưa vào SQL

- `quai_boss.csv` hiện thiếu HP/ATK/DEF; cần chuẩn hóa tham số theo combat v1.4.1 và dữ liệu v1.6.1, không tự suy ra xác suất chết hoặc drop.
- Nghỉ ngơi bản legacy hồi 50% HP, cooldown 10 giây; v1.6.1 chưa có mốc thể lực. Cần duyệt giới hạn/hồi phục thể lực.
- Khi mô hình 33 ngày v1.6.1 khác bảng kinh tế/progression 60 ngày v1.3, ghi rõ lựa chọn và xin duyệt trước khi đổi số liệu.

**Nguyên tắc vận hành:** một PR duy nhất, nhiều commit nhỏ theo 3 đợt; CI sau từng commit, **không tự merge**.
