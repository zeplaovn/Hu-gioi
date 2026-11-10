# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên tiếng Việt. **Bản phát hành thử nghiệm giới hạn chưa được xác minh sẵn sàng cho người chơi production.**

## Kiến trúc

- Cloudflare Workers Static Assets phục vụ `dist/` do `npm run build:min` tạo.
- Supabase Auth đăng nhập trực tiếp (`HU_AUTH_MODE='direct'`) và một Edge Function `api` Deno (`HU_API_BASE` trong `client/config.js`).
- Postgres schema `game` qua transaction pooler 6543; engine và server chạy ở Edge. Node/SQLite chỉ dành cho dev/test.
- State V9, protocol v2, 48 lệnh. Không có gameplay offline hoặc guest.
- Tri kỷ, Đạo hữu, Luận kiếm, Đấu giá, Tông môn là NPC/mô phỏng; chat và bảng xếp hạng đang ẩn.

## Kiểm thử (Node.js 24+)

```sh
npm ci
npm run check
npm test
npm run build:min
npm run build:edge
```

`npm start` dùng Node/SQLite dev, không phải production. `npm run edge:budget` chỉ mô phỏng lưu lượng.

## Tài liệu và bàn giao

- [Mục lục và nguồn sự thật](docs/index.md).
- [Kiến trúc](docs/architecture.md), [bảo mật](docs/security.md), [hợp đồng engine](docs/engine-contract.md).
- [Runbook Edge](docs/edge-deployment.md), [checklist chủ dự án](docs/release-checklist.md).
- [Gameplay V9](docs/gameplay-v9.md), [Thiên Mệnh Các](docs/thien-menh-cac.md).
- [Các quyết định P0/P1 còn mở](docs/gameplay-decisions.md).

**Không tự chạy migration thật, deploy production hoặc merge PR khi chưa được duyệt.**
