import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AdminDatabaseTimeoutError, getAdminOverview, isAdminClerkUserId } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    if (!(await isAdminClerkUserId(userId))) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    return NextResponse.json(await getAdminOverview());
  } catch (error) {
    if (error instanceof AdminDatabaseTimeoutError) {
      return NextResponse.json(
        { error: "The database took too long to respond. Please retry." },
        { status: 504 },
      );
    }

    console.error("Could not load admin overview", error);
    return NextResponse.json(
      { error: "The admin overview is temporarily unavailable." },
      { status: 503 },
    );
  }
}
