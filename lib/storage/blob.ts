import { put } from "@vercel/blob";
import { env } from "@/lib/env";

function sanitizeFilename(raw: string): string {
  // Strip path separators and control characters, keep only the basename
  const basename = raw.split(/[/\\]/).pop() ?? "file";
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function storeInspectionFile(
  propertyId: string,
  filename: string,
  body: Buffer | Blob | ReadableStream
) {
  const key = `inspections/${propertyId}/${Date.now()}-${sanitizeFilename(filename)}`;
  const result = await put(key, body, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return result;
}
