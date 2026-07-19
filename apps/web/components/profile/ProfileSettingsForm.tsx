"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AvatarSettingsCard } from "@/components/settings/AvatarSettingsCard";
import { getApiErrorMessage, getClientApiClient } from "@/lib/http";
import { translations } from "@/lib/i18n";
import { getProfileUpdateFieldErrors, profileUpdateSchema } from "@/lib/profile-update";
import { getCanonicalUserPath, type PublicAppUser } from "@/lib/users";
import { PrivacySettingsCard } from "./PrivacySettingsCard";

type ProfileSettingsFormProps = {
  user: PublicAppUser;
};

type ProfileFormState = {
  displayName: string;
  birthYear: string;
  bioEn: string;
  bioVi: string;
  pronounsEn: string;
  pronounsVi: string;
  website: string;
  facebook: string;
  instagram: string;
  linkedin: string;
};

type UpdateProfileResponse =
  | { success: true; profile: PublicAppUser }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

const inputClassName =
  "h-11 w-full rounded-md border border-border bg-panel-muted px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-md border border-border bg-panel-muted px-3 py-3 text-sm leading-6 text-text outline-none transition placeholder:text-muted focus:border-accent focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60";

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const { getToken } = useAuth();
  const copy = translations[user.preferredLanguage];
  const profilePath = getCanonicalUserPath(user);
  const [form, setForm] = useState<ProfileFormState>(() => ({
    displayName: user.displayName,
    birthYear: String(user.birthYear),
    bioEn: user.bio.en,
    bioVi: user.bio.vi,
    pronounsEn: user.pronouns?.en ?? "",
    pronounsVi: user.pronouns?.vi ?? "",
    website: user.website ?? "",
    facebook: user.socialLinks?.facebook ?? "",
    instagram: user.socialLinks?.instagram ?? "",
    linkedin: user.socialLinks?.linkedin ?? "",
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = user.settings.theme;

    return () => {
      if (previousTheme) {
        document.documentElement.dataset.theme = previousTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }
    };
  }, [user.settings.theme]);

  function updateField(field: keyof ProfileFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError("");
    setSubmitMessage("");
    setFieldErrors((current) => {
      const next = { ...current };
      const errorField = getErrorField(field);
      delete next[errorField];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = profileUpdateSchema.safeParse({
      displayName: form.displayName,
      birthYear: Number(form.birthYear),
      bio: { en: form.bioEn, vi: form.bioVi },
      pronouns: { en: form.pronounsEn, vi: form.pronounsVi },
      website: form.website,
      socialLinks: {
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
      },
    });

    if (!result.success) {
      setFieldErrors(getProfileUpdateFieldErrors(result.error));
      setSubmitError(copy.profileSettings.validationFailed);
      return;
    }

    setIsSaving(true);
    setSubmitError("");
    setSubmitMessage("");
    setFieldErrors({});

    try {
      const token = await getToken();
      const client = getClientApiClient(token);
      const res = await client.users.profile.$patch({ json: result.data });
      const payload = (await res.json()) as UpdateProfileResponse;

      if (!payload.success) {
        if ("fieldErrors" in payload && payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }

        throw new Error("error" in payload ? payload.error : copy.profileSettings.saveFailed);
      }

      setSubmitMessage(copy.profileSettings.saveSuccess);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, copy.profileSettings.saveFailed));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <AvatarSettingsCard user={user} />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            @{user.username}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {copy.profileSettings.description}
          </p>
          <p className="mt-2 text-sm text-muted">{copy.profileSettings.usernameLocked}</p>
        </div>
      </div>
      <PrivacySettingsCard user={user} />
      <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
        <FormSection
          description={copy.profileSettings.basicDescription}
          title={copy.profileSettings.basicTitle}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              error={fieldErrors.displayName}
              htmlFor="displayName"
              label={copy.profileSettings.displayName}
            >
              <input
                aria-invalid={Boolean(fieldErrors.displayName)}
                className={inputClassName}
                disabled={isSaving}
                id="displayName"
                maxLength={80}
                name="displayName"
                onChange={(event) => updateField("displayName", event.target.value)}
                value={form.displayName}
              />
            </FormField>
            <FormField
              error={fieldErrors.birthYear}
              htmlFor="birthYear"
              label={copy.profileSettings.birthYear}
            >
              <input
                aria-invalid={Boolean(fieldErrors.birthYear)}
                className={inputClassName}
                disabled={isSaving}
                id="birthYear"
                inputMode="numeric"
                max={new Date().getFullYear()}
                min={1900}
                name="birthYear"
                onChange={(event) => updateField("birthYear", event.target.value)}
                type="number"
                value={form.birthYear}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          description={copy.profileSettings.profileDescription}
          title={copy.profileSettings.profileTitle}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              error={fieldErrors["bio.vi"]}
              htmlFor="bio.vi"
              label={copy.profileSettings.bioVietnamese}
            >
              <textarea
                aria-invalid={Boolean(fieldErrors["bio.vi"])}
                className={textareaClassName}
                disabled={isSaving}
                id="bio.vi"
                maxLength={500}
                name="bio.vi"
                onChange={(event) => updateField("bioVi", event.target.value)}
                value={form.bioVi}
              />
            </FormField>
            <FormField
              error={fieldErrors["bio.en"]}
              htmlFor="bio.en"
              label={copy.profileSettings.bioEnglish}
            >
              <textarea
                aria-invalid={Boolean(fieldErrors["bio.en"])}
                className={textareaClassName}
                disabled={isSaving}
                id="bio.en"
                maxLength={500}
                name="bio.en"
                onChange={(event) => updateField("bioEn", event.target.value)}
                value={form.bioEn}
              />
            </FormField>
            <FormField
              error={fieldErrors["pronouns.vi"]}
              htmlFor="pronouns.vi"
              label={copy.profileSettings.pronounsVietnamese}
            >
              <input
                aria-invalid={Boolean(fieldErrors["pronouns.vi"])}
                className={inputClassName}
                disabled={isSaving}
                id="pronouns.vi"
                maxLength={50}
                name="pronouns.vi"
                onChange={(event) => updateField("pronounsVi", event.target.value)}
                value={form.pronounsVi}
              />
            </FormField>
            <FormField
              error={fieldErrors["pronouns.en"]}
              htmlFor="pronouns.en"
              label={copy.profileSettings.pronounsEnglish}
            >
              <input
                aria-invalid={Boolean(fieldErrors["pronouns.en"])}
                className={inputClassName}
                disabled={isSaving}
                id="pronouns.en"
                maxLength={50}
                name="pronouns.en"
                onChange={(event) => updateField("pronounsEn", event.target.value)}
                value={form.pronounsEn}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          description={copy.profileSettings.linksDescription}
          title={copy.profileSettings.linksTitle}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <UrlField
              disabled={isSaving}
              error={fieldErrors.website}
              label={copy.profileSettings.website}
              name="website"
              onChange={(value) => updateField("website", value)}
              value={form.website}
            />
            <UrlField
              disabled={isSaving}
              error={fieldErrors["socialLinks.facebook"]}
              label={copy.profileSettings.facebook}
              name="socialLinks.facebook"
              onChange={(value) => updateField("facebook", value)}
              value={form.facebook}
            />
            <UrlField
              disabled={isSaving}
              error={fieldErrors["socialLinks.instagram"]}
              label={copy.profileSettings.instagram}
              name="socialLinks.instagram"
              onChange={(value) => updateField("instagram", value)}
              value={form.instagram}
            />
            <UrlField
              disabled={isSaving}
              error={fieldErrors["socialLinks.linkedin"]}
              label={copy.profileSettings.linkedin}
              name="socialLinks.linkedin"
              onChange={(value) => updateField("linkedin", value)}
              value={form.linkedin}
            />
          </div>
        </FormSection>

        <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-lg border border-border bg-panel/95 p-4 shadow-[var(--shadow-panel)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-live="polite"
            className={`min-h-5 text-sm font-medium ${submitError ? "text-danger" : "text-accent"}`}
          >
            {submitError || submitMessage}
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              aria-disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text aria-disabled:pointer-events-none aria-disabled:opacity-60"
              href={profilePath}
            >
              {copy.common.cancel}
            </Link>
            <button
              className="h-11 rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? copy.common.saving : copy.common.saveChanges}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-6 rounded-lg border border-border bg-panel p-5 shadow-[var(--shadow-panel)] sm:p-7">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FormField({
  children,
  error,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-text" htmlFor={htmlFor}>
      {label}
      {children}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}

function UrlField({
  disabled,
  error,
  label,
  name,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FormField error={error} htmlFor={name} label={label}>
      <input
        aria-invalid={Boolean(error)}
        className={inputClassName}
        disabled={disabled}
        id={name}
        maxLength={2048}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://"
        type="url"
        value={value}
      />
    </FormField>
  );
}

function getErrorField(field: keyof ProfileFormState) {
  const fields: Record<keyof ProfileFormState, string> = {
    displayName: "displayName",
    birthYear: "birthYear",
    bioEn: "bio.en",
    bioVi: "bio.vi",
    pronounsEn: "pronouns.en",
    pronounsVi: "pronouns.vi",
    website: "website",
    facebook: "socialLinks.facebook",
    instagram: "socialLinks.instagram",
    linkedin: "socialLinks.linkedin",
  };

  return fields[field];
}
