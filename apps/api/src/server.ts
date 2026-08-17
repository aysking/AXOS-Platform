import {
  checkDatabaseConnection,
  createDatabase,
} from "@axos/database";

import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const database = createDatabase(
  env.DATABASE_URL,
  {
    maxConnections:
      env.DB_MAX_CONNECTIONS,
  },
);

const app = await buildApp({
  database,
});

async function start() {
  try {
    /*
     * Fail startup if the database cannot
     * be reached.
     */
    await checkDatabaseConnection(
      database,
    );

    await app.listen({
      port: env.API_PORT,
      host: "0.0.0.0",
    });

    app.log.info(
      `AXOS API running on http://localhost:${env.API_PORT}`,
    );
  } catch (error) {
    app.log.error(
      error,
      "Failed to start AXOS API",
    );

    await database.close();

    process.exit(1);
  }
}

async function shutdown(
  signal: string,
) {
  app.log.info(
    { signal },
    "Shutting down AXOS API",
  );

  try {
    await app.close();
    await database.close();

    process.exit(0);
  } catch (error) {
    app.log.error(
      error,
      "Error during shutdown",
    );

    process.exit(1);
  }
}

process.on(
  "SIGINT",
  () => void shutdown("SIGINT"),
);

process.on(
  "SIGTERM",
  () => void shutdown("SIGTERM"),
);

await start();