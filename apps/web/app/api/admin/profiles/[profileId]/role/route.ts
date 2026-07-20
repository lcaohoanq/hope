import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@hope/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminClerkUserId, setAdminManagedProfileRole } from "@/lib/admin";

const roleSchema = z.object({ role: z.enum(["user", "admin"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await isAdminClerkUserId(userId))) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = roleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });

  const { profileId } = await params;
  const actor = await getProfileByClerkId(userId);
  if (actor?.id === profileId) {
    return NextResponse.json({ error: "You cannot change your own admin role." }, { status: 400 });
  }

  const profile = await setAdminManagedProfileRole({ profileId, role: body.data.role });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ id: profile.id, role: profile.role });
}
