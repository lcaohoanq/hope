import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminOverview, isAdminClerkUserId } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdminClerkUserId(userId))) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  return NextResponse.json(await getAdminOverview());
}
