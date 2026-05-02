import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    env: {
      AUTH_SECRET: "test-secret-min-16-chars",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "test@example.com",
      INTERNAL_JOB_SECRET: "test-internal-job-secret-min-16",
      CRON_SHARED_SECRET: "test-cron-shared-secret-min-16",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
