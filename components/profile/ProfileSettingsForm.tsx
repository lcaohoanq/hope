"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { readApiJson } from "@/components/dashboard/workout-api";
import { translations } from "@/lib/i18n";
import {
  getProfileUpdateFieldErrors,
  profileUpdateSchema,
} from "@/lib/profile-update";
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
    setFieldErrors({});

    try {
      const response = await fetch("/api/users/profile", {
        body: JSON.stringify(result.data),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await readApiJson<UpdateProfileResponse>(
        response,
        copy.profileSettings.saveFailed,
      );

      if (!response.ok || !payload.success) {
        if ("fieldErrors" in payload && payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }

        throw new Error(
          "error" in payload ? payload.error : copy.profileSettings.saveFailed,
        );
      }

      window.location.assign(getCanonicalUserPath(payload.profile));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : copy.profileSettings.saveFailed,
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-app px-4 py-6 text-text sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted transition hover:bg-panel-muted hover:text-text"
            href={profilePath}
          >
            <FaArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {copy.profileSettings.backToProfile}
          </Link>
          <span className="truncate font-mono text-xs font-semibold text-accent">
            @{user.username}
          </span>
        </nav>

        <header className="mb-8 border-b border-border pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            {user.displayName}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {copy.profileSettings.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            {copy.profileSettings.description}
          </p>
          <p className="mt-2 text-sm text-muted">
            {copy.profileSettings.usernameLocked}
          </p>
        </header>

        <div className="mb-6"><PrivacySettingsCard user={user} /></div>
        <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
          <FormSection
            description={copy.profileSettings.basicDescription}
            title={copy.profileSettings.basicTitle}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                error={fieldErrors.displayName}
                label={copy.profileSettings.displayName}
              >
                <input
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  className={inputClassName}
                  disabled={isSaving}
                  maxLength={80}
                  name="displayName"
                  onChange={(event) => updateField("displayName", event.target.value)}
                  value={form.displayName}
                />
              </FormField>
              <FormField
                error={fieldErrors.birthYear}
                label={copy.profileSettings.birthYear}
              >
                <input
                  aria-invalid={Boolean(fieldErrors.birthYear)}
                  className={inputClassName}
                  disabled={isSaving}
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
              <FormField error={fieldErrors["bio.vi"]} label={copy.profileSettings.bioVietnamese}>
                <textarea
                  aria-invalid={Boolean(fieldErrors["bio.vi"])}
                  className={textareaClassName}
                  disabled={isSaving}
                  maxLength={500}
                  name="bio.vi"
                  onChange={(event) => updateField("bioVi", event.target.value)}
                  value={form.bioVi}
                />
              </FormField>
              <FormField error={fieldErrors["bio.en"]} label={copy.profileSettings.bioEnglish}>
                <textarea
                  aria-invalid={Boolean(fieldErrors["bio.en"])}
                  className={textareaClassName}
                  disabled={isSaving}
                  maxLength={500}
                  name="bio.en"
                  onChange={(event) => updateField("bioEn", event.target.value)}
                  value={form.bioEn}
                />
              </FormField>
              <FormField
                error={fieldErrors["pronouns.vi"]}
                label={copy.profileSettings.pronounsVietnamese}
              >
                <input
                  aria-invalid={Boolean(fieldErrors["pronouns.vi"])}
                  className={inputClassName}
                  disabled={isSaving}
                  maxLength={50}
                  name="pronouns.vi"
                  onChange={(event) => updateField("pronounsVi", event.target.value)}
                  value={form.pronounsVi}
                />
              </FormField>
              <FormField
                error={fieldErrors["pronouns.en"]}
                label={copy.profileSettings.pronounsEnglish}
              >
                <input
                  aria-invalid={Boolean(fieldErrors["pronouns.en"])}
                  className={inputClassName}
                  disabled={isSaving}
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
            <div aria-live="polite" className="min-h-5 text-sm font-medium text-danger">
              {submitError}
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
    </main>
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
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-text">
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
    <FormField error={error} label={label}>
      <input
        aria-invalid={Boolean(error)}
        className={inputClassName}
        disabled={disabled}
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
