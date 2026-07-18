export function createAvatarSeed(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `profile-${slug || "user"}-${Date.now().toString(36)}`;
}

export function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}`;
}
