import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    env: {
      CLERK_SECRET_KEY: "sk_test_vitest",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_vitest",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
