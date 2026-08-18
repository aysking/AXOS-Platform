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
  boolean,
  date,
  numeric,
} from "drizzle-orm/pg-core";

import {
  memberships,
  organizations,
} from "./foundation.schema.js";

import {
  statusDefinitions,
  timelineResponseDefinitions,
} from "./configuration.schema.js";

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

    /*
    * Display name is the canonical human-readable name.
    *
    * Portal integrations such as Property Finder may provide
    * only a single sender name rather than structured
    * first/last/title components.
    */
    displayName: text(
      "display_name",
    ),

    title: text("title"),

    firstName: text("first_name"),

    lastName: text("last_name"),

    email: text("email"),

    phone: text("phone"),

    leadType: leadType("lead_type")
      .notNull(),
    
    status: leadStatus("status")
      .notNull()
      .default("new"),

    /*
    * Transitional field.
    *
    * This will replace the legacy PostgreSQL lead_status
    * enum after existing data and API logic have migrated.
    */
    statusDefinitionId: uuid(
      "status_definition_id",
    ).references(
      () => statusDefinitions.id,
      {
        onDelete: "restrict",
      },
    ),

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

    /*
    * ==========================================================
    * LEAD ACTION / FOLLOW-UP
    * ==========================================================
    */

    closedAt: timestamp("closed_at", {
      withTimezone: true,
    }),

    nextActionAt: timestamp(
      "next_action_at",
      {
        withTimezone: true,
      },
    ),

    nextActionDescription: text(
      "next_action_description",
    ),

    nextActionByMembershipId: uuid(
      "next_action_by_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    nextActionCompletedAt: timestamp(
      "next_action_completed_at",
      {
        withTimezone: true,
      },
    ),

    lastActivityAt: timestamp(
      "last_activity_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

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
    statusDefinitionIdx: index(
      "leads_status_definition_idx",
    ).on(
      table.organizationId,
      table.statusDefinitionId,
    ),

    nextActionIdx: index(
      "leads_next_action_idx",
    ).on(
      table.organizationId,
      table.nextActionAt,
    ),

    nextActionOwnerIdx: index(
      "leads_next_action_owner_idx",
    ).on(
      table.organizationId,
      table.nextActionByMembershipId,
    ),

    lastActivityIdx: index(
      "leads_last_activity_idx",
    ).on(
      table.organizationId,
      table.lastActivityAt,
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
 * LISTINGS
 * ============================================================
 *
 * Listing represents a market-facing advertisement.
 *
 * It is NOT the same thing as a Property or Unit.
 *
 * A listing may optionally reference an AXOS Property/Unit,
 * but it can also exist solely from an external portal.
 *
 * Initially populated from Property Finder.
 *
 * The provider field intentionally remains generic so future
 * Bayut listings can use the same table.
 */

export const listings = pgTable(
  "listings",
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
     * property_finder
     * bayut
     * manual
     */
    provider: text(
      "provider",
    ).notNull(),

    /*
     * Provider-owned listing identifier.
     *
     * Property Finder currently returns this as a string.
     */
    externalId: text(
      "external_id",
    ).notNull(),

    /*
     * Brokerage/listing reference returned by the portal.
     */
    reference: text(
      "reference",
    ),

    /*
     * Optional mapping back to AXOS inventory.
     */
    propertyId: uuid(
      "property_id",
    ).references(
      () => properties.id,
      {
        onDelete: "set null",
      },
    ),

    unitId: uuid(
      "unit_id",
    ).references(
      () => units.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * AXOS membership resolved from the external portal agent.
     */
    assignedToMembershipId: uuid(
      "assigned_to_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * Provider-side agent/public-profile details.
     *
     * Kept as text because different portals may use
     * different identifier formats.
     */
    externalAssignedToId: text(
      "external_assigned_to_id",
    ),

    externalAssignedToName: text(
      "external_assigned_to_name",
    ),

    titleEn: text(
      "title_en",
    ),

    titleAr: text(
      "title_ar",
    ),

    descriptionEn: text(
      "description_en",
    ),

    descriptionAr: text(
      "description_ar",
    ),

    /*
     * residential / commercial
     */
    category: text(
      "category",
    ),

    /*
     * sale / rent
     *
     * Normalized by the integration adapter.
     */
    offeringType: text(
      "offering_type",
    ),

    /*
     * apartment / villa / office-space / etc.
     */
    propertyType: text(
      "property_type",
    ),

    /*
     * completed
     * completed_primary
     * off_plan
     * off_plan_primary
     */
    projectStatus: text(
      "project_status",
    ),

    /*
     * Property Finder represents values such as
     * "studio" and "none", therefore these are text.
     */
    bedrooms: text(
      "bedrooms",
    ),

    bathrooms: text(
      "bathrooms",
    ),

    size: numeric(
      "size",
      {
        precision: 14,
        scale: 2,
      },
    ),

    builtUpArea: numeric(
      "built_up_area",
      {
        precision: 14,
        scale: 2,
      },
    ),

    externalLocationId: text(
      "external_location_id",
    ),

    uaeEmirate: text(
      "uae_emirate",
    ),

    unitNumber: text(
      "unit_number",
    ),

    floorNumber: text(
      "floor_number",
    ),

    parkingSlots: integer(
      "parking_slots",
    ),

    developer: text(
      "developer",
    ),

    furnishingType: text(
      "furnishing_type",
    ),

    finishingType: text(
      "finishing_type",
    ),

    availableFrom: date(
      "available_from",
    ),

    /*
     * Normalized current advertised price.
     *
     * For rent this is associated with priceType:
     * yearly/monthly/weekly/daily.
     */
    priceAmount: numeric(
      "price_amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    priceType: text(
      "price_type",
    ),

    currency: text(
      "currency",
    ),

    /*
     * Provider listing lifecycle.
     */
    stateType: text(
      "state_type",
    ),

    stateStage: text(
      "state_stage",
    ),

    /*
     * AXOS convenience flag.
     *
     * For Property Finder this will be derived from the
     * live listing state / portal live state.
     */
    isLive: boolean(
      "is_live",
    )
      .notNull()
      .default(false),

    publishedAt: timestamp(
      "published_at",
      {
        withTimezone: true,
      },
    ),

    deactivatedAt: timestamp(
      "deactivated_at",
      {
        withTimezone: true,
      },
    ),

    verificationStatus: text(
      "verification_status",
    ),

    /*
     * UAE compliance identifiers.
     *
     * In Abu Dhabi these correspond to the ADREC permit /
     * broker-license fields exposed through the PF API.
     */
    advertisementNumber: text(
      "advertisement_number",
    ),

    issuingClientLicenseNumber:
      text(
        "issuing_client_license_number",
      ),

    /*
     * We don't need to normalize every media variation.
     *
     * One useful image is stored directly and the complete
     * external payload remains available in rawPayload.
     */
    primaryImageUrl: text(
      "primary_image_url",
    ),

    providerCreatedAt: timestamp(
      "provider_created_at",
      {
        withTimezone: true,
      },
    ),

    providerUpdatedAt: timestamp(
      "provider_updated_at",
      {
        withTimezone: true,
      },
    ),

    lastSyncedAt: timestamp(
      "last_synced_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    /*
     * Preserves fields we deliberately choose not to
     * normalize.
     *
     * This makes integrations resilient when Property Finder
     * adds fields without forcing an immediate DB migration.
     */
    rawPayload: jsonb(
      "raw_payload",
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
    providerIdUnique:
      uniqueIndex(
        "listings_provider_external_id_unique",
      ).on(
        table.organizationId,
        table.provider,
        table.externalId,
      ),

    referenceIdx: index(
      "listings_reference_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.reference,
    ),

    liveIdx: index(
      "listings_live_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.isLive,
    ),

    propertyIdx: index(
      "listings_property_idx",
    ).on(
      table.organizationId,
      table.propertyId,
    ),

    unitIdx: index(
      "listings_unit_idx",
    ).on(
      table.organizationId,
      table.unitId,
    ),

    assignedIdx: index(
      "listings_assigned_idx",
    ).on(
      table.organizationId,
      table.assignedToMembershipId,
    ),

    stateIdx: index(
      "listings_state_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.stateStage,
    ),

    locationIdx: index(
      "listings_location_idx",
    ).on(
      table.organizationId,
      table.externalLocationId,
    ),
  }),
);

/*
 * ============================================================
 * LEAD <-> LISTING
 * ============================================================
 *
 * A Lead can inquire about multiple listings.
 *
 * A Listing can receive inquiries from multiple Leads.
 */

export const leadListings = pgTable(
  "lead_listings",
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

    leadId: uuid(
      "lead_id",
    )
      .notNull()
      .references(
        () => leads.id,
        {
          onDelete: "cascade",
        },
      ),

    listingId: uuid(
      "listing_id",
    )
      .notNull()
      .references(
        () => listings.id,
        {
          onDelete: "cascade",
        },
      ),

    /*
     * inquiry / manual / workflow
     */
    linkSource: text(
      "link_source",
    )
      .notNull()
      .default("inquiry"),

    firstLinkedAt: timestamp(
      "first_linked_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    lastLinkedAt: timestamp(
      "last_linked_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    createdByMembershipId: uuid(
      "created_by_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),
  },
  (table) => ({
    leadListingUnique:
      uniqueIndex(
        "lead_listings_unique",
      ).on(
        table.organizationId,
        table.leadId,
        table.listingId,
      ),

    leadIdx: index(
      "lead_listings_lead_idx",
    ).on(
      table.organizationId,
      table.leadId,
    ),

    listingIdx: index(
      "lead_listings_listing_idx",
    ).on(
      table.organizationId,
      table.listingId,
    ),
  }),
);

/*
 * ============================================================
 * LEAD INQUIRIES
 * ============================================================
 *
 * Stores inbound portal/contact events.
 *
 * A Property Finder "lead" is treated as an inquiry event,
 * not automatically as a unique AXOS CRM Lead.
 *
 * This allows:
 *
 * Jane Doe -> WhatsApp -> Listing A
 * Jane Doe -> Call     -> Listing A
 * Jane Doe -> Email    -> Listing B
 *
 * to remain one AXOS Lead with three inquiry records.
 */

export const leadInquiries = pgTable(
  "lead_inquiries",
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

    leadId: uuid(
      "lead_id",
    )
      .notNull()
      .references(
        () => leads.id,
        {
          onDelete: "cascade",
        },
      ),

    listingId: uuid(
      "listing_id",
    ).references(
      () => listings.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * property_finder initially.
     *
     * Bayut can use the same table later.
     */
    provider: text(
      "provider",
    ).notNull(),

    /*
     * Property Finder lead.id, e.g. call_lead_1992.
     */
    externalInquiryId: text(
      "external_inquiry_id",
    ).notNull(),

    /*
     * listing / project / developer / agent / company
     */
    externalEntityType: text(
      "external_entity_type",
    ),

    /*
     * whatsapp / email / call
     */
    channel: text(
      "channel",
    ),

    /*
     * Property Finder communication state:
     *
     * sent / delivered / read / replied
     *
     * This is deliberately NOT the AXOS Lead status.
     */
    providerStatus: text(
      "provider_status",
    ),

    distributionType: text(
      "distribution_type",
    ),

    externalPublicProfileId: text(
      "external_public_profile_id",
    ),

    senderName: text(
      "sender_name",
    ),

    /*
     * Complete portal contact array.
     *
     * Property Finder may return phone, email or
     * whatsappUsername contact types.
     */
    senderContacts: jsonb(
      "sender_contacts",
    ),

    responseLink: text(
      "response_link",
    ),

    externalListingId: text(
      "external_listing_id",
    ),

    externalListingReference: text(
      "external_listing_reference",
    ),

    externalProjectId: text(
      "external_project_id",
    ),

    externalDeveloperId: text(
      "external_developer_id",
    ),

    callTalkTimeSeconds: integer(
      "call_talk_time_seconds",
    ),

    callWaitTimeSeconds: integer(
      "call_wait_time_seconds",
    ),

    callRecordingUrl: text(
      "call_recording_url",
    ),

    tags: jsonb(
      "tags",
    ),

    enrichment: jsonb(
      "enrichment",
    ),

    providerCreatedAt: timestamp(
      "provider_created_at",
      {
        withTimezone: true,
      },
    ),

    /*
     * Complete original portal payload.
     *
     * Essential for debugging and forward compatibility.
     */
    rawPayload: jsonb(
      "raw_payload",
    ),

    receivedAt: timestamp(
      "received_at",
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
    externalInquiryUnique:
      uniqueIndex(
        "lead_inquiries_external_unique",
      ).on(
        table.organizationId,
        table.provider,
        table.externalInquiryId,
      ),

    leadIdx: index(
      "lead_inquiries_lead_idx",
    ).on(
      table.organizationId,
      table.leadId,
    ),

    listingIdx: index(
      "lead_inquiries_listing_idx",
    ).on(
      table.organizationId,
      table.listingId,
    ),

    providerCreatedIdx: index(
      "lead_inquiries_provider_created_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.providerCreatedAt,
    ),

    channelIdx: index(
      "lead_inquiries_channel_idx",
    ).on(
      table.organizationId,
      table.provider,
      table.channel,
    ),
  }),
);

/*
 * ============================================================
 * LEAD CONTACT METHODS
 * ============================================================
 *
 * Searchable normalized contact identities for a Lead.
 *
 * The original lead.email / lead.phone fields remain as
 * convenient primary contact fields.
 *
 * This table supports:
 *
 * - multiple phone numbers
 * - multiple email addresses
 * - WhatsApp identities
 * - portal-based Lead deduplication
 */

export const leadContactMethods = pgTable(
  "lead_contact_methods",
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

    leadId: uuid(
      "lead_id",
    )
      .notNull()
      .references(
        () => leads.id,
        {
          onDelete: "cascade",
        },
      ),

    /*
     * email
     * phone
     * whatsapp
     * whatsapp_username
     * other
     */
    contactType: text(
      "contact_type",
    ).notNull(),

    /*
     * Original human/provider supplied value.
     */
    value: text(
      "value",
    ).notNull(),

    /*
     * Normalized searchable representation.
     *
     * Examples:
     *
     * email:
     * JOHN@EXAMPLE.COM
     * ->
     * john@example.com
     *
     * phone:
     * +971 50 123 4567
     * ->
     * +971501234567
     */
    normalizedValue: text(
      "normalized_value",
    ).notNull(),

    isPrimary: boolean(
      "is_primary",
    )
      .notNull()
      .default(false),

    /*
     * manual
     * property_finder
     * bayut
     */
    source: text(
      "source",
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
    leadContactUnique:
      uniqueIndex(
        "lead_contact_methods_lead_contact_unique",
      ).on(
        table.organizationId,
        table.leadId,
        table.contactType,
        table.normalizedValue,
      ),

    lookupIdx: index(
      "lead_contact_methods_lookup_idx",
    ).on(
      table.organizationId,
      table.contactType,
      table.normalizedValue,
    ),

    leadIdx: index(
      "lead_contact_methods_lead_idx",
    ).on(
      table.organizationId,
      table.leadId,
    ),
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

      /*
      * Optional structured organization-defined response.
      *
      * Example:
      *
      * call -> No Answer
      * viewing -> Offer Requested
      */
      responseDefinitionId: uuid(
        "response_definition_id",
      ).references(
        () =>
          timelineResponseDefinitions.id,
        {
          onDelete: "set null",
        },
      ),

      /*
      * Historical snapshots preserve the selected response
      * even if the organization later renames the definition.
      */
      responseKeySnapshot: text(
        "response_key_snapshot",
      ),

      responseLabelSnapshot: text(
        "response_label_snapshot",
      ),

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

      responseDefinitionIdx: index(
        "lead_timeline_response_definition_idx",
      ).on(
        table.organizationId,
        table.responseDefinitionId,
      ),
    }),
  );