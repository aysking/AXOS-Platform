import Fastify from "fastify";
import cors from "@fastify/cors";

import {
  checkDatabaseConnection,
  type DatabaseConnection,
} from "@axos/database";

import { env } from "./config/env.js";

import {
  registerRequestContext,
} from "./context/request-context.js";

import {
  registerErrorHandler,
} from "./errors/error-handler.js";

import {
  leadRoutes,
} from "./routes/leads.routes.js";

export interface BuildAppOptions {
  database:
    DatabaseConnection;
}

export async function buildApp(
  options:
    BuildAppOptions,
) {
  const { database } =
    options;

  const app = Fastify({
    logger: true,
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: true,
  });

  app.get(
    "/health",
    async () => ({
      status: "ok",
      service: "axos-api",
      environment:
        env.NODE_ENV,
    }),
  );

  app.get(
    "/health/database",
    async (
      _request,
      reply,
    ) => {
      const startedAt =
        Date.now();

      try {
        await checkDatabaseConnection(
          database,
        );

        return {
          status: "ok",
          service:
            "axos-database",
          responseTimeMs:
            Date.now() -
            startedAt,
        };
      } catch (error) {
        app.log.error(
          error,
          "Database health check failed",
        );

        return reply
          .code(503)
          .send({
            status:
              "error",

            service:
              "axos-database",
          });
      }
    },
  );

  /*
   * Protected AXOS API.
   */
  await app.register(
    async (api) => {
      registerRequestContext(
        api,
        database,
      );

      await api.register(
        leadRoutes,
        {
          database,
        },
      );
    },
    {
      prefix: "/api",
    },
  );

  return app;
}