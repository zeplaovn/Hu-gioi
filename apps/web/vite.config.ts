import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  // game-core là mã TypeScript nguồn trong workspace: để Vite biên dịch trực tiếp.
  ssr: { noExternal: ["@hu-gioi/game-core"] },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
