import { put } from "@vercel/blob";
import { env } from "@/lib/env";

export async function storeInspectionFile(
  propertyId: string,
  filename: string,
  body: Buffer | Blob | ReadableStream
) {
  const key = `inspections/${propertyId}/${Date.now()}-${filename}`;
  const result = await put(key, body, {
    access: "public",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return result;
}
