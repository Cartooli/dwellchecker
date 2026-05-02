"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavAuth() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (!session?.user) {
    return (
      <Link className="link" href="/sign-in">
        Sign in
      </Link>
    );
  }
  return (
    <button className="link" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}
