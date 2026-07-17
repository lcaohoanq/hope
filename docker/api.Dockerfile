FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @hope/api...

FROM base AS runner
WORKDIR /app
COPY --from=deps /app ./
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY packages/core packages/core
COPY packages/api-client packages/api-client

EXPOSE 8787
CMD ["pnpm", "--filter", "@hope/api", "start"]
