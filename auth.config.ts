import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in?check-email=1",
  },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/sign-in") ||
        pathname.startsWith("/sign-up") ||
        pathname.startsWith("/api/auth") ||
        /^\/api\/ingestion\/jobs\/[^/]+\/process$/.test(pathname);
      if (isPublic) return true;
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
