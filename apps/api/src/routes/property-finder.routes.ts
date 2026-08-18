import type {
  FastifyPluginAsync,
} from "fastify";

import type {
  DatabaseConnection,
} from "@axos/database";

import {
  env,
} from "../config/env.js";

import {
  getRequestContext,
} from "../context/request-context.js";

import {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import {
  ListingRepository,
} from "../repositories/listing.repository.js";

import {
  PropertyFinderListingSyncService,
} from "../services/property-finder-listing-sync.service.js";

export interface PropertyFinderRouteOptions {
  database:
    DatabaseConnection;
}

import {
  AppError,
} from "../errors/app-error.js";

export const propertyFinderRoutes:
  FastifyPluginAsync<
    PropertyFinderRouteOptions
  > =
  async (
    app,
    options,
  ) => {
    const client =
      new PropertyFinderClient({
        baseUrl:
          env.PROPERTY_FINDER_BASE_URL,

        apiKey:
          env.PROPERTY_FINDER_API_KEY,

        apiSecret:
          env.PROPERTY_FINDER_API_SECRET,
      });

    const repository =
      new ListingRepository(
        options.database,
      );

    const syncService =
      new PropertyFinderListingSyncService(
        client,
        repository,
      );

    /*
     * Safe diagnostic endpoint.
     *
     * Never returns credentials.
     */
    app.get(
      "/integrations/property-finder/status",
      async () => {
        return {
          data: {
            provider:
              "property_finder",

            configured:
              client.configured,
          },
        };
      },
    );

    /*
     * Manual sync first.
     *
     * Later EventBridge / background execution
     * can call the same service.
     */
    app.post(
        "/integrations/property-finder/listings/sync",
        async (
          request,
        ) => {
          const context =
            getRequestContext(
              request,
            );

          try {
            request.log.info(
              {
                organizationId:
                  context.organizationId,
              },
              "Starting Property Finder listing sync",
            );

            const result =
              await syncService.sync(
                context.organizationId,
              );

            request.log.info(
              {
                organizationId:
                  context.organizationId,

                listingsProcessed:
                  result.listingsProcessed,

                listingsDeactivated:
                  result.listingsDeactivated,
              },
              "Property Finder listing sync completed",
            );

            return {
              data: result,
            };
          } catch (error) {
            /*
            * Preserve errors already intentionally created
            * by the Property Finder client.
            */
            if (
              error instanceof AppError
            ) {
              request.log.error(
                {
                  code:
                    error.code,

                  message:
                    error.message,

                  details:
                    error.details,
                },
                "Property Finder listing sync failed",
              );

              throw error;
            }

            /*
            * Convert unexpected mapper/database/runtime failures
            * into a diagnostic AppError.
            *
            * Credentials are never included here.
            */
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            const name =
              error instanceof Error
                ? error.name
                : "UnknownError";

            request.log.error(
              error,
              "Unexpected Property Finder listing sync failure",
            );

            throw new AppError(
              "Property Finder listing sync failed",
              {
                statusCode: 502,

                code:
                  "PROPERTY_FINDER_SYNC_FAILED",

                details: {
                  name,
                  message,
                },
              },
            );
          }
        },
      );
};