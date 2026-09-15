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
    include: ["src/**/*.test.ts"],
    // Integration tests hit the real Supabase project over the network —
    // they run only via `npm run test:integration`, never as part of the
    // fast default suite.
    exclude: ["**/node_modules/**", "src/test/integration/**"],
  },
});
