import { auth } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/client";
import { userCanWriteProperty } from "@/lib/auth/property-access";
import { normalizeEmail } from "@/lib/auth/normalize-email";

const Body = z.object({
  email: z.string().email(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const { id: propertyId } = await ctx.params;
  if (!(await userCanWriteProperty(userId, propertyId))) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const invitedEmail = normalizeEmail(parsed.data.email);

  try {
    await prisma.propertyShare.create({
      data: {
        propertyId,
        invitedEmail,
      },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: { code: "DUPLICATE_INVITE", message: "That email is already invited for this property" } },
        { status: 409 }
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
