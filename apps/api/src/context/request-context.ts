import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import type {
  DatabaseConnection,
} from "@axos/database";

import { env } from "../config/env.js";
import {
  UnauthorizedError,
} from "../errors/app-error.js";

export interface AxosRequestContext {
  membershipId: string;
  userId: string;
  organizationId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    axosContext:
      | AxosRequestContext
      | null;
  }
}

export function registerRequestContext(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  app.decorateRequest(
    "axosContext",
    null,
  );

  app.addHook(
    "preHandler",
    async (request) => {
      /*
       * Temporary local-development identity.
       *
       * Cognito will eventually replace this
       * mechanism.
       */
      if (
        env.NODE_ENV !==
        "development"
      ) {
        throw new UnauthorizedError(
          "Authentication provider is not configured",
        );
      }

      const membershipId =
        env.DEV_MEMBERSHIP_ID;

      if (!membershipId) {
        throw new UnauthorizedError(
          "DEV_MEMBERSHIP_ID is not configured",
        );
      }

      const membership =
        await database.db.query
          .memberships.findFirst({
            where: (
              table,
              { and, eq },
            ) =>
              and(
                eq(
                  table.id,
                  membershipId,
                ),
                eq(
                  table.status,
                  "active",
                ),
              ),
          });

      if (!membership) {
        throw new UnauthorizedError(
          "Active development membership was not found",
        );
      }

      const user =
        await database.db.query
          .users.findFirst({
            where: (
              table,
              { and, eq },
            ) =>
              and(
                eq(
                  table.id,
                  membership.userId,
                ),
                eq(
                  table.status,
                  "active",
                ),
              ),
          });

      if (!user) {
        throw new UnauthorizedError(
          "Active user was not found",
        );
      }

      const organization =
        await database.db.query
          .organizations.findFirst({
            where: (
              table,
              { and, eq },
            ) =>
              and(
                eq(
                  table.id,
                  membership.organizationId,
                ),
                eq(
                  table.status,
                  "active",
                ),
              ),
          });

      if (!organization) {
        throw new UnauthorizedError(
          "Active organization was not found",
        );
      }

      request.axosContext = {
        membershipId:
          membership.id,
        userId: user.id,
        organizationId:
          organization.id,
      };
    },
  );
}

export function getRequestContext(
  request: FastifyRequest,
) {
  if (!request.axosContext) {
    throw new UnauthorizedError();
  }

  return request.axosContext;
}