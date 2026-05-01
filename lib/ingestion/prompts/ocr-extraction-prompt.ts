/**
 * OCR / vision extraction prompt for scanned inspection PDFs.
 * Kept as dedicated prompt data (git-versioned) rather than inline literals — easier to diff on model changes.
 */
export const OCR_EXTRACTION_USER_PROMPT =
  "Extract all visible text from this property inspection report. Return plain text only, preserving section headings and line breaks. Do not summarize. Do not add commentary. If the document is blank or contains no readable text, return the single word NONE.";
