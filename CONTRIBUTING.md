# Contributing to Hope

Thanks for taking a look at Hope.

## Local Development

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Fill the required values in `.env` before running the app. Do not commit filled environment files.

## Checks

Run the relevant checks before opening a pull request:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

For changes that affect user flows, run the Playwright suite:

```bash
E2E_PORT=3100 pnpm test:e2e
```

## Pull Requests

- Keep changes focused and explain the user-facing behavior.
- Include tests or verification notes for risky changes.
- Avoid committing personal data, real uploaded media, or generated local artifacts.
- Update documentation when setup, environment variables, or workflows change.
