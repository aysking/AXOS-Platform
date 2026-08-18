import {
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
  memberships,
  organizations,
} from "./foundation.schema.js";

/*
 * ============================================================
 * LEAD
 * ============================================================
 *
 * Lead is the primary commercial object in AXOS.
 *
 * A lead may exist without:
 *   - an AXOS property
 *   - an AXOS unit
 *
 * A lead may reference:
 *   - one or more AXOS properties
 *   - one or more AXOS units
 *   - external properties
 *   - external units
 *
 * The lead remains the center of the sales/leasing process.
 */

export const leadType = pgEnum("lead_type", [
  "sales",
  "leasing",
  "sales_and_leasing",
]);

export const leadStatus = pgEnum("lead_status", [
  "new",
  "active",
  "qualified",
  "offer",
  "converted",
  "lost",
  "closed",
]);

export const leadSource = pgEnum("lead_source", [
  "website",
  "property_portal",
  "referral",
  "walk_in",
  "phone",
  "email",
  "social_media",
  "campaign",
  "other",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    assignedToMembershipId: uuid(
      "assigned_to_membership_id",
    ).references(() => memberships.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),

    firstName: text("first_name").notNull(),

    lastName: text("last_name").notNull(),

    email: text("email"),

    phone: text("phone"),

    leadType: leadType("lead_type")
      .notNull(),

    status: leadStatus("status")
      .notNull()
      .default("new"),

    source: leadSource("source"),

    sourceDetails: text("source_details"),

    notes: text("notes"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    closedAt: timestamp("closed_at", {
      withTimezone: true,
    }),

    archivedAt: timestamp("archived_at", {
    withTimezone: true,
    }),

    archivedByMembershipId: uuid(
      "archived_by_membership_id",
    ).references(() => memberships.id, {
      onDelete: "set null",
    }),

    archiveReason: text(
      "archive_reason",
    ),
  },
  (table) => ({
    organizationIdx: index(
      "leads_organization_idx",
    ).on(table.organizationId),

    assignedToIdx: index(
      "leads_assigned_to_idx",
    ).on(table.assignedToMembershipId),

    statusIdx: index(
      "leads_status_idx",
    ).on(table.status),

    typeIdx: index(
      "leads_type_idx",
    ).on(table.leadType),

    sourceIdx: index(
      "leads_source_idx",
    ).on(table.source),

    createdAtIdx: index(
      "leads_created_at_idx",
    ).on(table.createdAt),

    archivedIdx: index(
      "leads_archived_idx",
    ).on(
      table.organizationId,
      table.archivedAt,
    ),
  }),
);

/*
 * ============================================================
 * PROPERTIES
 * ============================================================
 *
 * Lightweight reference inventory.
 *
 * Phase 1 intentionally does NOT attempt to model full
 * property-management functionality.
 *
 * Properties can exist independently of leads.
 */

export const propertyStatus = pgEnum(
  "property_status",
  [
    "active",
    "inactive",
    "archived",
  ],
);

export const propertyType = pgEnum(
  "property_type",
  [
    "residential",
    "commercial",
    "retail",
    "mixed_use",
    "land",
    "other",
  ],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    referenceCode: text(
      "reference_code",
    ),

    propertyType: propertyType(
      "property_type",
    ),

    status: propertyStatus("status")
      .notNull()
      .default("active"),

    developer: text("developer"),

    addressLine1: text("address_line_1"),

    addressLine2: text("address_line_2"),

    city: text("city"),

    emirate: text("emirate"),

    country: text("country"),

    postalCode: text("postal_code"),

    latitude: text("latitude"),

    longitude: text("longitude"),

    description: text("description"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdx: index(
      "properties_organization_idx",
    ).on(table.organizationId),

    referenceIdx: index(
      "properties_reference_idx",
    ).on(table.referenceCode),

    statusIdx: index(
      "properties_status_idx",
    ).on(table.status),

    typeIdx: index(
      "properties_type_idx",
    ).on(table.propertyType),
  }),
);

/*
 * ============================================================
 * UNITS
 * ============================================================
 *
 * Units are independent reference objects.
 *
 * A unit does NOT have to belong to a property in AXOS.
 *
 * This is intentional because a lead may be created against
 * an external unit that is not currently in AXOS inventory.
 */

export const unitStatus = pgEnum("unit_status", [
  "active",
  "inactive",
  "archived",
]);

export const unitType = pgEnum("unit_type", [
  "apartment",
  "villa",
  "office",
  "retail",
  "warehouse",
  "land",
  "parking",
  "other",
]);

export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    propertyId: uuid("property_id").references(
      () => properties.id,
      {
        onDelete: "set null",
      },
    ),

    unitNumber: text("unit_number").notNull(),

    referenceCode: text(
      "reference_code",
    ),

    unitType: unitType("unit_type"),

    status: unitStatus("status")
      .notNull()
      .default("active"),

    floor: integer("floor"),

    bedrooms: integer("bedrooms"),

    bathrooms: integer("bathrooms"),

    areaSqFt: integer("area_sq_ft"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdx: index(
      "units_organization_idx",
    ).on(table.organizationId),

    propertyIdx: index(
      "units_property_idx",
    ).on(table.propertyId),

    referenceIdx: index(
      "units_reference_idx",
    ).on(table.referenceCode),

    statusIdx: index(
      "units_status_idx",
    ).on(table.status),

    typeIdx: index(
      "units_type_idx",
    ).on(table.unitType),
  }),
);

/*
 * ============================================================
 * LEAD <-> PROPERTY
 * ============================================================
 *
 * Many-to-many.
 *
 * A lead can be interested in multiple properties.
 */

export const leadProperties = pgTable(
  "lead_properties",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, {
        onDelete: "cascade",
      }),

    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leadPropertyUnique: uniqueIndex(
      "lead_properties_unique",
    ).on(
      table.leadId,
      table.propertyId,
    ),

    leadIdx: index(
      "lead_properties_lead_idx",
    ).on(table.leadId),

    propertyIdx: index(
      "lead_properties_property_idx",
    ).on(table.propertyId),
  }),
);

/*
 * ============================================================
 * LEAD <-> UNIT
 * ============================================================
 *
 * Many-to-many.
 *
 * A lead can be interested in multiple units.
 */

export const leadUnits = pgTable(
  "lead_units",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, {
        onDelete: "cascade",
      }),

    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leadUnitUnique: uniqueIndex(
      "lead_units_unique",
    ).on(
      table.leadId,
      table.unitId,
    ),

    leadIdx: index(
      "lead_units_lead_idx",
    ).on(table.leadId),

    unitIdx: index(
      "lead_units_unit_idx",
    ).on(table.unitId),
  }),
);

/*
 * ============================================================
 * EXTERNAL LEAD PROPERTY
 * ============================================================
 *
 * Allows a lead to reference a property that is NOT in AXOS
 * inventory.
 *
 * This is important for brokerage use cases.
 */

export const leadExternalProperties =
  pgTable(
    "lead_external_properties",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      leadId: uuid("lead_id")
        .notNull()
        .references(() => leads.id, {
          onDelete: "cascade",
        }),

      propertyName: text(
        "property_name",
      ).notNull(),

      developer: text("developer"),

      address: text("address"),

      city: text("city"),

      emirate: text("emirate"),

      propertyType: text(
        "property_type",
      ),

      referenceCode: text(
        "reference_code",
      ),

      notes: text("notes"),

      metadata: jsonb("metadata"),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },
    (table) => ({
      leadIdx: index(
        "lead_external_properties_lead_idx",
      ).on(table.leadId),

      referenceIdx: index(
        "lead_external_properties_reference_idx",
      ).on(table.referenceCode),
    }),
  );

/*
 * ============================================================
 * EXTERNAL LEAD UNIT
 * ============================================================
 *
 * Allows a lead to reference a unit that is NOT in AXOS
 * inventory.
 */

export const leadExternalUnits =
  pgTable(
    "lead_external_units",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      leadId: uuid("lead_id")
        .notNull()
        .references(() => leads.id, {
          onDelete: "cascade",
        }),

      unitNumber: text(
        "unit_number",
      ),

      propertyName: text(
        "property_name",
      ),

      address: text("address"),

      city: text("city"),

      emirate: text("emirate"),

      unitType: text("unit_type"),

      bedrooms: integer("bedrooms"),

      bathrooms: integer("bathrooms"),

      areaSqFt: integer("area_sq_ft"),

      referenceCode: text(
        "reference_code",
      ),

      notes: text("notes"),

      metadata: jsonb("metadata"),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },
    (table) => ({
      leadIdx: index(
        "lead_external_units_lead_idx",
      ).on(table.leadId),

      referenceIdx: index(
        "lead_external_units_reference_idx",
      ).on(table.referenceCode),
    }),
  );

/*
 * ============================================================
 * LEAD TIMELINE
 * ============================================================
 *
 * The lead timeline is a first-class object.
 *
 * Every meaningful interaction/state change can be recorded
 * here:
 *
 *   - lead created
 *   - assignment
 *   - call
 *   - email
 *   - viewing
 *   - property added
 *   - unit added
 *   - status changed
 *   - offer created
 *   - note
 *   - etc.
 *
 * This is deliberately generic enough to support future
 * workflow automation.
 */

export const leadTimelineEventType =
  pgEnum(
    "lead_timeline_event_type",
    [
      "created",
      "updated",
      "assigned",
      "status_changed",
      "call",
      "email",
      "message",
      "meeting",
      "viewing",
      "property_added",
      "property_removed",
      "unit_added",
      "unit_removed",
      "note",
      "offer_created",
      "offer_updated",
      "custom",
      "archived",
    ],
  );

export const leadTimelineEvents =
  pgTable(
    "lead_timeline_events",
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

      leadId: uuid("lead_id")
        .notNull()
        .references(() => leads.id, {
          onDelete: "cascade",
        }),

      createdByMembershipId:
        uuid(
          "created_by_membership_id",
        ).references(
          () => memberships.id,
          {
            onDelete: "set null",
          },
        ),

      eventType:
        leadTimelineEventType(
          "event_type",
        ).notNull(),

      title: text("title").notNull(),

      description: text(
        "description",
      ),

      metadata: jsonb("metadata"),

      occurredAt: timestamp(
        "occurred_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },
    (table) => ({
      organizationIdx: index(
        "lead_timeline_events_organization_idx",
      ).on(table.organizationId),

      leadIdx: index(
        "lead_timeline_events_lead_idx",
      ).on(table.leadId),

      occurredAtIdx: index(
        "lead_timeline_events_occurred_at_idx",
      ).on(
        table.leadId,
        table.occurredAt,
      ),

      eventTypeIdx: index(
        "lead_timeline_events_type_idx",
      ).on(table.eventType),
    }),
  );