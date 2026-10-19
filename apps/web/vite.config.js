import { defineConfig } from "vitest/config";

// Không framework: chỉ dùng Vite để gom ES modules, nạp biến PUBLIC_* và biên dịch @hu-gioi/game-core (TypeScript nguồn trong workspace).
export default defineConfig({
  // Giữ nguyên tên biến PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY như bản trước (chỉ khóa công khai).
  envPrefix: ["PUBLIC_"],
  // Mã đã gom nằm ở /bundle để không lẫn với thư mục /assets (ảnh, nền parallax) trong public/.
  build: { target: "es2022", sourcemap: false, assetsDir: "bundle" },
  test: { include: ["test/**/*.test.js"], environment: "node" },
});
