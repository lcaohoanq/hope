import type { ConnectionItem } from "@hope/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { FollowButton } from "@/components/FollowButton";
import { EmptyState, LoadingState, Muted, Screen, Title } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export function ConnectionsScreen({ type }: { type: "followers" | "following" }) {
  const { username } = useLocalSearchParams<{ username: string }>();
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const profileIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (next?: string, replace = false) => {
      try {
        const token = await getToken();
        const client = getMobileApiClient(token);
        let id = profileIdRef.current;
        if (!id) {
          const profileRes = await client.profiles["by-username"][":username"].$get({
            param: { username },
          });
          const profileData = (await profileRes.json()) as {
            success: boolean;
            profile?: { id: string };
          };
          if (!profileData.success || !profileData.profile) throw new Error("Profile not found.");
          id = profileData.profile.id;
          profileIdRef.current = id;
        }
        const res = await client.profiles[":profileId"].connections.$get({
          param: { profileId: id },
          query: { type, cursor: next },
        });
        const payload = (await res.json()) as {
          items?: ConnectionItem[];
          nextCursor?: string | null;
        };
        if (!res.ok) throw new Error("Unable to load connections.");
        setItems((prev) => (replace ? (payload.items ?? []) : [...prev, ...(payload.items ?? [])]));
        setCursor(payload.nextCursor ?? undefined);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load connections."));
      } finally {
        setLoading(false);
      }
    },
    [getToken, type, username],
  );

  useEffect(() => {
    profileIdRef.current = null;
    setLoading(true);
    void load(undefined, true);
  }, [load]);

  if (loading && items.length === 0) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.profile.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <>
            <Title>{type === "followers" ? "Followers" : "Following"}</Title>
            <Muted>@{username}</Muted>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={<EmptyState title="No people here yet" />}
        renderItem={({ item }) => (
          <Pressable
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.panel,
              borderRadius: 12,
              padding: 12,
              gap: 8,
            }}
          >
            <Link href={`/(app)/users/${item.profile.username}`} asChild>
              <Pressable>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {item.profile.displayName}
                </Text>
                <Muted>@{item.profile.username}</Muted>
              </Pressable>
            </Link>
            <FollowButton profileId={item.profile.id} initialStatus={item.relationshipStatus} />
          </Pressable>
        )}
        onEndReached={() => {
          if (cursor) void load(cursor);
        }}
      />
    </Screen>
  );
}
