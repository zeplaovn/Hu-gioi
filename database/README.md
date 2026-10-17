# Database boundary

Database V2 tiếp tục dùng Supabase/Postgres.

Trong giai đoạn chuyển đổi, `../supabase/` vẫn là source of truth để không phá migration history và CI hiện tại. Khi backend V2 đã chạy được end-to-end, toàn bộ thư mục `supabase/` sẽ được move nguyên khối vào `database/supabase/` và tooling/CI được cập nhật trong cùng một thay đổi.

## Nguyên tắc

- migration đã apply là immutable;
- schema, constraint, RLS và transaction integrity thuộc database;
- backend là nơi orchestration/business flow được thực thi;
- frontend không truy cập trực tiếp table/RPC dữ liệu game;
- credential đặc quyền chỉ tồn tại ở backend/CI secret store;
- SQL regression tests phải đi cùng thay đổi schema/RPC.

## Cấu trúc đích

```text
database/
  supabase/
    migrations/
    tests/
    config.toml
```
