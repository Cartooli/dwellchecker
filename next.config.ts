import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { typedRoutes: false },
  poweredByHeader: false,
};

export default config;
