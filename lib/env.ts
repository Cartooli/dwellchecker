import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UPLOAD_MAX_BYTES: z.coerce.number().default(25_000_000),
  ENABLE_OCR_FALLBACK: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  OCR_MODEL: z.string().default("anthropic/claude-sonnet-4.5"),
  INTERNAL_JOB_SECRET: z.string().min(16, "INTERNAL_JOB_SECRET must be at least 16 characters"),
  CRON_SHARED_SECRET: z.string().min(16, "CRON_SHARED_SECRET must be at least 16 characters"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = schema.parse(process.env);
