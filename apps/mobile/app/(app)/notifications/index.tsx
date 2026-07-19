import type { AppNotification } from "@hope/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Button, EmptyState, LoadingState, Muted, Screen } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export default function NotificationsScreen() {
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (next?: string, replace = false) => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const res = await client.notifications.$get({ query: { cursor: next } });
        const payload = (await res.json()) as {
          items?: AppNotification[];
          nextCursor?: string | null;
        };
        if (!res.ok) throw new Error("Unable to load notifications.");
        setItems((prev) => (replace ? (payload.items ?? []) : [...prev, ...(payload.items ?? [])]));
        setCursor(payload.nextCursor ?? undefined);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load notifications."));
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

  async function markRead() {
    const token = await getToken();
    const client = getMobileApiClient(token);
    await client.notifications.$patch({ json: {} });
    void load(undefined, true);
  }

  async function handleFollowRequest(profileId: string, action: "accept" | "decline") {
    const token = await getToken();
    const client = getMobileApiClient(token);
    await client["follow-requests"][":profileId"].$patch({
      param: { profileId },
      json: { action },
    });
    void load(undefined, true);
  }

  if (loading && items.length === 0) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Button label="Mark all read" onPress={() => void markRead()} variant="ghost" />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<EmptyState title="You're all caught up" />}
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.panel,
              borderRadius: 12,
              padding: 12,
              gap: 8,
              opacity: item.isRead ? 0.7 : 1,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {item.type.replaceAll("_", " ")}
            </Text>
            {item.actor ? (
              <Link href={`/users/${item.actor.username}`} asChild>
                <Pressable>
                  <Muted>
                    {item.actor.displayName} @{item.actor.username}
                  </Muted>
                </Pressable>
              </Link>
            ) : null}
            {item.workoutId ? (
              <Link href={`/workouts/${item.workoutId}`} asChild>
                <Pressable>
                  <Text style={{ color: colors.accent }}>View workout</Text>
                </Pressable>
              </Link>
            ) : null}
            {item.type === "follow_request" && item.actor ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  label="Accept"
                  onPress={() => {
                    const actorId = item.actor?.id;
                    if (actorId) void handleFollowRequest(actorId, "accept");
                  }}
                />
                <Button
                  label="Decline"
                  variant="ghost"
                  onPress={() => {
                    const actorId = item.actor?.id;
                    if (actorId) void handleFollowRequest(actorId, "decline");
                  }}
                />
              </View>
            ) : null}
          </View>
        )}
        onEndReached={() => {
          if (cursor) void load(cursor);
        }}
      />
    </Screen>
  );
}
