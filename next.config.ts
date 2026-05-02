import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  typedRoutes: false,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};

export default config;
