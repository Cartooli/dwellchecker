import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    env: {
      AUTH_SECRET: "test-secret-min-16-chars",
      EMAIL_SERVER: "smtp://test:test@localhost:2525",
      EMAIL_FROM: "test@example.com",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
