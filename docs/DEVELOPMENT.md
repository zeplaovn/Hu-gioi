# Development Guide

Tài liệu này là checklist làm việc cho repo `Hu-gioi`.

## Trước khi thêm code

Xác định feature thuộc lớp nào:

- luật/state nền: `src/game/core/`
- hệ thống gameplay độc lập: `src/game/features/`
- render/interaction: `src/ui/`
- network/Auth/Supabase: `src/services/`
- cross-cutting infrastructure: `src/platform/`
- công cụ dev/build/simulation: `scripts/`
- schema/RPC/RLS: `supabase/migrations/`

Không tạo file ở root nếu file đó thuộc một nhóm trên.

## Quy ước file mới

- dùng `snake_case.js` để đồng bộ với code hiện tại;
- tên file mô tả trách nhiệm, không dùng tên kiểu `utils2.js`, `new.js`, `temp.js`, `fix.js`;
- file tạm để debug/redeploy không commit vào repo;
- roadmap/product note không đặt trong `.txt` ở root; nội dung public đưa sang wiki, nội dung kỹ thuật đưa vào `docs/`.

## Thay đổi database

1. Không sửa migration production cũ để "cho đẹp".
2. Tạo migration mới với timestamp lớn hơn file hiện tại.
3. Ghi rõ lý do nếu migration chỉ phục vụ compatibility/cleanup.
4. Cập nhật `supabase/README.md` nếu migration ảnh hưởng setup hoặc vận hành.
5. Không copy schema sang repo dashboard.

## Thay đổi Admin Console

Nếu game cần đọc trạng thái admin/server:

- game chỉ gọi RPC công khai an toàn như `server_status()` hoặc RPC player-scoped;
- không đưa admin role check vào client làm security boundary;
- action admin phải được authorize trong PostgreSQL và ghi audit khi phù hợp.

## Docs ownership

- `README.md`: giới thiệu game, cách chạy, feature overview.
- `docs/ARCHITECTURE.md`: ranh giới module và hướng scale.
- `docs/DEVELOPMENT.md`: workflow và hygiene.
- `SECURITY.md`: threat model/security controls.
- `supabase/README.md`: database setup, migration, admin bootstrap.
- `Hu-gioi-wiki`: tài liệu gameplay/roadmap dành cho người đọc bên ngoài.

Không lặp cùng một hướng dẫn triển khai chi tiết ở 3 nơi. Nếu nội dung có một nguồn chuẩn, file khác chỉ link tới nguồn đó.

## Cleanup định kỳ

Trước khi xóa file:

1. search tên file/path trong repo;
2. kiểm tra build script/asset manifest;
3. kiểm tra README/docs có reference không;
4. với migration đã từng deploy: **không xóa chỉ vì cũ**;
5. với asset source: phân biệt `assets/` runtime và `assets_src/` source pipeline.

Có thể xóa ngay khi xác định rõ:

- file trigger redeploy tạm;
- note roadmap cũ đã có nguồn chuẩn khác;
- schema prototype trùng/khác production;
- output build đã được ignore;
- file backup local/editor artifact.

## Test

Các lệnh hiện có:

```bash
npm test
npm run build
npm run serve
npm run mock
```

Không coi build thành test gameplay. Khi thay đổi JS logic quan trọng, chạy `npm test`. Khi thay đổi build/security config, chạy thêm `npm run build` với env phù hợp.

SQL tests nằm trong `supabase/tests/` và cần môi trường PostgreSQL/Supabase phù hợp.

## Checklist trước deploy

- không có secret trong diff;
- không có file tạm ở root;
- migration mới có thứ tự đúng;
- docs liên quan đã cập nhật;
- đường dẫn asset/script không bị đổi mà quên `index.html` hoặc manifest;
- test/build cần thiết đã chạy;
- maintenance không bị bỏ quên ở trạng thái bật.
