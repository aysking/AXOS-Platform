import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  organizations,
} from "./foundation.schema.js";

/*
 * ============================================================
 * INTEGRATION WEBHOOK PROCESSING STATUS
 * ============================================================
 *
 * This is a technical infrastructure status,
 * not an organization-configurable business status.
 *
 * received:
 *   persisted but not yet claimed for processing
 *
 * processing:
 *   currently claimed by a worker/request
 *
 * processed:
 *   processing completed successfully
 *
 * failed:
 *   processing failed and may be retried
 *
 * ignored:
 *   valid/authenticated event intentionally not processed
 */
export const integrationWebhookProcessingStatus =
  pgEnum(
    "integration_webhook_processing_status",
    [
      "received",
      "processing",
      "processed",
      "failed",
      "ignored",
    ],
  );

/*
 * ============================================================
 * INTEGRATION WEBHOOK EVENTS
 * ============================================================
 *
 * Provider-neutral durable webhook inbox.
 *
 * Examples of provider:
 *   property_finder
 *   bayut
 *
 * external_event_id is the provider-owned webhook delivery
 * event identifier.
 *
 * For Property Finder this is event.id and is the value
 * used for webhook-level deduplication.
 */
export const integrationWebhookEvents =
  pgTable(
    "integration_webhook_events",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      organizationId: uuid(
        "organization_id",
      )
        .notNull()
        .references(
          () => organizations.id,
          {
            onDelete: "cascade",
          },
        ),

      /*
       * Keep provider as text rather than a PostgreSQL enum.
       *
       * New integrations can therefore be introduced without
       * requiring an enum migration solely to add a provider.
       */
      provider: text(
        "provider",
      ).notNull(),

      /*
       * Provider-owned unique event/delivery identifier.
       *
       * Property Finder:
       * event.id
       */
      externalEventId: text(
        "external_event_id",
      ).notNull(),

      /*
       * Examples:
       *
       * lead.created
       * lead.updated
       * lead.assigned
       * listing.published
       * listing.unpublished
       */
      eventType: text(
        "event_type",
      ).notNull(),

      /*
       * Provider-owned entity identity.
       *
       * Examples:
       * entity.id   = Property Finder Lead/listing ID
       * entity.type = lead/listing
       */
      externalEntityId: text(
        "external_entity_id",
      ),

      externalEntityType: text(
        "external_entity_type",
      ),

      /*
       * Records that authentication succeeded before this
       * event entered the durable inbox.
       *
       * Never persist webhook secrets or full signatures here.
       */
      signatureVerified: boolean(
        "signature_verified",
      )
        .notNull()
        .default(false),

      processingStatus:
        integrationWebhookProcessingStatus(
          "processing_status",
        )
          .notNull()
          .default("received"),

      /*
       * Number of processing claims.
       *
       * First processing attempt = 1.
       */
      attempts: integer(
        "attempts",
      )
        .notNull()
        .default(0),

      /*
       * Provider event time.
       *
       * Nullable because the infrastructure is provider-neutral
       * and another provider may not supply a reliable event time.
       */
      occurredAt: timestamp(
        "occurred_at",
        {
          withTimezone: true,
        },
      ),

      /*
       * First time AXOS received this provider event.
       */
      receivedAt: timestamp(
        "received_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),

      /*
       * Set when processing finishes successfully or when
       * AXOS intentionally ignores the event.
       */
      processedAt: timestamp(
        "processed_at",
        {
          withTimezone: true,
        },
      ),

      /*
       * Failure diagnostic only.
       *
       * Do not place credentials/secrets in this field.
       */
      lastError: text(
        "last_error",
      ),

      /*
       * Original parsed provider event.
       *
       * This is intentionally JSONB because providers have
       * different event structures and may evolve them.
       */
      payload: jsonb(
        "payload",
      ).notNull(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },

    (table) => ({
      /*
       * The core idempotency guarantee.
       *
       * The same provider event cannot be persisted twice
       * for the same AXOS Organization.
       */
      organizationProviderEventUnique:
        uniqueIndex(
          "integration_webhook_events_org_provider_event_unique",
        ).on(
          table.organizationId,
          table.provider,
          table.externalEventId,
        ),

      /*
       * Used by processing/retry workers.
       */
      processingIdx:
        index(
          "integration_webhook_events_processing_idx",
        ).on(
          table.organizationId,
          table.provider,
          table.processingStatus,
          table.receivedAt,
        ),

      /*
       * Useful for audit/history and provider event analysis.
       */
      eventTypeIdx:
        index(
          "integration_webhook_events_type_idx",
        ).on(
          table.organizationId,
          table.provider,
          table.eventType,
          table.receivedAt,
        ),

      /*
       * Allows finding all webhook events associated with a
       * provider entity.
       */
      entityIdx:
        index(
          "integration_webhook_events_entity_idx",
        ).on(
          table.organizationId,
          table.provider,
          table.externalEntityType,
          table.externalEntityId,
        ),
    }),
  );