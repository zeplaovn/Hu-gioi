# Development v3

## Cài đặt

Node.js 20+ (CI dùng Node 22):

```bash
npm install
```

Chạy Fastify và Vite ở hai terminal:

```bash
npm run dev:api
npm run dev:web
```

## Nguyên tắc code

- Gameplay formula/data: `apps/web/src/game/`.
- React presentation: `apps/web/src/components`, `screens`, `features`.
- Network/auth/cloud: `apps/web/src/services` và `apps/api/src`.
- Không thêm business logic vào component nếu có thể đặt ở reducer/rules.
- Không gọi Supabase player-private trực tiếp từ React ngoài flow Auth; gameplay data đi qua Fastify.
- Không đưa secret server-side vào browser.

## Kiểm thử

`npm test` chạy regression test domain không cần browser. `npm run build` là gate cho JSX/Vite/module graph.

## Migration save

Thay đổi schema save phải tăng `GAME_VERSION` và thêm adapter trong `normalizeSave()`; không phá save đang tồn tại nếu có thể tránh.
