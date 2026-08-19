import type {
  FastifyPluginAsync,
} from "fastify";

import {
  z,
} from "zod";

import type {
  DatabaseConnection,
} from "@axos/database";

import {
  env,
} from "../config/env.js";

import {
  AppError,
} from "../errors/app-error.js";

import type {
  PropertyFinderWebhookEvent,
  PropertyFinderLeadWebhookEvent,
} from "../integrations/property-finder/property-finder.types.js";

import {
  PropertyFinderListingWebhookService,
} from "../services/property-finder-listing-webhook.service.js";

import {
  derivePropertyFinderWebhookSecret,
  verifyPropertyFinderWebhookSignature,
} from "../integrations/property-finder/property-finder-webhook.utils.js";

import {
  mapPropertyFinderLeadWebhook,
} from "../integrations/property-finder/property-finder-webhook.mapper.js";

import {
  PropertyFinderLeadRepository,
} from "../repositories/property-finder-lead.repository.js";

import {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import {
  ListingRepository,
} from "../repositories/listing.repository.js";

import {
  PropertyFinderListingResolverService,
} from "../services/property-finder-listing-resolver.service.js";

import {
  IntegrationWebhookEventRepository,
} from "../repositories/integration-webhook-event.repository.js";

export interface PropertyFinderWebhookRouteOptions {
  database:
    DatabaseConnection;
}

const organizationIdSchema =
  z.string().uuid();


function getWebhookErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown webhook processing error";
}

function isPropertyFinderLeadWebhookEvent(
  event:
    PropertyFinderWebhookEvent,
): event is PropertyFinderLeadWebhookEvent {
  return (
    event.type ===
      "lead.created" ||
    event.type ===
      "lead.updated" ||
    event.type ===
      "lead.assigned"
  );
}

const supportedEvents =
  new Set<string>([
    "lead.created",
    "lead.updated",
    "lead.assigned",

    "listing.published",
    "listing.unpublished",
  ]);

export const propertyFinderWebhookRoutes:
  FastifyPluginAsync<
    PropertyFinderWebhookRouteOptions
  > =
  async (
    app,
    options,
  ) => {
    const repository =
      new PropertyFinderLeadRepository(
        options.database,
      );

    const propertyFinderClient =
      new PropertyFinderClient({
        baseUrl:
          env.PROPERTY_FINDER_BASE_URL,

        apiKey:
          env.PROPERTY_FINDER_API_KEY,

        apiSecret:
          env.PROPERTY_FINDER_API_SECRET,
      });

    const listingRepository =
      new ListingRepository(
        options.database,
      );
    
    const listingWebhookService =
      new PropertyFinderListingWebhookService(
        propertyFinderClient,
        listingRepository,
      );

    const listingResolver =
      new PropertyFinderListingResolverService(
        propertyFinderClient,
        listingRepository,
      );

    app.post<{
      Params: {
        organizationId: string;
      };

      Body:
        PropertyFinderWebhookEvent;
    }>(
      "/webhooks/property-finder/:organizationId",
      {
        /*
         * fastify-raw-body is enabled only
         * for webhook routes.
         */
        config: {
          rawBody: true,
        },
      },
      async (
        request,
        reply,
      ) => {
        /*
         * ----------------------------------------------------
         * ORGANIZATION
         * ----------------------------------------------------
         */

        const parsedOrganizationId =
          organizationIdSchema
            .safeParse(
              request.params
                .organizationId,
            );

        if (
          !parsedOrganizationId
            .success
        ) {
          throw new AppError(
            "Invalid webhook organization",
            {
              statusCode:
                400,

              code:
                "INVALID_WEBHOOK_ORGANIZATION",
            },
          );
        }

        const organizationId =
          parsedOrganizationId
            .data;

        /*
         * ----------------------------------------------------
         * WEBHOOK CONFIGURATION
         * ----------------------------------------------------
         */

        const secretSeed =
          env
            .PROPERTY_FINDER_WEBHOOK_SECRET_SEED;

        if (!secretSeed) {
          throw new AppError(
            "Property Finder webhook processing is not configured",
            {
              statusCode:
                503,

              code:
                "PROPERTY_FINDER_WEBHOOK_NOT_CONFIGURED",
            },
          );
        }

        /*
         * ----------------------------------------------------
         * RAW BODY
         * ----------------------------------------------------
         */

        const rawBody =
          request.rawBody;

        if (
          typeof rawBody !==
          "string"
        ) {
          throw new AppError(
            "Property Finder webhook raw body is unavailable",
            {
              statusCode:
                500,

              code:
                "PROPERTY_FINDER_WEBHOOK_RAW_BODY_UNAVAILABLE",
            },
          );
        }

        /*
         * ----------------------------------------------------
         * HMAC AUTHENTICATION
         * ----------------------------------------------------
         */

        const secret =
          derivePropertyFinderWebhookSecret(
            secretSeed,
            organizationId,
          );
        
        
        const receivedSignature =
          request.headers[
            "x-signature"
          ];

        request.log.info(
          {
            rawBodyLength:
              Buffer.byteLength(
                rawBody,
                "utf8",
              ),
          },
          "Property Finder HMAC comparison",
        );

        request.log.info(
        {
          rawBodyType:
            typeof rawBody,

          rawBodyLength:
            typeof rawBody === "string"
              ? Buffer.byteLength(
                  rawBody,
                  "utf8",
                )
              : null,

          receivedSignatureLength:
            typeof request.headers[
              "x-signature"
            ] === "string"
              ? request.headers[
                  "x-signature"
                ].length
              : null,
        },
        "Property Finder webhook signature diagnostic",
      );

        const validSignature =
          verifyPropertyFinderWebhookSignature(
            rawBody,
            request.headers[
              "x-signature"
            ],
            secret,
          );

        if (
          !validSignature
        ) {
          request.log.warn(
            {
              organizationId,
            },
            "Rejected invalid Property Finder webhook signature",
          );

          throw new AppError(
            "Invalid Property Finder webhook signature",
            {
              statusCode:
                401,

              code:
                "INVALID_PROPERTY_FINDER_WEBHOOK_SIGNATURE",
            },
          );
        }

        /*
         * Authentication has succeeded.
         *
         * Only now should we trust/process the body.
         */

        const event =
          request.body;

        if (
          !event ||
          typeof event !==
            "object"
        ) {
          throw new AppError(
            "Invalid Property Finder webhook payload",
            {
              statusCode:
                400,

              code:
                "INVALID_PROPERTY_FINDER_WEBHOOK_PAYLOAD",
            },
          );
        }

        if (
          !supportedEvents.has(
            event.type,
          )
        ) {
          /*
           * Return 204 for authenticated but unsupported
           * event types rather than forcing PF retries.
           */
          request.log.info(
            {
              organizationId,

              eventId:
                event.id,

              eventType:
                event.type,
            },
            "Ignored unsupported Property Finder webhook",
          );

          return reply
            .code(204)
            .send();
        }

        const webhookEventRepository =
          new IntegrationWebhookEventRepository(
            options.database,
          );

        /*
        * ----------------------------------------------------
        * DURABLE WEBHOOK EVENT CLAIM
        * ----------------------------------------------------
        *
        * Authentication has already succeeded.
        *
        * We now persist/claim the Property Finder event ID
        * before any business processing occurs.
        */

        const parsedOccurredAt =
          event.timestamp
            ? new Date(
                event.timestamp,
              )
            : null;

        const occurredAt =
          parsedOccurredAt &&
          !Number.isNaN(
            parsedOccurredAt.getTime(),
          )
            ? parsedOccurredAt
            : null;

        const claim =
          await webhookEventRepository.claim({
            organizationId,

            provider:
              "property_finder",

            externalEventId:
              event.id,

            eventType:
              event.type,

            externalEntityId:
              event.entity?.id ??
              null,

            externalEntityType:
              event.entity?.type ??
              null,

            signatureVerified:
              true,

            occurredAt,

            payload:
              event,
          });

        if (!claim.claimed) {
          request.log.info(
            {
              organizationId,

              eventId:
                event.id,

              eventType:
                event.type,

              inboxEventId:
                claim.eventId,

              processingStatus:
                claim.processingStatus,

              attempts:
                claim.attempts,
            },
            "Ignored duplicate Property Finder webhook delivery",
          );

          return reply
            .code(200)
            .send({
              received:
                true,

              duplicate:
                true,

              eventId:
                event.id,

              processingStatus:
                claim.processingStatus,
            });
        }

        try {
          /*
           * LISTING WEBHOOK
           */
          if (
            event.type ===
              "listing.published" ||
            event.type ===
              "listing.unpublished"
          ) {
            const result =
              await listingWebhookService
                .process(
                  organizationId,
                  event,
                );

            await webhookEventRepository
              .markProcessed(
                claim.eventId,
              );

            return reply
              .code(200)
              .send({
                received:
                  true,

                eventId:
                  event.id,

                eventType:
                  event.type,

                externalListingId:
                  result.externalListingId,

                listingId:
                  result.listingId,

                action:
                  result.action,

                inquiriesReconciled:
                  result.inquiriesReconciled,
              });
          }

          /*
           * LEAD TYPE GUARD
           */
          if (
            !isPropertyFinderLeadWebhookEvent(
              event,
            )
          ) {
            await webhookEventRepository
              .markIgnored(
                claim.eventId,
              );

            return reply
              .code(204)
              .send();
          }

          /*
           * LEAD ENTITY VALIDATION
           */
          if (
            event.entity?.type !==
            "lead"
          ) {
            throw new AppError(
              "Property Finder webhook entity is not a Lead",
              {
                statusCode:
                  400,

                code:
                  "INVALID_PROPERTY_FINDER_WEBHOOK_ENTITY",
              },
            );
          }

          /*
           * Your existing mapper,
           * listing resolver and importLead
           * code stays here.
           */

          const mapped =
            mapPropertyFinderLeadWebhook(
              event,
            );

          /*
          * Ensure the referenced Listing exists locally
          * before importing/linking the Lead.
          */

          if (
              mapped.externalListingId ||
              mapped.externalListingReference
            ) {
              await listingResolver
                .resolveForLead(
                  organizationId,
                  mapped.externalListingId,
                  mapped.externalListingReference,
                );
            }

          /*
           * KEEP YOUR EXISTING
           * listingResolver.resolve(...)
           * call here.
           */

          const result =
            await repository
              .importLead(
                organizationId,
                mapped,
              );

          await webhookEventRepository
            .markProcessed(
              claim.eventId,
            );

          /*
           * KEEP YOUR EXISTING LOGGING
           */

          return reply
            .code(200)
            .send({
              received:
                true,

              eventId:
                event.id,

              externalInquiryId:
                mapped.externalInquiryId,

              inquiryCreated:
                result.inquiryCreated,

              inquiryUpdated:
                result.inquiryUpdated,
            });
        }
        catch (error) {
          const errorMessage =
            getWebhookErrorMessage(
              error,
            );

          try {
            await webhookEventRepository
              .markFailed(
                claim.eventId,
                errorMessage,
              );
          }
          catch (
            markFailedError
          ) {
            request.log.error(
              {
                organizationId,

                eventId:
                  event.id,

                eventType:
                  event.type,

                inboxEventId:
                  claim.eventId,

                error:
                  getWebhookErrorMessage(
                    markFailedError,
                  ),
              },
              "Unable to mark Property Finder webhook event as failed",
            );
          }

          request.log.error(
            {
              organizationId,

              eventId:
                event.id,

              eventType:
                event.type,

              inboxEventId:
                claim.eventId,

              attempts:
                claim.attempts,

              error:
                errorMessage,
            },
            "Property Finder webhook processing failed",
          );

          throw error;
        }
      },
    );
  };