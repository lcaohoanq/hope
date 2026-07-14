import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { updateProfileTheme } from "@/lib/repositories/profiles";
import { isAppTheme } from "@/lib/users";

export async function PATCH(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  if (owner.status === "onboarding")
    return NextResponse.json(
      { success: false, error: "Complete onboarding before updating settings." },
      { status: 403 },
    );

  let body: { theme?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (!isAppTheme(body.theme))
    return NextResponse.json(
      { success: false, error: "Theme must be light or dark." },
      { status: 400 },
    );

  try {
    const settings = await updateProfileTheme(owner.profile, body.theme);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Unable to update user settings.", error);
    return NextResponse.json(
      { success: false, error: "Unable to update user settings." },
      { status: 500 },
    );
  }
}
