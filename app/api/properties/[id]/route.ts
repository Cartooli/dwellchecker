import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPropertyDetailForViewer } from "@/lib/domain/property";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const property = await getPropertyDetailForViewer(id, userId);
  if (!property) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Property not found" } }, { status: 404 });
  }
  return NextResponse.json({ property });
}
