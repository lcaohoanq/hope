/** Result of validating a comment body. */
export type CommentBodyValidation =
  | { success: true; body: string }
  | { success: false; error: string };

/**
 * Validate a comment create/update JSON body (`{ body: string }`).
 *
 * @param input - Unknown request body.
 * @returns Trimmed body on success, or an error message.
 */
export function validateCommentBody(input: unknown): CommentBodyValidation {
  if (!input || typeof input !== "object") {
    return { success: false, error: "Request body must include a comment." };
  }
  const value = (input as { body?: unknown }).body;
  if (typeof value !== "string") {
    return { success: false, error: "Comment must be text." };
  }
  const body = value.trim();
  if (!body) return { success: false, error: "Comment cannot be empty." };
  if (body.length > 500) {
    return { success: false, error: "Comment must be 500 characters or fewer." };
  }
  return { success: true, body };
}
