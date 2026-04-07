// Stub extractor. Real implementation would call a PDF text extraction provider.
// Returns a list of pseudo-paragraphs from the file URL.
export async function extractText(fileUrl: string): Promise<string> {
  // In production: fetch file, run OCR/PDF parser. For MVP we accept text payloads.
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text") || ct.includes("json")) {
      return await res.text();
    }
    return "";
  } catch {
    return "";
  }
}
