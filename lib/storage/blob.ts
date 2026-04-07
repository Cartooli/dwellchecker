import { put } from "@vercel/blob";
import { env } from "@/lib/env";

export async function storeInspectionFile(
  propertyId: string,
  filename: string,
  body: Buffer | Blob | ReadableStream
) {
  const key = `inspections/${propertyId}/${Date.now()}-${filename}`;
  // Private blob store — omit access param so SDK uses store-default
  const result = await put(key, body, {
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  } as never);
  return result;
}
