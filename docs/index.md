# Bản đồ tài liệu Hư Giới
> Trạng thái: Hiện hành. Các file GAME/SYSTEM là hồ sơ phiên bản hiện tại; tài liệu phụ chỉ ghi chi tiết kỹ thuật và quyết định chưa chốt.

## Đọc trước
- [Tổng hợp công việc](PROJECT-STATUS.md) — duy nhất một sổ việc đã làm, chưa làm và trạng thái.
- [GAME](GAME.md) — luật chơi, UI, mạng xã hội, gameplay.
- [SYSTEM](SYSTEM.md) — kiến trúc, Edge API, auth, database, tối ưu và release.
- [Mục lục](index.md).

## Tài liệu kỹ thuật vẫn còn hiệu lực
- [Admin Console RPC](admin-console.md) — đặc tả kết nối dashboard, migration chưa tự triển khai.
- [Kiến trúc](architecture.md)
- [Hợp đồng engine](engine-contract.md)
- [Gameplay V9](gameplay-v9.md)
- [Thiên Mệnh Các](thien-menh-cac.md)
- [Shop Khởi Nguyên](creation-pavilion-shop.md)
- [Tích hợp dữ liệu thiết kế](design-integration.md)
- [Bộ nhân vật](player-pack.md)
- [Asset nghề và kinh mạch](asset-pack-crafting-meridians.md)
- [Edge deploy/rollback](edge-deployment.md)
- [Dựng lại database test](internal-db-rebuild.md)
- [Bảo mật](security.md)
- [Checklist release](release-checklist.md)

## Thiết kế, dự thảo và bằng chứng chưa bị thay thế
- [Sổ quyết định gameplay](gameplay-decisions.md) — còn các mục P0/P1 chưa duyệt.
- [Kiểm toán độ khó](design-audit.md) — giữ số đo và bằng chứng.
- [Cao giới 5–13](content-draft-realms-5-13.md) — dự thảo.
- [Sách nghề](profession-manuals-proposal.md) — dự thảo.
- [Cốt truyện](prompt-story.md) — tài liệu phát triển.

## Đã loại bản cũ
Đã gỡ các bản chụp cũ: hướng dẫn online Node/SQLite trong `docs/archive/`, kiểm kê gameplay trước chat thật, nhật ký frontend optimization, hotfix chat/rank v9 và production-readiness cũ. Nội dung đang sử dụng đã được đưa vào [GAME](GAME.md), [SYSTEM](SYSTEM.md), [Tổng hợp](PROJECT-STATUS.md); lịch sử vẫn có trong Git. **Không** xóa migration hoặc mã dev/test.

Nguồn yêu cầu backend còn mở: [task.txt](../task.txt) §11 ưu tiên khi mâu thuẫn. Release chỉ khi [checklist](release-checklist.md) có bằng chứng thực tế.
