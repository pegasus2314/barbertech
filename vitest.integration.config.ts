import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.test.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    hookTimeout: 20000,
    testTimeout: 20000,
    // These hit the real Supabase project (real Postgres/RLS/Auth) — not
    // mocked. Run sequentially and only via `npm run test:integration`,
    // never as part of the default `npm test`.
    fileParallelism: false,
  },
});
