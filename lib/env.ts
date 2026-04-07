import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UPLOAD_MAX_BYTES: z.coerce.number().default(25_000_000),
  EXTRACTION_API_KEY: z.string().optional(),
  ENABLE_OCR_FALLBACK: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  OCR_MODEL: z.string().default("anthropic/claude-sonnet-4.5"),
  INTERNAL_JOB_SECRET: z.string().default("dev-secret"),
  CRON_SHARED_SECRET: z.string().default("dev-secret"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = schema.parse(process.env);
