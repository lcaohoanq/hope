import type { PublicAppUser } from "@hope/shared";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Field, Muted } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getMobileApiClient } from "@/lib/api";
import { useStableGetToken } from "@/lib/useStableGetToken";

export function UserSearch() {
  const getToken = useStableGetToken();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicAppUser[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        const token = await getToken();
        const client = getMobileApiClient(token);
        const res = await client.users.search.$get({ query: { q: trimmed } });
        const payload = (await res.json()) as { users?: PublicAppUser[] };
        setResults(payload.users ?? []);
      })();
    }, 250);
    return () => clearTimeout(handle);
  }, [getToken, query]);

  return (
    <View style={{ gap: 8 }}>
      <Field label="Search people" value={query} onChangeText={setQuery} autoCapitalize="none" />
      {results.map((user) => (
        <Link key={user.id} href={`/users/${user.username}`} asChild>
          <Pressable
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>{user.displayName}</Text>
            <Muted>@{user.username}</Muted>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
