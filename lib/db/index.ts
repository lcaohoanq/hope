import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

type DatabaseConnection = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as typeof globalThis & {
  hopeDatabase?: DatabaseConnection;
};

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  const client = postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });
  return {
    client,
    database: drizzle(client, { schema }),
  };
}

export function getDatabase() {
  if (!globalForDatabase.hopeDatabase) {
    globalForDatabase.hopeDatabase = createDatabase();
  }
  return globalForDatabase.hopeDatabase.database;
}

export async function closeDatabase() {
  const connection = globalForDatabase.hopeDatabase;
  delete globalForDatabase.hopeDatabase;
  if (connection) {
    await connection.client.end({ timeout: 5 });
  }
}
