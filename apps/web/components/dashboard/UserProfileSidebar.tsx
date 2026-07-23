import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FaExternalLinkAlt, FaFacebookF, FaGlobe, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { ConnectionsDialog } from "@/components/social/ConnectionsDialog";
import { FollowButton } from "@/components/social/FollowButton";
import type { AppCopy, Language } from "@/lib/i18n";
import type { SocialSummary } from "@/lib/social-types";
import { isProPlan, type PublicAppUser } from "@/lib/users";
import { AvatarImage } from "./AvatarImage";
import { AvatarPreviewDialog } from "./AvatarPreviewDialog";
import { getGoogleMaps3dUrl, getGoogleMapsEmbedUrl } from "./dashboard-utils";

type ProfileLink = {
  label: string;
  href: string;
  Icon: IconType;
};

type UserProfileSidebarProps = {
  avatarUrl: string;
  copy: AppCopy;
  isEditable: boolean;
  language: Language;
  user: PublicAppUser;
  onAddWorkout: () => void;
  isAuthenticated: boolean;
  socialSummary: SocialSummary;
  canViewDetails: boolean;
};

export function UserProfileSidebar({
  avatarUrl,
  copy,
  isEditable,
  language,
  user,
  onAddWorkout,
  isAuthenticated,
  socialSummary,
  canViewDetails,
}: UserProfileSidebarProps) {
  const { has } = useAuth();
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
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
        <button
          aria-label={`View ${user.displayName}'s avatar`}
          className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted transition hover:ring-2 hover:ring-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-28 sm:w-28 lg:h-auto lg:w-full"
          onClick={() => setIsAvatarPreviewOpen(true)}
          type="button"
        >
          <AvatarImage
            alt={`${user.displayName}'s avatar`}
            className="aspect-square h-full w-full object-cover"
            priority
            sizes="(min-width: 1024px) 248px, (min-width: 640px) 112px, 96px"
            src={avatarUrl}
          />
        </button>
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
        </div>
      </div>
      <AvatarPreviewDialog
        alt={`${user.displayName}'s avatar`}
        copy={copy}
        isOpen={isAvatarPreviewOpen}
        onClose={() => setIsAvatarPreviewOpen(false)}
        src={avatarUrl}
      />

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
        <div className="grid gap-3 pt-5 text-sm text-muted">
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
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
