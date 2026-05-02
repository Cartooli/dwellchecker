import { auth as nextAuth } from "@/auth";

/** Clerk-shaped wrapper so existing route handlers can keep `const { userId } = await auth()`. */
export async function auth(): Promise<{ userId: string | null; email: string | null }> {
  const session = await nextAuth();
  return {
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };
}
