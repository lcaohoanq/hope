# @hope/docs

Docusaurus site for Hope architecture guides and TypeDoc API reference (`@hope/shared`, `@hope/api-client`).

From the monorepo root:

```bash
pnpm docs:dev     # http://localhost:3001/hope/
pnpm docs:build   # static build → apps/docs/build
```

> Bare `pnpm docs` is an npm/pnpm built-in (opens the package page). Always use `pnpm docs:dev`.

### GitHub Pages

Site URL: https://lcaohoanq.github.io/hope/

CI workflow: `.github/workflows/docs.yml` (builds TypeDoc into `docs/api/`, then deploys `apps/docs/build`).

Enable once: repo **Settings → Pages → Source: GitHub Actions**.
