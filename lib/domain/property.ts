import { prisma } from "@/lib/db/client";
import type { PropertyUpsertInput } from "@/types/api";

export async function upsertProperty(input: PropertyUpsertInput) {
  // Use a transaction to atomically find-or-create the property and its
  // initial profile, preventing duplicate properties from concurrent requests.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.property.findUnique({
      where: {
        address_unique: {
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

    const property = await tx.property.create({ data: input });
    await tx.propertyConditionProfile.create({
      data: { propertyId: property.id },
    });
    return { property, created: true };
  });
}

export async function getPropertyDetail(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      profiles: { orderBy: { createdAt: "desc" }, take: 1 },
      riskFlags: true,
      defects: { orderBy: { createdAt: "desc" }, take: 200 },
      inspections: { orderBy: { createdAt: "desc" } },
    },
  });
}
