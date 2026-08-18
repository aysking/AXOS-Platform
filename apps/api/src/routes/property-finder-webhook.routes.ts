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
  PropertyFinderLeadWebhookEvent,
} from "../integrations/property-finder/property-finder.types.js";

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
  createHash,
  createHmac,
} from "node:crypto";

export interface PropertyFinderWebhookRouteOptions {
  database:
    DatabaseConnection;
}

const organizationIdSchema =
  z.string().uuid();

const supportedEvents =
  new Set([
    "lead.created",
    "lead.updated",
    "lead.assigned",
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

    app.post<{
      Params: {
        organizationId: string;
      };

      Body:
        PropertyFinderLeadWebhookEvent;
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
        
        const secretFingerprint =
          createHash("sha256")
            .update(
              secret,
              "utf8",
            )
            .digest("hex")
            .slice(0, 12);

        const expectedSignaturePrefix =
          createHmac(
            "sha256",
            secret,
          )
            .update(
              rawBody,
              "utf8",
            )
            .digest("hex")
            .slice(0, 12);

        const receivedSignature =
          request.headers[
            "x-signature"
          ];

        request.log.info(
          {
            secretSeedLength:
              secretSeed.length,

            derivedSecretLength:
              secret.length,

            secretFingerprint,

            rawBodyLength:
              Buffer.byteLength(
                rawBody,
                "utf8",
              ),

            expectedSignaturePrefix,

            receivedSignaturePrefix:
              typeof receivedSignature ===
              "string"
                ? receivedSignature.slice(
                    0,
                    12,
                  )
                : null,
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
         * ----------------------------------------------------
         * REUSE EXISTING IMPORT PIPELINE
         * ----------------------------------------------------
         */

        const mapped =
          mapPropertyFinderLeadWebhook(
            event,
          );

        const result =
          await repository
            .importLead(
              organizationId,
              mapped,
            );

        request.log.info(
          {
            organizationId,

            eventId:
              event.id,

            eventType:
              event.type,

            externalInquiryId:
              mapped
                .externalInquiryId,

            leadId:
              result.leadId,

            inquiryCreated:
              result.inquiryCreated,

            inquiryUpdated:
              result.inquiryUpdated,

            leadCreated:
              result.leadCreated,
          },
          "Property Finder webhook processed",
        );

        return reply
          .code(200)
          .send({
            received:
              true,

            eventId:
              event.id,

            externalInquiryId:
              mapped
                .externalInquiryId,

            inquiryCreated:
              result
                .inquiryCreated,

            inquiryUpdated:
              result
                .inquiryUpdated,
          });
      },
    );
  };