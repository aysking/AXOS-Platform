import type {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import type {
  PropertyFinderLeadWebhookEventType,
} from "../integrations/property-finder/property-finder.types.js";

import {
  derivePropertyFinderWebhookSecret,
} from "../integrations/property-finder/property-finder-webhook.utils.js";

import {
  AppError,
} from "../errors/app-error.js";

const requiredLeadEvents:
  PropertyFinderLeadWebhookEventType[] =
  [
    "lead.created",
    "lead.updated",
    "lead.assigned",
  ];

export class PropertyFinderWebhookSubscriptionService {
  constructor(
    private readonly client:
      PropertyFinderClient,
  ) {}

  async ensureLeadSubscriptions(
    organizationId:
      string,

    publicBaseUrl:
      string,

    webhookSecretSeed:
      string,
  ) {
    const baseUrl =
      publicBaseUrl
        .replace(
          /\/+$/,
          "",
        );

    const callbackUrl =
      `${baseUrl}/webhooks/property-finder/${organizationId}`;

    const secret =
      derivePropertyFinderWebhookSecret(
        webhookSecretSeed,
        organizationId,
      );

    const existingResponse =
      await this.client
        .listWebhookSubscriptions();

    const existing =
      existingResponse.data ??
      [];

    const created:
      string[] = [];

    const alreadyPresent:
      string[] = [];

    for (
      const eventId of
        requiredLeadEvents
    ) {
      const found =
        existing.some(
          (
            subscription,
          ) => {
            const existingCallbackUrl =
              subscription.callbackUrl ??
              subscription.url ??
              null;

            return (
              subscription.eventId ===
                eventId &&
              existingCallbackUrl ===
                callbackUrl
            );
          },
        );

      if (found) {
        alreadyPresent.push(
          eventId,
        );

        continue;
      }

      try {
        await this.client
          .subscribeWebhook(
            eventId,
            callbackUrl,
            secret,
          );

        created.push(
          eventId,
        );
      } catch (error) {
        /*
        * Property Finder returns 409 when the same
        * event + callback URL already exists.
        *
        * Treat that as success for our
        * "ensure subscriptions" operation.
        */
        if (
          error instanceof AppError &&
          error.code ===
            "PROPERTY_FINDER_API_ERROR"
        ) {
          const details =
            error.details;

          if (
            typeof details ===
              "object" &&
            details !== null &&
            "upstreamStatus" in
              details &&
            details.upstreamStatus ===
              409
          ) {
            alreadyPresent.push(
              eventId,
            );

            continue;
          }
        }

        throw error;
      }
    }

    /*
     * Never return the HMAC secret.
     */
    return {
      provider:
        "property_finder",

      callbackUrl,

      created,

      alreadyPresent,

      requiredEvents:
        requiredLeadEvents,
    };
  }
}