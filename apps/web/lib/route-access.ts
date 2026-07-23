const clerkRoutes = [
  /^\/$/,
  /^\/(?:feed|notifications|leaderboard|onboarding)\/?$/,
  /^\/pricing(?:\/|$)/,
  /^\/workouts\/[^/]+\/?$/,
  /^\/(?:login|sign-up)(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/api\/admin(?:\/|$)/,
  /^\/auth\/(?:continue|resolve)\/?$/,
  /^\/settings\/profile\/?$/,
  /^\/__clerk(?:\/|$)/,
];

export function isProfileRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const isProfilePage = segments.length === 1;
  const isProfileSubpage =
    segments.length === 2 &&
    (segments[1] === "followers" || segments[1] === "following" || segments[1] === "workouts");

  return isProfilePage || isProfileSubpage;
}

export function requiresClerk(pathname: string) {
  if (clerkRoutes.some((route) => route.test(pathname))) return true;
  return isProfileRoute(pathname);
}
