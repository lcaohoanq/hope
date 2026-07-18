# `@hope/mobile`

Expo Router client for Hope (near-parity social product).

## Quick start

```bash
# from monorepo root
pnpm install

# apps/mobile/.env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...   # same as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL=http://localhost:8787  # Android emulator: http://10.0.2.2:8787
EXPO_PUBLIC_APP_URL=http://localhost:3000

pnpm --filter @hope/api dev
pnpm mobile
```

Full notes: [Mobile guide](../docs/docs/guides/mobile.md) (Docusaurus).

## Scripts

| Command | Description |
|---|---|
| `pnpm mobile` | Expo start |
| `pnpm --filter @hope/mobile typecheck` | TypeScript |
| `pnpm --filter @hope/mobile eas:build:preview` | EAS preview build |
