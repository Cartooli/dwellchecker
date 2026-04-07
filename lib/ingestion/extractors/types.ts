export type ExtractionResult = {
  text: string;
  method: "text" | "pdf" | "json" | "csv";
  pageCount?: number;
  warnings: string[];
};

export class ExtractionError extends Error {
  code: "CORRUPT_PDF" | "SCANNED_PDF" | "PASSWORD_PROTECTED" | "UNSUPPORTED_FORMAT" | "EMPTY";
  constructor(
    code: ExtractionError["code"],
    message: string
  ) {
    super(message);
    this.code = code;
    this.name = "ExtractionError";
  }
}
