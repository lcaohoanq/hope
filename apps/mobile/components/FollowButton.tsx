import { useAuth } from "@clerk/clerk-expo";
import type { RelationshipStatus } from "@hope/shared";
import { useState } from "react";
import { Text } from "react-native";
import { Button } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage, getMobileApiClient } from "@/lib/api";

export function FollowButton({
  profileId,
  initialStatus,
  onChanged,
}: {
  profileId: string;
  initialStatus: RelationshipStatus;
  onChanged?: (status: RelationshipStatus) => void;
}) {
  const { getToken } = useAuth();
  const { colors } = useTheme();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "self") return null;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const client = getMobileApiClient(token);
      if (status === "following" || status === "pending") {
        const res = await client.profiles[":profileId"].follow.$delete({
          param: { profileId },
        });
        if (!res.ok) throw new Error("Unable to unfollow.");
        setStatus("none");
        onChanged?.("none");
      } else {
        const res = await client.profiles[":profileId"].follow.$post({
          param: { profileId },
        });
        const payload = (await res.json()) as {
          relationshipStatus?: RelationshipStatus;
          status?: RelationshipStatus;
        };
        const next = payload.relationshipStatus ?? payload.status ?? "following";
        setStatus(next);
        onChanged?.(next);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update follow."));
    } finally {
      setBusy(false);
    }
  }

  const label =
    status === "following" ? "Following" : status === "pending" ? "Requested" : "Follow";

  return (
    <>
      <Button label={label} onPress={() => void toggle()} disabled={busy} variant="ghost" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </>
  );
}
