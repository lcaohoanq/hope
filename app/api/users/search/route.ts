import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { searchProfiles } from "@/lib/repositories/profiles";
import { toPublicUser } from "@/lib/users";

export async function GET(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  if (owner.status === "onboarding")
    return NextResponse.json(
      { success: false, error: "Complete onboarding first." },
      { status: 403 },
    );

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchProfiles(query);
  return NextResponse.json({ success: true, users: users.map(toPublicUser) });
}
