export function getClerkErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "errors" in err) {
    const first = (err as { errors?: { message?: string; longMessage?: string; code?: string }[] })
      .errors?.[0];
    return first?.longMessage || first?.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
