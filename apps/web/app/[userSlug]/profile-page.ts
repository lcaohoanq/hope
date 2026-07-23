import { cache } from "react";
import { getServerApiClient } from "@/lib/api";

async function fetchProfile(username: string) {
  const client = await getServerApiClient();
  const res = await client.profiles["by-username"][":username"].$get({ param: { username } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success) return null;
  return data;
}

export const getProfile = cache(fetchProfile);
