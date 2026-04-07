import { prisma } from "@/lib/db/client";

export async function createIngestionJob(params: {
  propertyId: string;
  inspectionId: string;
  fileUrl: string;
}) {
  return prisma.ingestionJob.create({
    data: {
      propertyId: params.propertyId,
      inspectionId: params.inspectionId,
      fileUrl: params.fileUrl,
      status: "PENDING",
      stage: "INTAKE",
    },
  });
}
