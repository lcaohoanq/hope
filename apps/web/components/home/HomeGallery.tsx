import { HomeGallerySection } from "@/components/home/HomeGallerySection";
import { getServerApiClient } from "@/lib/api";

export async function HomeGallery() {
  const client = await getServerApiClient();
  const response = await client.public.gallery.$get({ query: { limit: "12" } });
  const payload = response.ok
    ? ((await response.json()) as {
        success: true;
        profile: { username: string; displayName: string };
        items: Array<{ image: string; text: string }>;
      })
    : null;

  return (
    <HomeGallerySection
      items={payload?.items ?? []}
      profileLabel={
        payload ? payload.profile.displayName || `@${payload.profile.username}` : undefined
      }
    />
  );
}
