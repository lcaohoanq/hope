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

async function fetchWorkoutCount(userId: string) {
  try {
    const client = await getServerApiClient();
    const res = await client.workouts.count.$get({ query: { userId } });
    if (!res.ok) return 0;
    const data = await res.json();
    return "count" in data ? data.count : 0;
  } catch (error) {
    console.error("Unable to fetch workout count:", error);
    return 0;
  }
}

export const getProfile = cache(fetchProfile);
export const getWorkoutCount = cache(fetchWorkoutCount);
