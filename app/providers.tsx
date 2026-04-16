"use client";

import { ClerkProvider } from "@clerk/nextjs";

const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to dwellchecker",
    },
  },
  signUp: {
    start: {
      title: "Create your dwellchecker account",
    },
  },
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
  );
}
