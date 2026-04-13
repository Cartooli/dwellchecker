import { prisma } from "@/lib/db/client";

export async function userCanReadProperty(userId: string, propertyId: string): Promise<boolean> {
  const n = await prisma.property.count({
    where: {
      id: propertyId,
      OR: [
        { ownerUserId: userId },
        {
          shares: {
            some: {
              inviteeUserId: userId,
              revokedAt: null,
            },
          },
        },
      ],
    },
  });
  return n > 0;
}

export async function userCanWriteProperty(userId: string, propertyId: string): Promise<boolean> {
  const n = await prisma.property.count({
    where: { id: propertyId, ownerUserId: userId },
  });
  return n > 0;
}
