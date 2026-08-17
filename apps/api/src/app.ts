import Fastify from "fastify";
import cors from "@fastify/cors";

import {
  checkDatabaseConnection,
  type DatabaseConnection,
} from "@axos/database";

import { env } from "./config/env.js";

export interface BuildAppOptions {
  database: DatabaseConnection;
}

export async function buildApp(
  options: BuildAppOptions,
) {
  const { database } = options;

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  /*
   * ----------------------------------------------------------
   * APPLICATION HEALTH
   * ----------------------------------------------------------
   */

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "axos-api",
      environment: env.NODE_ENV,
    };
  });

  /*
   * ----------------------------------------------------------
   * DATABASE HEALTH
   * ----------------------------------------------------------
   */

  app.get(
    "/health/database",
    async (_request, reply) => {
      const startedAt = Date.now();

      try {
        await checkDatabaseConnection(
          database,
        );

        return {
          status: "ok",
          service: "axos-database",
          responseTimeMs:
            Date.now() - startedAt,
        };
      } catch (error) {
        app.log.error(
          error,
          "Database health check failed",
        );

        return reply
          .code(503)
          .send({
            status: "error",
            service: "axos-database",
          });
      }
    },
  );

  return app;
}