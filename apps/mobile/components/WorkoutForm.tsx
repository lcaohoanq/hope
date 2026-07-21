import { canUserEditPastWorkouts, getTodayInTimezone } from "@hope/shared";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Button, Field, Muted } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";
import type { PickedImage } from "@/lib/workout-images";
import { MAX_WORKOUT_IMAGES } from "@/lib/workout-images";
import type { MobileWorkoutInput } from "@/lib/workouts";

const ACTIVITY_TYPES = [
  { slug: "workout", label: "Workout" },
  { slug: "study", label: "Study" },
  { slug: "other", label: "Other" },
] as const;

type Props = {
  initial?: Partial<MobileWorkoutInput> & { id?: string; existingImageSrcs?: string[] };
  submitLabel: string;
  onSubmit: (input: MobileWorkoutInput & { id?: string }) => Promise<void>;
};

export function WorkoutForm({ initial, submitLabel, onSubmit }: Props) {
  const { user } = useSession();
  const { colors } = useTheme();
  const today = getTodayInTimezone();
  const [date, setDate] = useState(initial?.date ?? today);
  const [type, setType] = useState(initial?.type ?? "workout");
  const [note, setNote] = useState(initial?.note ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [imageSrcs, setImageSrcs] = useState<string[]>(initial?.existingImageSrcs ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pastEditBlocked = useMemo(() => {
    if (!user) return false;
    if (date >= today) return false;
    return !canUserEditPastWorkouts(user);
  }, [date, today, user]);

  async function pickImages() {
    const remaining = MAX_WORKOUT_IMAGES - imageSrcs.length - images.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });
    if (result.canceled) return;
    setImages((prev) => [
      ...prev,
      ...result.assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      })),
    ]);
  }

  async function submit() {
    if (pastEditBlocked) {
      setError("Past-day edits require Pro. Upgrade on the web.");
      return;
    }
    if (!type.trim()) {
      setError("Choose a workout type.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        id: initial?.id,
        date,
        type: type.trim(),
        note: note.trim(),
        isPublic,
        images,
        imageSrcs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <Muted>Type</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ACTIVITY_TYPES.map((option) => (
          <Pressable
            key={option.slug}
            onPress={() => setType(option.slug)}
            style={{
              borderWidth: 1,
              borderColor: type === option.slug ? colors.accent : colors.border,
              backgroundColor: type === option.slug ? colors.accent : colors.panel,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: type === option.slug ? "#fff" : colors.text }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field label="Note" value={note} onChangeText={setNote} multiline />
      <Button
        label={isPublic ? "Public workout" : "Private workout"}
        variant="ghost"
        onPress={() => setIsPublic((value) => !value)}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {imageSrcs.map((src) => (
          <Pressable
            key={src}
            onPress={() => setImageSrcs((prev) => prev.filter((s) => s !== src))}
          >
            <Image source={{ uri: src }} style={{ width: 72, height: 72, borderRadius: 8 }} />
          </Pressable>
        ))}
        {images.map((image) => (
          <Pressable
            key={image.uri}
            onPress={() => setImages((prev) => prev.filter((item) => item.uri !== image.uri))}
          >
            <Image source={{ uri: image.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
          </Pressable>
        ))}
      </View>
      <Button label="Add photos" variant="ghost" onPress={() => void pickImages()} />
      {pastEditBlocked ? (
        <Muted>Editing past workouts is a Pro feature. You can still log today.</Muted>
      ) : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button
        label={submitLabel}
        onPress={() => void submit()}
        disabled={busy || pastEditBlocked}
      />
    </View>
  );
}
