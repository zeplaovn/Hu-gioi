# Engineering Docs

Tài liệu kỹ thuật của repo game.

## Mục lục

- `ARCHITECTURE.md` — tổ chức module, dependency boundary và hướng scale project.
- `REFACTOR_PLAN.md` — kế hoạch tách các hotspot theo giai đoạn khi project lớn hơn.
- `DEVELOPMENT.md` — workflow, migration rules, cleanup/hygiene, checklist deploy.
- `../SECURITY.md` — threat model và security boundary hiện tại.
- `../supabase/README.md` — database source of truth, migration order và admin bootstrap.

## Source-of-truth map

```text
Gameplay implementation     js/ + assets/
Database/RPC/RLS             supabase/migrations/
Client security model        SECURITY.md
Engineering architecture     docs/ARCHITECTURE.md
Refactor roadmap kỹ thuật    docs/REFACTOR_PLAN.md
Development workflow         docs/DEVELOPMENT.md
Player-facing wiki/roadmap   zeplaovn/Hu-gioi-wiki
Admin frontend               zeplaovn/Hu-gioi-dashboard
```

Nếu cùng một nội dung xuất hiện ở nhiều nơi, ưu tiên nguồn tương ứng trong bảng trên và sửa các bản copy/link còn lại.
