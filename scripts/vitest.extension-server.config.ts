import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {alias: {"@": fileURLToPath(new URL("../src", import.meta.url))}},
  test: {include: ["src/features/extension-*/**/*.test.ts", "src/app/next-api/extension/**/*.test.ts", "src/app/next-api/admin/extension-metrics/**/*.test.ts"]},
});
