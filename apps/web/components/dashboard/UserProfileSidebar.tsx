import { useAuth } from "@clerk/nextjs";
import type { IconType } from "react-icons";
import {
  FaCamera,
  FaExternalLinkAlt,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import { ConnectionsDialog } from "@/components/social/ConnectionsDialog";
import { FollowButton } from "@/components/social/FollowButton";
import type { AppCopy, Language } from "@/lib/i18n";
import type { SocialSummary } from "@/lib/social-types";
import { isProPlan, type PublicAppUser } from "@/lib/users";
import { AvatarImage } from "./AvatarImage";
import { getGoogleMaps3dUrl, getGoogleMapsEmbedUrl } from "./dashboard-utils";

type ProfileLink = {
  label: string;
  href: string;
  Icon: IconType;
};

type UserProfileSidebarProps = {
  avatarUploadError: string;
  avatarUploadMessage: string;
  avatarUrl: string;
  copy: AppCopy;
  hasPendingAvatarPreview: boolean;
  isEditable: boolean;
  isUploadingAvatar: boolean;
  language: Language;
  onAvatarLoad: (avatarUrl: string) => void;
  user: PublicAppUser;
  onAddWorkout: () => void;
  onSelectAvatar: (file: File) => void;
  isAuthenticated: boolean;
  socialSummary: SocialSummary;
  canViewDetails: boolean;
};

export function UserProfileSidebar({
  avatarUploadError,
  avatarUploadMessage,
  avatarUrl,
  copy,
  hasPendingAvatarPreview,
  isEditable,
  isUploadingAvatar,
  language,
  onAvatarLoad,
  user,
  onAddWorkout,
  onSelectAvatar,
  isAuthenticated,
  socialSummary,
  canViewDetails,
}: UserProfileSidebarProps) {
  const { has } = useAuth();
  const showPro = isProPlan(user) || Boolean(has?.({ plan: "pro" }));
  const profileLinks: ProfileLink[] = [
    ...(user.website
      ? [
          {
            label: copy.dashboard.website,
            href: user.website,
            Icon: FaGlobe,
          },
        ]
      : []),
    ...(user.socialLinks?.facebook
      ? [
          {
            label: copy.dashboard.facebook,
            href: user.socialLinks.facebook,
            Icon: FaFacebookF,
          },
        ]
      : []),
    ...(user.socialLinks?.instagram
      ? [
          {
            label: copy.dashboard.instagram,
            href: user.socialLinks.instagram,
            Icon: FaInstagram,
          },
        ]
      : []),
    ...(user.socialLinks?.linkedin
      ? [
          {
            label: copy.dashboard.linkedin,
            href: user.socialLinks.linkedin,
            Icon: FaLinkedinIn,
          },
        ]
      : []),
  ];

  return (
    <aside className="rounded-lg p-5 lg:sticky lg:top-6">
      <div className="flex gap-4 lg:block">
        <div className="group relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted sm:h-28 sm:w-28 lg:h-auto lg:w-full">
          <AvatarImage
            alt={`${user.displayName}'s avatar`}
            className={`aspect-square h-full w-full object-cover ${
              hasPendingAvatarPreview ? "opacity-90" : ""
            }`}
            onLoad={() => onAvatarLoad(avatarUrl)}
            priority
            sizes="(min-width: 1024px) 248px, (min-width: 640px) 112px, 96px"
            src={avatarUrl}
          />
          {isUploadingAvatar ? (
            <div className="absolute inset-0 grid place-items-center bg-text/20">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          ) : null}
          {isEditable ? (
            <label
              className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-2 bg-text/75 px-3 py-2 text-xs font-semibold text-white opacity-100 transition group-hover:bg-accent/90 lg:opacity-0 lg:group-hover:opacity-100"
              title={copy.dashboard.uploadAvatar}
            >
              <FaCamera aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only lg:not-sr-only lg:truncate">
                {isUploadingAvatar ? copy.dashboard.uploadingAvatar : copy.dashboard.uploadAvatar}
              </span>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isUploadingAvatar}
                onChange={(event) => {
                  const [file] = Array.from(event.target.files ?? []);
                  event.currentTarget.value = "";

                  if (file) {
                    onSelectAvatar(file);
                  }
                }}
                type="file"
              />
            </label>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 lg:mt-5">
          {/* <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {copy.dashboard.appName}
          </p> */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text">
              {user.displayName}
            </h1>
            {canViewDetails && showPro ? (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-accent">
                PRO
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <p className="mt-1 truncate text-sm text-muted">{user.slug}</p>
            <span className="mt-1 text-sm text-muted">·</span>
            {canViewDetails && user.pronouns ? (
              <span className="mt-1 text-sm text-muted">{user.pronouns[language]}</span>
            ) : null}
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-text">{user.bio[language]}</p>
          {avatarUploadMessage ? (
            <p className="mt-3 text-sm font-medium text-accent">{avatarUploadMessage}</p>
          ) : null}
          {avatarUploadError ? (
            <p className="mt-3 text-sm font-medium text-danger">{avatarUploadError}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <ConnectionsDialog
          canView={socialSummary.canViewConnections}
          followersCount={socialSummary.followersCount}
          followingCount={socialSummary.followingCount}
          language={language}
          profileId={user.id}
          username={user.username}
        />
        {!isEditable ? (
          <FollowButton
            authenticated={isAuthenticated}
            initialStatus={socialSummary.relationshipStatus}
            language={language}
            profileId={user.id}
            profilePath={`/${user.username}`}
          />
        ) : null}
      </div>

      {isEditable ? (
        <div className="mt-5">
          <button
            className="h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 active:scale-[0.98]"
            onClick={onAddWorkout}
            type="button"
          >
            {copy.dashboard.addWorkout}
          </button>
        </div>
      ) : null}

      {/* <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-muted">
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.birthYear}</span>
          <span className="font-medium text-text">{user.birthYear}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.ageMap}</span>
          <span className="font-medium text-text">
            {userAge} {copy.dashboard.years}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.dashboard.trackingFrom}</span>
          <span className="font-medium text-text">{trackingStartYear}</span>
        </div>
      </div> */}

      {canViewDetails && profileLinks.length > 0 ? (
        <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-muted">
          <div className="grid gap-2">
            {profileLinks.map(({ href, Icon, label }) => (
              <a
                className="group flex items-center justify-between gap-3 py-1.5 text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text"
                href={href}
                key={label}
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted transition group-hover:text-muted"
                  />
                  <span className="truncate font-medium">{label}</span>
                </span>
                <FaExternalLinkAlt
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 text-muted transition group-hover:text-muted"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {canViewDetails && user.location ? (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="text-muted">{copy.dashboard.location}</p>
              <p className="mt-1 font-medium text-text">{user.location.label[language]}</p>
            </div>
            <a
              className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-border hover:bg-panel-muted hover:text-text"
              href={getGoogleMaps3dUrl(user.location)}
              rel="noreferrer"
              target="_blank"
            >
              {copy.dashboard.open3dMap}
            </a>
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-panel-muted">
            <iframe
              allowFullScreen
              className="block h-48 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={getGoogleMapsEmbedUrl(user.location)}
              title={`${copy.dashboard.location}: ${user.location.label[language]}`}
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
