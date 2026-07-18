import type { FeedItem } from "@hope/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { EmptyState, LoadingState, Muted, Screen } from "@/components/ui";
import { WorkoutCard } from "@/components/WorkoutCard";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export default function FeedScreen() {
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextCursor?: string, replace = false) => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const res = await client.feed.$get({ query: { cursor: nextCursor } });
        const payload = (await res.json()) as {
          items?: FeedItem[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Unable to load feed.");
        setItems((prev) => (replace ? (payload.items ?? []) : [...prev, ...(payload.items ?? [])]));
        setCursor(payload.nextCursor ?? undefined);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load feed."));
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load(undefined, true);
    }, [load]),
  );

  if (loading && items.length === 0) {
    return (
      <Screen>
        <LoadingState label="Loading feed…" />
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Muted>Following activity</Muted>
        <Link href="/(app)/search" asChild>
          <Pressable>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>Search</Text>
          </Pressable>
        </Link>
      </View>
      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.workout.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <EmptyState title="No posts yet" body="Follow people to fill your feed." />
        }
        renderItem={({ item }) => <WorkoutCard item={item} />}
        onEndReached={() => {
          if (cursor) void load(cursor);
        }}
        onEndReachedThreshold={0.4}
      />
    </Screen>
  );
}
