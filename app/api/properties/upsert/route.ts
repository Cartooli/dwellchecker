import { NextResponse } from "next/server";
import { PropertyUpsertInput } from "@/types/api";
import { upsertProperty } from "@/lib/domain/property";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PropertyUpsertInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  const { property, created } = await upsertProperty(parsed.data);
  return NextResponse.json({ propertyId: property.id, created });
}
