import { auth, currentUser } from "@clerk/nextjs/server";
import { linkPendingSharesForUser } from "@/lib/auth/link-pending-shares";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
    if (email) {
      await linkPendingSharesForUser(userId, email);
    }
  }
  return <>{children}</>;
}
