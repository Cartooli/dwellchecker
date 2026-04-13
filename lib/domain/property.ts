import { prisma } from "@/lib/db/client";
import type { PropertyUpsertInput } from "@/types/api";

const propertyDetailInclude = {
  profiles: { orderBy: { createdAt: "desc" as const }, take: 1 },
  riskFlags: true,
  defects: { orderBy: { createdAt: "desc" as const }, take: 200 },
  inspections: { orderBy: { createdAt: "desc" as const } },
} as const;

export async function upsertProperty(input: PropertyUpsertInput, ownerUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.property.findUnique({
      where: {
        address_unique_per_owner: {
          ownerUserId,
          street1: input.street1,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        },
      },
    });

    if (existing) {
      return { property: existing, created: false };
    }

    const property = await tx.property.create({ data: { ...input, ownerUserId } });
    await tx.propertyConditionProfile.create({
      data: { propertyId: property.id },
    });
    return { property, created: true };
  });
}

export async function getPropertyDetail(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: propertyDetailInclude,
  });
}

/** Property + detail graph only if the user may read (owner or active read-only share). */
export async function getPropertyDetailForViewer(propertyId: string, userId: string) {
  return prisma.property.findFirst({
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
    include: propertyDetailInclude,
  });
}

export async function listPropertiesForViewer(userId: string, opts?: { take?: number }) {
  const take = opts?.take ?? 50;
  return prisma.property.findMany({
    where: {
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
    orderBy: { createdAt: "desc" },
    take,
    include: { profiles: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}
