import { prisma } from "@/lib/db/client";
import { normalizeEmail } from "@/lib/auth/normalize-email";

/** Links pending invites (same email, no invitee yet) to the signed-in user id. */
export async function linkPendingSharesForUser(userId: string, email: string): Promise<void> {
  const invitedEmail = normalizeEmail(email);
  await prisma.propertyShare.updateMany({
    where: {
      invitedEmail,
      inviteeUserId: null,
      revokedAt: null,
    },
    data: { inviteeUserId: userId },
  });
}
