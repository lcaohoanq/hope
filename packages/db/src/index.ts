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

/**
 * Override the default connection string for this isolate/process.
 * Call from Hono middleware with `env.HYPERDRIVE.connectionString` in Workers,
 * or leave unset to fall back to `process.env.DATABASE_URL` (Node).
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
    prepare: false,
    max: 5,
  });
  return { url, client, database: drizzle(client, { schema }) };
}

export function getDatabase() {
  const url = resolveConnectionString();
  const cached = globalForDatabase.hopeDatabase;
  if (cached && cached.url === url) return cached.database;

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
