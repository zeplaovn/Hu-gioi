import { defineConfig } from "vitest/config";
// Cấu hình riêng để không đọc nhầm vitest.config.ts ở thư mục gốc (thư mục đó chỉ chạy test Edge Function).
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
