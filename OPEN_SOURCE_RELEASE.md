# Open Source Release Checklist

Use this checklist before making the repository public.

## Required

- Confirm `.env`, `.env.local`, `.migration-users.json`, and uploaded media are not tracked.
- Confirm `data/profiles.snapshot.json` and `data/workouts.json` contain only sanitized demo data.
- Run a secret scan against the working tree.
- Decide whether to publish from a fresh repository or rewrite existing git history.

## History Warning

Deleting sensitive files in the latest commit does not remove them from older commits. If this repository has ever tracked private profile data, workout exports, uploaded media, or internal notes, making the same repository public will expose that history.

Recommended release options:

1. Create a fresh public repository from the cleaned working tree.
2. Or rewrite history with a dedicated tool such as `git filter-repo` or BFG Repo-Cleaner, then rotate any credentials that may have been exposed.

Do not rewrite history on a shared repository without coordinating with collaborators.

## Suggested Final Checks

```bash
git status --short
pnpm typecheck
pnpm lint
pnpm build
```

If available:

```bash
gitleaks detect --source .
trufflehog filesystem .
```
