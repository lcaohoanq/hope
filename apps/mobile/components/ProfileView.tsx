import type { PublicAppUser, SocialSummary, Workout } from "@hope/shared";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FollowButton } from "@/components/FollowButton";
import { Card, LoadingState, Muted } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { getAvatarUrl } from "@/lib/avatar";
import { useStableGetToken } from "@/lib/useStableGetToken";

type ProfilePayload = {
  success: boolean;
  profile?: PublicAppUser;
  social?: SocialSummary;
  error?: string;
};

export function ProfileView({ username, isSelf = false }: { username: string; isSelf?: boolean }) {
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<PublicAppUser | null>(null);
  const [social, setSocial] = useState<SocialSummary | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      const res = await client.profiles["by-username"][":username"].$get({
        param: { username },
      });
      const payload = (await res.json()) as ProfilePayload;
      if (!res.ok || !payload.success || !payload.profile) {
        throw new Error(payload.error ?? "Profile not found.");
      }
      setProfile(payload.profile);
      setSocial(payload.social ?? null);

      if (payload.social?.canViewWorkouts !== false) {
        const [countRes, workoutsRes] = await Promise.all([
          client.workouts.count.$get({ query: { userId: payload.profile.id } }),
          client.workouts.$get({ query: { userId: payload.profile.id } }),
        ]);
        const countData = (await countRes.json()) as { count?: number };
        const workoutData = (await workoutsRes.json()) as { workouts?: Workout[] };
        setCount(countData.count ?? 0);
        setWorkouts(workoutData.workouts ?? []);
      } else {
        setCount(0);
        setWorkouts([]);
      }
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load profile."));
    } finally {
      setLoading(false);
    }
  }, [getToken, username]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error || !profile) {
    return <Text style={{ color: colors.danger }}>{error || "Profile not found."}</Text>;
  }

  const avatarUrl = profile.avatarUrl ?? getAvatarUrl(profile.avatarSeed);

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
      <Card>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pressable
            accessibilityLabel={`View ${profile.displayName}'s avatar`}
            onPress={() => setIsAvatarPreviewOpen(true)}
          >
            <Image source={avatarUrl} style={{ width: 72, height: 72, borderRadius: 36 }} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {profile.displayName}
            </Text>
            <Muted>
              @{profile.username}
              {profile.plan === "pro" ? " · Pro" : ""}
            </Muted>
            {profile.bio?.en || profile.bio?.vi ? (
              <Text style={{ color: colors.text }}>
                {profile.preferredLanguage === "vi"
                  ? profile.bio.vi || profile.bio.en
                  : profile.bio.en || profile.bio.vi}
              </Text>
            ) : null}
          </View>
        </View>
        {social ? (
          <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
            <Link href={`/(app)/users/${username}/followers`} asChild>
              <Pressable>
                <Muted>{social.followersCount} followers</Muted>
              </Pressable>
            </Link>
            <Link href={`/(app)/users/${username}/following`} asChild>
              <Pressable>
                <Muted>{social.followingCount} following</Muted>
              </Pressable>
            </Link>
            <Muted>{count} workouts</Muted>
          </View>
        ) : null}
        {!isSelf && social ? (
          <FollowButton
            profileId={profile.id}
            initialStatus={social.relationshipStatus}
            onChanged={() => void load()}
          />
        ) : null}
      </Card>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAvatarPreviewOpen(false)}
        transparent
        visible={isAvatarPreviewOpen}
      >
        <Pressable
          accessibilityLabel="Close avatar preview"
          onPress={() => setIsAvatarPreviewOpen(false)}
          style={{
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            flex: 1,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Pressable onPress={(event) => event.stopPropagation()}>
            <Image
              contentFit="contain"
              source={avatarUrl}
              style={{
                borderRadius: 160,
                height: 320,
                maxHeight: "80%",
                maxWidth: "80%",
                width: 320,
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "700" }}>Recent workouts</Text>
        {workouts.length === 0 ? (
          <Muted>
            {social?.canViewWorkouts === false ? "This profile is private." : "No workouts yet."}
          </Muted>
        ) : (
          workouts.slice(0, 8).map((workout) => (
            <Link key={workout.id} href={`/(app)/workouts/${workout.id}`} asChild>
              <Pressable
                style={{
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>{workout.type}</Text>
                <Muted>
                  {workout.date}
                  {workout.note ? ` · ${workout.note}` : ""}
                </Muted>
              </Pressable>
            </Link>
          ))
        )}
        <Link href={`/(app)/users/${username}/workouts`} asChild>
          <Pressable>
            <Text style={{ color: colors.accent, fontWeight: "600", marginTop: 8 }}>
              See all workouts
            </Text>
          </Pressable>
        </Link>
      </Card>
    </ScrollView>
  );
}
