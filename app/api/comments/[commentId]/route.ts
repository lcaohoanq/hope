import { NextResponse } from "next/server";
import { resolveOwner } from "@/lib/auth";
import { deleteWorkoutComment, updateWorkoutComment } from "@/lib/repositories/workouts";
import { validateCommentBody } from "@/lib/social-validation";

type CommentRouteContext = { params: Promise<{ commentId: string }> };

function authError(status: "signed-out" | "onboarding") {
  return NextResponse.json(
    {
      success: false,
      error: status === "signed-out" ? "Authentication is required." : "Complete onboarding first.",
    },
    { status: status === "signed-out" ? 401 : 403 },
  );
}

function resultError(status: "not-found" | "forbidden") {
  return NextResponse.json(
    {
      success: false,
      error: status === "not-found" ? "Comment was not found." : "You cannot change this comment.",
    },
    { status: status === "not-found" ? 404 : 403 },
  );
}

export async function PATCH(request: Request, context: CommentRouteContext) {
  const owner = await resolveOwner();
  if (owner.status !== "ready") return authError(owner.status);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  const validated = validateCommentBody(body);
  if (!validated.success) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }
  const { commentId } = await context.params;
  const result = await updateWorkoutComment(commentId, owner.profile.id, validated.body);
  if (result.status !== "ready") return resultError(result.status);
  return NextResponse.json({ success: true, comment: result.comment });
}

export async function DELETE(_: Request, context: CommentRouteContext) {
  const owner = await resolveOwner();
  if (owner.status !== "ready") return authError(owner.status);
  const { commentId } = await context.params;
  const result = await deleteWorkoutComment(commentId, owner.profile.id);
  if (result.status !== "ready") return resultError(result.status);
  return NextResponse.json({ success: true, workoutId: result.workoutId });
}
