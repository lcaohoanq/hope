"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { AvatarImage } from "@/components/dashboard/AvatarImage";
import { apiClient } from "@/lib/http";
import { getAvatarUrl } from "@/lib/profile-utils";
import type { PublicAppUser } from "@/lib/users";

type UserSearchCopy = {
  error: string;
  loading: string;
  noResults: string;
  placeholder: string;
};

type UserSearchResponse =
  | { success: true; users: PublicAppUser[] }
  | { success: false; error: string };

type UserSearchProps = {
  className?: string;
  copy: UserSearchCopy;
  inputClassName?: string;
};

export function UserSearch({ className = "", copy, inputClassName = "" }: UserSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicAppUser[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const trimmedQuery = query.trim();
  const showPanel = trimmedQuery.length >= 2 && status !== "idle";

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      requestRef.current += 1;
      setUsers([]);
      setStatus("idle");
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const { data: payload } = await apiClient.get<UserSearchResponse>("/users/search", {
          params: { q: trimmedQuery },
          signal: controller.signal,
        });
        if (requestRef.current !== requestId) return;
        if (!payload.success) throw new Error("Search failed");
        setUsers(payload.users);
        setStatus("ready");
      } catch {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        setUsers([]);
        setStatus("error");
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setStatus((currentStatus) => (currentStatus === "loading" ? currentStatus : "idle"));
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function openProfile(user: PublicAppUser) {
    setQuery("");
    setUsers([]);
    setStatus("idle");
    router.push(`/${user.username}`);
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <FaSearch
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
      />
      <input
        aria-label={copy.placeholder}
        className={`h-10 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm font-medium text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 ${inputClassName}`}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (trimmedQuery.length >= 2 && status === "ready") setStatus("ready");
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setStatus("idle");
            event.currentTarget.blur();
          }
        }}
        placeholder={copy.placeholder}
        type="search"
        value={query}
      />

      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border border-border bg-panel text-sm text-text shadow-[var(--shadow-panel)]"
          id={listboxId}
          role="listbox"
        >
          {status === "loading" ? (
            <p className="px-3 py-3 text-sm font-medium text-muted">{copy.loading}</p>
          ) : null}
          {status === "error" ? (
            <p className="px-3 py-3 text-sm font-medium text-danger">{copy.error}</p>
          ) : null}
          {status === "ready" && users.length === 0 ? (
            <p className="px-3 py-3 text-sm font-medium text-muted">{copy.noResults}</p>
          ) : null}
          {status === "ready" && users.length > 0 ? (
            <div className="grid gap-1 p-2">
              {users.map((user) => {
                const avatarUrl = user.avatarUrl ?? getAvatarUrl(user.avatarSeed);
                return (
                  <button
                    aria-selected="false"
                    className="flex h-12 min-w-0 items-center gap-3 rounded-md px-2 text-left transition hover:bg-panel-muted focus:bg-panel-muted focus:outline-none"
                    key={user.id}
                    onClick={() => openProfile(user)}
                    role="option"
                    type="button"
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-panel-muted">
                      <AvatarImage
                        alt={`${user.displayName}'s avatar`}
                        className="h-full w-full object-cover"
                        sizes="32px"
                        src={avatarUrl}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-text">
                        {user.displayName}
                      </span>
                      <span className="block truncate text-xs font-semibold text-accent">
                        @{user.username}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
