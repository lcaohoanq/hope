import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DatabaseConnection = {
  url: string;
  client: ReturnType<typeof postgres>;
  database: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDatabase = globalThis as typeof globalThis & {
  hopeDatabase?: DatabaseConnection;
  hopeDatabaseUrl?: string;
};

/** Request-scoped DB connection (required on Cloudflare Workers / Hyperdrive). */
const databaseContext = new AsyncLocalStorage<DatabaseConnection>();

/**
 * Override the default connection string for this isolate/process.
 * Prefer {@link runWithDatabase} on Workers so the client is not reused across requests.
 */
export function setDefaultConnectionString(url: string) {
  globalForDatabase.hopeDatabaseUrl = url;
}

function resolveConnectionString(): string {
  const url = globalForDatabase.hopeDatabaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for database access.");
  }
  return url;
}

function createDatabase(url: string): DatabaseConnection {
  const client = postgres(url, {
    // Hyperdrive pools at the edge — keep the Worker-side pool minimal.
    max: 1,
    // Required for transaction-mode poolers (e.g. Supabase :6543) and Hyperdrive.
    prepare: false,
    // Avoid an extra pg_type round-trip on cold queries through Hyperdrive.
    fetch_types: false,
  });
  return { url, client, database: drizzle(client, { schema }) };
}

/**
 * Run `fn` with a request-scoped Postgres client.
 * Workers must not reuse DB clients across requests (I/O context isolation).
 * Optionally retries once on transient Hyperdrive/origin drops (safe for GET/HEAD).
 */
export async function runWithDatabase<T>(
  url: string,
  fn: () => Promise<T>,
  options?: { retryTransient?: boolean },
): Promise<T> {
  const attempt = async (attemptNo: number) => {
    const connection = createDatabase(url);
    // #region agent log
    console.log(
      JSON.stringify({
        sessionId: "f815aa",
        hypothesisId: "G",
        location: "packages/db/src/index.ts:runWithDatabase",
        message: "created request-scoped db client",
        data: {
          attemptNo,
          max: 1,
          prepare: false,
          fetch_types: false,
          hasHyperdriveHost: url.includes("hyperdrive"),
          retryTransient: Boolean(options?.retryTransient),
        },
        timestamp: Date.now(),
      }),
    );
    // #endregion
    return databaseContext.run(connection, fn);
  };

  try {
    return await attempt(1);
  } catch (error) {
    if (!options?.retryTransient) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error && error.cause
          ? String(error.cause)
          : "";
    const transient =
      /network connection lost/i.test(message) ||
      /network connection lost/i.test(cause) ||
      /connection terminated/i.test(message) ||
      /connection terminated/i.test(cause);
    // #region agent log
    console.log(
      JSON.stringify({
        sessionId: "f815aa",
        hypothesisId: "G",
        location: "packages/db/src/index.ts:runWithDatabase",
        message: transient ? "retrying after transient db error" : "db error not retried",
        data: { transient, errorMessage: message.slice(0, 200), cause: cause.slice(0, 200) },
        timestamp: Date.now(),
      }),
    );
    // #endregion
    if (!transient) throw error;
    return attempt(2);
  }
}

export function getDatabase() {
  const scoped = databaseContext.getStore();
  if (scoped) {
    // #region agent log
    console.log(
      JSON.stringify({
        sessionId: "f815aa",
        hypothesisId: "A",
        location: "packages/db/src/index.ts:getDatabase",
        message: "using request-scoped db client",
        data: { source: "als" },
        timestamp: Date.now(),
      }),
    );
    // #endregion
    return scoped.database;
  }

  const url = resolveConnectionString();
  const cached = globalForDatabase.hopeDatabase;
  if (cached && cached.url === url) {
    // #region agent log
    console.log(
      JSON.stringify({
        sessionId: "f815aa",
        hypothesisId: "A",
        location: "packages/db/src/index.ts:getDatabase",
        message: "using process-cached db client",
        data: { source: "global-cache" },
        timestamp: Date.now(),
      }),
    );
    // #endregion
    return cached.database;
  }

  // #region agent log
  console.log(
    JSON.stringify({
      sessionId: "f815aa",
      hypothesisId: "A",
      location: "packages/db/src/index.ts:getDatabase",
      message: "creating process-cached db client",
      data: { source: "global-new" },
      timestamp: Date.now(),
    }),
  );
  // #endregion
  globalForDatabase.hopeDatabase = createDatabase(url);
  return globalForDatabase.hopeDatabase.database;
}

export async function closeDatabase() {
  const connection = globalForDatabase.hopeDatabase;
  globalForDatabase.hopeDatabase = undefined;
  if (connection) {
    await connection.client.end({ timeout: 5 });
  }
}
