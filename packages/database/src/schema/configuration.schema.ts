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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import {
  memberships,
  organizations,
} from "./foundation.schema.js";

/*
 * ============================================================
 * BUSINESS STATUS DEFINITIONS
 * ============================================================
 *
 * Organization-configurable business statuses.
 *
 * IMPORTANT:
 *
 * Workflows must reference status_definition.id rather than
 * the editable display label.
 *
 * Examples:
 *
 * Lead:
 *   New
 *   Upcoming
 *   Qualified
 *
 * Offer:
 *   Draft
 *   Submitted
 *   Accepted
 *
 * Display labels may change without breaking workflow rules.
 */

export const businessStatusSemantic =
  pgEnum(
    "business_status_semantic",
    [
      "open",
      "success",
      "failure",
      "neutral",
    ],
  );

export const statusDefinitions =
  pgTable(
    "status_definitions",
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
       * Examples:
       *
       * lead
       * offer
       * sale_transaction
       * reservation
       */
      entityType: text(
        "entity_type",
      ).notNull(),

      /*
       * Stable organization-level machine key.
       *
       * The label can change.
       * This key should normally remain stable.
       */
      key: text("key").notNull(),

      /*
       * User-facing editable value.
       */
      label: text("label").notNull(),

      description: text(
        "description",
      ),

      semantic:
        businessStatusSemantic(
          "semantic",
        )
          .notNull()
          .default("neutral"),

      isTerminal: boolean(
        "is_terminal",
      )
        .notNull()
        .default(false),

      /*
       * Indicates the organization's default
       * starting status for the entity.
       */
      isDefault: boolean(
        "is_default",
      )
        .notNull()
        .default(false),

      isActive: boolean(
        "is_active",
      )
        .notNull()
        .default(true),

      sequence: integer(
        "sequence",
      )
        .notNull()
        .default(0),

      metadata: jsonb(
        "metadata",
      ),

      createdByMembershipId:
        uuid(
          "created_by_membership_id",
        ).references(
          () => memberships.id,
          {
            onDelete: "set null",
          },
        ),

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
      organizationEntityKeyUnique:
        uniqueIndex(
          "status_definitions_org_entity_key_unique",
        ).on(
          table.organizationId,
          table.entityType,
          table.key,
        ),

      organizationEntityIdx:
        index(
          "status_definitions_org_entity_idx",
        ).on(
          table.organizationId,
          table.entityType,
        ),

      activeIdx: index(
        "status_definitions_active_idx",
      ).on(
        table.organizationId,
        table.entityType,
        table.isActive,
      ),

      sequenceIdx: index(
        "status_definitions_sequence_idx",
      ).on(
        table.organizationId,
        table.entityType,
        table.sequence,
      ),
    }),
  );

/*
 * ============================================================
 * STATUS TRANSITIONS
 * ============================================================
 *
 * Defines which transitions are permitted for an organization.
 *
 * This replaces hard-coded TypeScript transition maps.
 */

export const statusTransitions =
  pgTable(
    "status_transitions",
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

      entityType: text(
        "entity_type",
      ).notNull(),

      fromStatusDefinitionId:
        uuid(
          "from_status_definition_id",
        )
          .notNull()
          .references(
            (): AnyPgColumn =>
              statusDefinitions.id,
            {
              onDelete: "cascade",
            },
          ),

      toStatusDefinitionId:
        uuid(
          "to_status_definition_id",
        )
          .notNull()
          .references(
            (): AnyPgColumn =>
              statusDefinitions.id,
            {
              onDelete: "cascade",
            },
          ),

      isActive: boolean(
        "is_active",
      )
        .notNull()
        .default(true),

      /*
       * A transition may later require a workflow
       * execution before being completed.
       */
      requiresWorkflow: boolean(
        "requires_workflow",
      )
        .notNull()
        .default(false),

      metadata: jsonb(
        "metadata",
      ),

      createdByMembershipId:
        uuid(
          "created_by_membership_id",
        ).references(
          () => memberships.id,
          {
            onDelete: "set null",
          },
        ),

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
      transitionUnique:
        uniqueIndex(
          "status_transitions_unique",
        ).on(
          table.organizationId,
          table.entityType,
          table.fromStatusDefinitionId,
          table.toStatusDefinitionId,
        ),

      fromStatusIdx: index(
        "status_transitions_from_idx",
      ).on(
        table.organizationId,
        table.fromStatusDefinitionId,
      ),

      toStatusIdx: index(
        "status_transitions_to_idx",
      ).on(
        table.organizationId,
        table.toStatusDefinitionId,
      ),
    }),
  );

/*
 * ============================================================
 * TIMELINE RESPONSE DEFINITIONS
 * ============================================================
 *
 * Editable organization-owned response presets.
 *
 * These are deliberately NOT PostgreSQL enums.
 *
 * Example:
 *
 * eventType = call
 * label     = No Answer
 *
 * The definition may trigger:
 *
 * - next action creation
 * - status change
 * - workflow
 * - notification
 */

export const timelineResponseDefinitions =
  pgTable(
    "timeline_response_definitions",
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

      entityType: text(
        "entity_type",
      ).notNull(),

      eventType: text(
        "event_type",
      ).notNull(),

      key: text("key").notNull(),

      label: text("label").notNull(),

      defaultDescription: text(
        "default_description",
      ),

      requiresNextAction: boolean(
        "requires_next_action",
      )
        .notNull()
        .default(false),

      /*
       * Example:
       *
       * 1440 = one day
       *
       * Null means no automatic default interval.
       */
      defaultNextActionDelayMinutes:
        integer(
          "default_next_action_delay_minutes",
        ),

      isActive: boolean(
        "is_active",
      )
        .notNull()
        .default(true),

      sequence: integer(
        "sequence",
      )
        .notNull()
        .default(0),

      metadata: jsonb(
        "metadata",
      ),

      createdByMembershipId:
        uuid(
          "created_by_membership_id",
        ).references(
          () => memberships.id,
          {
            onDelete: "set null",
          },
        ),

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
      responseUnique:
        uniqueIndex(
          "timeline_response_definitions_unique",
        ).on(
          table.organizationId,
          table.entityType,
          table.eventType,
          table.key,
        ),

      organizationEntityIdx:
        index(
          "timeline_response_definitions_org_entity_idx",
        ).on(
          table.organizationId,
          table.entityType,
        ),

      eventTypeIdx: index(
        "timeline_response_definitions_event_idx",
      ).on(
        table.organizationId,
        table.entityType,
        table.eventType,
      ),
    }),
  );

/*
 * ============================================================
 * MEMBERSHIP REPORTING LINES
 * ============================================================
 *
 * Management/reporting hierarchy is deliberately separate
 * from Groups.
 *
 * Used by:
 *
 * - next-action escalation
 * - management notifications
 * - future approval routing
 */

export const membershipReportingLines =
  pgTable(
    "membership_reporting_lines",
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

      membershipId: uuid(
        "membership_id",
      )
        .notNull()
        .references(
          () => memberships.id,
          {
            onDelete: "cascade",
          },
        ),

      managerMembershipId: uuid(
        "manager_membership_id",
      )
        .notNull()
        .references(
          () => memberships.id,
          {
            onDelete: "cascade",
          },
        ),

      relationshipType: text(
        "relationship_type",
      )
        .notNull()
        .default("line_manager"),

      effectiveFrom: timestamp(
        "effective_from",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),

      effectiveTo: timestamp(
        "effective_to",
        {
          withTimezone: true,
        },
      ),

      active: boolean(
        "active",
      )
        .notNull()
        .default(true),

      metadata: jsonb(
        "metadata",
      ),

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
      membershipIdx: index(
        "membership_reporting_lines_membership_idx",
      ).on(
        table.organizationId,
        table.membershipId,
        table.active,
      ),

      managerIdx: index(
        "membership_reporting_lines_manager_idx",
      ).on(
        table.organizationId,
        table.managerMembershipId,
        table.active,
      ),
    }),
  );