import { useLocalSearchParams } from "expo-router";
import { ProfileView } from "@/components/ProfileView";
import { Screen, Title } from "@/components/ui";
import { useSession } from "@/context/SessionContext";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useSession();
  const isSelf = Boolean(user && user.username === username);

  return (
    <Screen>
      <Title>Profile</Title>
      <ProfileView username={username} isSelf={isSelf} />
    </Screen>
  );
}
