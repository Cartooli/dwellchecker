import { NextResponse } from "next/server";
import { getPropertyDetail } from "@/lib/domain/property";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const property = await getPropertyDetail(id);
  if (!property) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Property not found" } }, { status: 404 });
  }
  return NextResponse.json({ property });
}
