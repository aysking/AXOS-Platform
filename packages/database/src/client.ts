import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

export interface CreateDatabaseOptions {
  maxConnections?: number;
}

export function createDatabase(
  databaseUrl: string,
  options: CreateDatabaseOptions = {},
) {
  const client = postgres(databaseUrl, {
    max: options.maxConnections ?? 10,
  });

  const db = drizzle({
    client,
    schema,
  });

  return {
    db,
    client,

    async close() {
      await client.end();
    },
  };
}

export type DatabaseConnection =
  ReturnType<typeof createDatabase>;

export async function checkDatabaseConnection(
  connection: DatabaseConnection,
) {
  await connection.db.execute(
    sql`SELECT 1`,
  );
}