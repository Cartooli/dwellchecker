import { z } from "zod";

export const PropertyUpsertInput = z.object({
  street1: z.string().min(1).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  postalCode: z.string().min(3).max(20),
  yearBuilt: z.number().int().min(1600).max(new Date().getFullYear() + 5).optional(),
});
export type PropertyUpsertInput = z.infer<typeof PropertyUpsertInput>;

export const RawFinding = z.object({
  rawText: z.string(),
  category: z.string().optional(),
  severityHint: z.string().optional(),
});
export type RawFinding = z.infer<typeof RawFinding>;

export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};
