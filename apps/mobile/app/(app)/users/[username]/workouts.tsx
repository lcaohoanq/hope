import type { Workout } from "@hope/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { EmptyState, LoadingState, Muted, Screen, Title } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export default function UserWorkoutsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const profileRes = await client.profiles["by-username"][":username"].$get({
          param: { username },
        });
        const profileData = (await profileRes.json()) as {
          success: boolean;
          profile?: { id: string };
        };
        if (!profileData.success || !profileData.profile) throw new Error("Profile not found.");
        const res = await client.workouts.$get({ query: { userId: profileData.profile.id } });
        const data = (await res.json()) as { workouts?: Workout[] };
        setWorkouts(data.workouts ?? []);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load workouts."));
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, username]);

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <>
            <Title>Workouts</Title>
            <Muted>@{username}</Muted>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={<EmptyState title="No workouts" />}
        renderItem={({ item }) => (
          <Link href={`/(app)/workouts/${item.id}`} asChild>
            <Pressable
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.panel,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{item.type}</Text>
              <Muted>
                {item.date}
                {item.note ? ` · ${item.note}` : ""}
              </Muted>
            </Pressable>
          </Link>
        )}
      />
    </Screen>
  );
}
