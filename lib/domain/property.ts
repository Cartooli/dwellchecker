import { prisma } from "@/lib/db/client";
import type { PropertyUpsertInput } from "@/types/api";

export async function upsertProperty(input: PropertyUpsertInput) {
  const existing = await prisma.property.findFirst({
    where: {
      street1: input.street1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
    },
  });

  if (existing) {
    return { property: existing, created: false };
  }

  const property = await prisma.property.create({ data: input });
  await prisma.propertyConditionProfile.create({
    data: { propertyId: property.id },
  });
  return { property, created: true };
}

export async function getPropertyDetail(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      profiles: { orderBy: { createdAt: "desc" }, take: 1 },
      riskFlags: true,
      defects: { orderBy: { createdAt: "desc" } },
      inspections: { orderBy: { createdAt: "desc" } },
    },
  });
}
