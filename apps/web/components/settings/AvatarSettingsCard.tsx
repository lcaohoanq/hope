"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { FaCamera } from "react-icons/fa";
import { AvatarCropDialog } from "@/components/dashboard/AvatarCropDialog";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import type { UploadAvatarResponse } from "@/components/dashboard/workout-api";
import { validateAvatarFile } from "@/lib/avatar-image";
import { getApiErrorMessage } from "@/lib/http";
import { translations } from "@/lib/i18n";
import { getAvatarUrl } from "@/lib/profile-utils";
import type { PublicAppUser } from "@/lib/users";

export function AvatarSettingsCard({ user }: { user: PublicAppUser }) {
  const { getToken } = useAuth();
  const copy = translations[user.preferredLanguage];
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? getAvatarUrl(user.avatarSeed));
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [cropImageName, setCropImageName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    };
  }, [cropImageUrl]);

  function closeCropDialog() {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl("");
    setCropImageName("");
  }

  function selectAvatar(file: File) {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(
        validationError === "too-large"
          ? copy.dashboard.avatarTooLarge
          : copy.dashboard.avatarInvalidType,
      );
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setCropImageName(file.name);
    setCropImageUrl(URL.createObjectURL(file));
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.set("avatar", file);
    setIsUploading(true);
    setError("");
    setMessage(copy.dashboard.avatarUploadPending);

    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
      const res = await fetch(`${apiUrl}/users/avatar`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await res.json()) as UploadAvatarResponse;
      if (!res.ok || !payload.success) {
        throw new Error("error" in payload ? payload.error : copy.dashboard.avatarUploadFailed);
      }

      setAvatarUrl(payload.avatarUrl);
      setMessage(copy.dashboard.avatarUpdated);
      return true;
    } catch (uploadError) {
      setMessage("");
      setError(getApiErrorMessage(uploadError, copy.dashboard.avatarUploadFailed));
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-panel p-6">
      <h2 className="text-lg font-semibold text-text">{copy.dashboard.uploadAvatar}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border">
          <AvatarImage
            alt={`${user.displayName}'s avatar`}
            className="h-full w-full object-cover"
            sizes="80px"
            src={avatarUrl}
          />
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98]">
          <FaCamera aria-hidden="true" className="h-4 w-4" />
          {isUploading ? copy.dashboard.uploadingAvatar : copy.dashboard.uploadAvatar}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              const [file] = Array.from(event.target.files ?? []);
              event.currentTarget.value = "";
              if (file) selectAvatar(file);
            }}
            type="file"
          />
        </label>
      </div>
      {message || error ? (
        <p
          aria-live="polite"
          className={`mt-3 text-sm font-medium ${error ? "text-danger" : "text-accent"}`}
        >
          {error || message}
        </p>
      ) : null}
      <AvatarCropDialog
        copy={copy}
        error={error}
        imageName={cropImageName}
        imageUrl={cropImageUrl}
        isOpen={Boolean(cropImageUrl)}
        isSaving={isUploading}
        key={cropImageUrl || "closed-avatar-crop"}
        onClose={closeCropDialog}
        onSave={uploadAvatar}
      />
    </section>
  );
}
