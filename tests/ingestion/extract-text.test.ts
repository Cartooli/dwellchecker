import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pdf extractor BEFORE importing extract-text so the dispatcher picks up the mock.
vi.mock("@/lib/ingestion/extractors/pdf-extractor", () => ({
  extractPdf: vi.fn(async () => ({
    text: "mocked pdf text",
    method: "pdf" as const,
    pageCount: 1,
    warnings: [],
  })),
}));

import { extractFromBuffer, ExtractionError } from "@/lib/ingestion/extract-text";
import { extractPdf } from "@/lib/ingestion/extractors/pdf-extractor";

describe("extractFromBuffer (dispatcher)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes application/pdf to the PDF extractor", async () => {
    const result = await extractFromBuffer(Buffer.from("fake"), "application/pdf", "report.pdf");
    expect(extractPdf).toHaveBeenCalledOnce();
    expect(result.method).toBe("pdf");
  });

  it("routes .pdf filename without explicit content type", async () => {
    const result = await extractFromBuffer(Buffer.from("fake"), "", "report.pdf");
    expect(extractPdf).toHaveBeenCalledOnce();
    expect(result.method).toBe("pdf");
  });

  it("routes text/plain to the text extractor", async () => {
    const result = await extractFromBuffer(
      Buffer.from("ROOF: worn shingles recommend replacement"),
      "text/plain",
      "report.txt"
    );
    expect(extractPdf).not.toHaveBeenCalled();
    expect(result.method).toBe("text");
    expect(result.text).toContain("ROOF");
  });

  it("routes application/json to the text extractor", async () => {
    const result = await extractFromBuffer(
      Buffer.from('{"finding":"electrical panel unsafe"}'),
      "application/json",
      "report.json"
    );
    expect(result.method).toBe("json");
  });

  it("throws UNSUPPORTED_FORMAT for unknown types", async () => {
    await expect(
      extractFromBuffer(Buffer.from("x"), "image/jpeg", "photo.jpg")
    ).rejects.toBeInstanceOf(ExtractionError);
  });
});
