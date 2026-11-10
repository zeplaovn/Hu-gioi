# Bản đồ tài liệu Hư Giới

> Trạng thái: Hiện hành. Mục lục nguồn sự thật; không thay thế sổ quyết định gameplay.

## Hiện hành

| Chủ đề (nguồn sự thật duy nhất) | Tài liệu |
|---|---|
| Kiến trúc runtime Edge/Postgres | [Kiến trúc](architecture.md) |
| Build, migration, deploy, rollback | [Runbook Edge](edge-deployment.md) |
| Secrets, JWT, CSP, Auth, quota | [Bảo mật](security.md) |
| Hợp đồng engine và lệnh | [Engine contract](engine-contract.md) |
| Sinh tử, tiến trình online | [Gameplay V9](gameplay-v9.md) |
| Tài sản xuyên kiếp | [Thiên Mệnh Các](thien-menh-cac.md) |
| Dữ liệu design hiện tích hợp | [Tích hợp thiết kế](design-integration.md) |
| Đồ họa nhân vật | [Bộ nhân vật](player-pack.md) |
| Đồ họa nghề phụ và kinh mạch (tùy chọn) | [Gói asset Đan Các · Lò Rèn · Kinh Mạch Đồ](asset-pack-crafting-meridians.md) |
| Việc chủ dự án cần làm | [Checklist](release-checklist.md) |
| Mục lục | [Bản đồ tài liệu](index.md) |

## Đề xuất (chưa được chốt)

- [Sổ quyết định P0/P1](gameplay-decisions.md) — 30 P0, 14 P1 đang mở.
- [Kiểm kê gameplay](gameplay-audit.md).
- [Nội dung cao giới 5–13](content-draft-realms-5-13.md).
- [Sách nghề và sổ công thức](profession-manuals-proposal.md).
- [Prompt cốt truyện](prompt-story.md).

## Lịch sử (không là nguồn sự thật)

- [Kiểm toán thiết kế](design-audit.md) — bằng chứng cho luật độ khó có chủ ý, còn được test hồi quy dùng.
- [Hướng dẫn Node/SQLite](archive/online-deployment.md) — chỉ cho dev/legacy, còn được test vệ sinh repo dùng.

Đã gỡ khỏi cây (còn trong git, commit `1bd987b`): `docs/archive/backend-plan.md` (kế hoạch backend Node, nguồn của các con số 30 ngày/Elo K=32 trong sổ quyết định) và `docs/archive/supabase-security-setup.md` (thiết lập Supabase cũ, đã được thay bằng [Runbook Edge](edge-deployment.md) và [Bảo mật](security.md)). Xem bằng `git show 1bd987b:docs/archive/<tên-file>`.

## Việc chờ chủ dự án

Xem đủ 9 ô trong [checklist](release-checklist.md): Cloudflare logs; deploy thủ công; consent v5/migration index; Edge environment; Supabase Auth; quota/alert; branch protection; smoke staging/production; P0/P1. **Chưa có mục nào được xác nhận.** [README](../README.md).
