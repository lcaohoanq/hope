import { getUserById, normalizeUserId } from "@/lib/users";

export const AUTH_COOKIE_NAME = "hope_user_id";

export function getAuthenticatedUser(cookieValue?: string | null) {
  const userId = normalizeUserId(cookieValue);

  return userId ? getUserById(userId) : undefined;
}

export function getAuthenticatedUserFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookieValue = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);

  return getAuthenticatedUser(cookieValue ? decodeURIComponent(cookieValue) : null);
}

export function isUserAuthorized(cookieHeader: string | null, userId: string) {
  return getAuthenticatedUserFromCookieHeader(cookieHeader)?.id === userId;
}

export function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//") || value.includes("://")) {
    return null;
  }

  return value;
}
