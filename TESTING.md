# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence. Without them, vibe coding is just yolo coding. With them, it's a superpower.

## Framework

[Vitest](https://vitest.dev) — modern, fast, zero-config ESM + TypeScript.

## Run tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

CI runs `npm test` on every push and pull request via `.github/workflows/test.yml`.

## Test layout

```
tests/
  ingestion/
    extract-text.test.ts        # dispatcher routing, mocks the pdf extractor
    parse-sections.test.ts      # text → raw findings
  normalization/
    map-raw-findings.test.ts    # raw → normalized defects, multi-rule matching
    dedupe-defects.test.ts      # collapse by (category, component), min/max costs
  scoring/
    decision.test.ts            # recommendation state machine + capital exposure
  integration/
    upload-dedupe-cost.test.ts  # end-to-end pipeline regression for the cost double-count bug
```

## What to test

- **When writing a new function:** write a corresponding test.
- **When fixing a bug:** write a regression test that encodes the exact condition that broke.
- **When adding error handling:** write a test that triggers the error.
- **When adding a conditional (if/else, switch):** write tests for both branches.
- **Never commit code that makes existing tests fail.** Either fix the code or update the test with a clear reason in the commit message.

## What NOT to test (yet)

- The PDF extractor itself — `unpdf` internals are not our code.
- The OCR extractor — mocked at the dispatcher boundary.
- Component rendering — needs `happy-dom` + `@testing-library/react`. Separate effort.
- Prisma-touching API route handlers — needs a test database harness. Separate effort.

Tests in `tests/integration/` are pure-function pipeline tests. They do not hit HTTP, Prisma, or Blob storage.

## Conventions

- One `describe` block per module being tested.
- Test names describe behavior, not implementation: "returns empty array when no rules match" not "regex.test returns false".
- No snapshot tests. They're a maintenance tax.
- Import from `@/lib/...` paths, same as app code.
