import {
  and,
  eq,
  lt,
  or,
  sql,
} from "drizzle-orm";

import {
  integrationWebhookEvents,
  type DatabaseConnection,
} from "@axos/database";

/*
 * A webhook request should never remain "processing"
 * forever if the process dies after claiming it.
 *
 * Property Finder webhook processing should be very short,
 * so two minutes is deliberately conservative.
 */
const PROCESSING_LEASE_MS =
  2 * 60 * 1000;

export interface ClaimIntegrationWebhookEventInput {
  organizationId: string;

  provider: string;

  externalEventId: string;

  eventType: string;

  externalEntityId?:
    string | null;

  externalEntityType?:
    string | null;

  signatureVerified:
    boolean;

  occurredAt?:
    Date | null;

  payload:
    unknown;
}

export type IntegrationWebhookProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export type ClaimIntegrationWebhookEventResult =
  | {
      claimed: true;

      eventId: string;

      processingStatus:
        "processing";

      attempts: number;
    }
  | {
      claimed: false;

      eventId: string;

      processingStatus:
        IntegrationWebhookProcessingStatus;

      attempts: number;
    };

export class IntegrationWebhookEventRepository {
  constructor(
    private readonly database:
      DatabaseConnection,
  ) {}

  /*
   * ==========================================================
   * CLAIM
   * ==========================================================
   *
   * First delivery:
   *
   *   insert event directly as processing
   *   attempts = 1
   *
   * Duplicate delivery:
   *
   *   processed / ignored
   *     -> do not process again
   *
   *   processing and still within lease
   *     -> do not process concurrently
   *
   *   failed
   *     -> reclaim and retry
   *
   *   stale processing
   *     -> reclaim in case the previous process crashed
   *
   * The unique DB index on:
   *
   * organization_id + provider + external_event_id
   *
   * makes the initial claim atomic.
   */
  async claim(
    input:
      ClaimIntegrationWebhookEventInput,
  ): Promise<
    ClaimIntegrationWebhookEventResult
  > {
    const now =
      new Date();

    /*
     * --------------------------------------------------------
     * FIRST DELIVERY
     * --------------------------------------------------------
     */

    const [inserted] =
      await this.database.db
        .insert(
          integrationWebhookEvents,
        )
        .values({
          organizationId:
            input.organizationId,

          provider:
            input.provider,

          externalEventId:
            input.externalEventId,

          eventType:
            input.eventType,

          externalEntityId:
            input.externalEntityId ??
            null,

          externalEntityType:
            input.externalEntityType ??
            null,

          signatureVerified:
            input.signatureVerified,

          processingStatus:
            "processing",

          attempts:
            1,

          occurredAt:
            input.occurredAt ??
            null,

          receivedAt:
            now,

          payload:
            input.payload,

          updatedAt:
            now,
        })
        .onConflictDoNothing({
          target: [
            integrationWebhookEvents
              .organizationId,

            integrationWebhookEvents
              .provider,

            integrationWebhookEvents
              .externalEventId,
          ],
        })
        .returning({
          eventId:
            integrationWebhookEvents.id,

          processingStatus:
            integrationWebhookEvents
              .processingStatus,

          attempts:
            integrationWebhookEvents
              .attempts,
        });

    if (inserted) {
      return {
        claimed:
          true,

        eventId:
          inserted.eventId,

        processingStatus:
          "processing",

        attempts:
          inserted.attempts,
      };
    }

    /*
     * --------------------------------------------------------
     * RETRY / STALE PROCESSING
     * --------------------------------------------------------
     *
     * Only one concurrent request can change one of these
     * states to processing.
     */

    const staleBefore =
      new Date(
        now.getTime() -
          PROCESSING_LEASE_MS,
      );

    const [reclaimed] =
      await this.database.db
        .update(
          integrationWebhookEvents,
        )
        .set({
          processingStatus:
            "processing",

          attempts:
            sql`
              ${integrationWebhookEvents.attempts}
              + 1
            `,

          processedAt:
            null,

          lastError:
            null,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              integrationWebhookEvents
                .organizationId,
              input.organizationId,
            ),

            eq(
              integrationWebhookEvents
                .provider,
              input.provider,
            ),

            eq(
              integrationWebhookEvents
                .externalEventId,
              input.externalEventId,
            ),

            or(
              eq(
                integrationWebhookEvents
                  .processingStatus,
                "received",
              ),

              eq(
                integrationWebhookEvents
                  .processingStatus,
                "failed",
              ),

              and(
                eq(
                  integrationWebhookEvents
                    .processingStatus,
                  "processing",
                ),

                lt(
                  integrationWebhookEvents
                    .updatedAt,
                  staleBefore,
                ),
              ),
            ),
          ),
        )
        .returning({
          eventId:
            integrationWebhookEvents.id,

          processingStatus:
            integrationWebhookEvents
              .processingStatus,

          attempts:
            integrationWebhookEvents
              .attempts,
        });

    if (reclaimed) {
      return {
        claimed:
          true,

        eventId:
          reclaimed.eventId,

        processingStatus:
          "processing",

        attempts:
          reclaimed.attempts,
      };
    }

    /*
     * --------------------------------------------------------
     * DUPLICATE
     * --------------------------------------------------------
     *
     * Usually this means:
     *
     * processed
     * ignored
     * currently processing
     */

    const [existing] =
      await this.database.db
        .select({
          eventId:
            integrationWebhookEvents.id,

          processingStatus:
            integrationWebhookEvents
              .processingStatus,

          attempts:
            integrationWebhookEvents
              .attempts,
        })
        .from(
          integrationWebhookEvents,
        )
        .where(
          and(
            eq(
              integrationWebhookEvents
                .organizationId,
              input.organizationId,
            ),

            eq(
              integrationWebhookEvents
                .provider,
              input.provider,
            ),

            eq(
              integrationWebhookEvents
                .externalEventId,
              input.externalEventId,
            ),
          ),
        )
        .limit(1);

    if (!existing) {
      throw new Error(
        "Unable to resolve integration webhook event after claim conflict",
      );
    }

    return {
      claimed:
        false,

      eventId:
        existing.eventId,

      processingStatus:
        existing.processingStatus,

      attempts:
        existing.attempts,
    };
  }

  /*
   * ==========================================================
   * PROCESSED
   * ==========================================================
   */

  async markProcessed(
    eventId: string,
  ) {
    const now =
      new Date();

    const [event] =
      await this.database.db
        .update(
          integrationWebhookEvents,
        )
        .set({
          processingStatus:
            "processed",

          processedAt:
            now,

          lastError:
            null,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              integrationWebhookEvents.id,
              eventId,
            ),

            eq(
              integrationWebhookEvents
                .processingStatus,
              "processing",
            ),
          ),
        )
        .returning({
          id:
            integrationWebhookEvents.id,
        });

    return Boolean(event);
  }

  /*
   * ==========================================================
   * FAILED
   * ==========================================================
   */

  async markFailed(
    eventId: string,
    errorMessage: string,
  ) {
    const now =
      new Date();

    /*
     * Keep the diagnostic bounded.
     *
     * Never pass credentials, webhook secrets or signatures
     * into this value.
     */
    const safeError =
      errorMessage
        .slice(
          0,
          4000,
        );

    const [event] =
      await this.database.db
        .update(
          integrationWebhookEvents,
        )
        .set({
          processingStatus:
            "failed",

          processedAt:
            null,

          lastError:
            safeError,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              integrationWebhookEvents.id,
              eventId,
            ),

            eq(
              integrationWebhookEvents
                .processingStatus,
              "processing",
            ),
          ),
        )
        .returning({
          id:
            integrationWebhookEvents.id,
        });

    return Boolean(event);
  }

  /*
   * ==========================================================
   * IGNORED
   * ==========================================================
   */

  async markIgnored(
    eventId: string,
  ) {
    const now =
      new Date();

    const [event] =
      await this.database.db
        .update(
          integrationWebhookEvents,
        )
        .set({
          processingStatus:
            "ignored",

          processedAt:
            now,

          lastError:
            null,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              integrationWebhookEvents.id,
              eventId,
            ),

            eq(
              integrationWebhookEvents
                .processingStatus,
              "processing",
            ),
          ),
        )
        .returning({
          id:
            integrationWebhookEvents.id,
        });

    return Boolean(event);
  }
}