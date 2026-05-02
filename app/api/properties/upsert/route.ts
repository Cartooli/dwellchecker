import { auth } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { PropertyUpsertInput } from "@/types/api";
import { upsertProperty } from "@/lib/domain/property";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = PropertyUpsertInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  const { property, created } = await upsertProperty(parsed.data, userId);
  return NextResponse.json({ propertyId: property.id, created });
}
