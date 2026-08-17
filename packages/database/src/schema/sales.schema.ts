import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
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

import {
  leads,
  properties,
  units,
} from "./domain.schema.js";

/*
 * ============================================================
 * SALE TRANSACTIONS
 * ============================================================
 *
 * One commercial transaction model supports:
 *
 *   secondary_market
 *   off_plan
 *
 * We intentionally do NOT create separate transaction tables.
 */

export const saleTransactionType = pgEnum(
  "sale_transaction_type",
  [
    "secondary_market",
    "off_plan",
  ],
);

export const saleTransactionStatus = pgEnum(
  "sale_transaction_status",
  [
    "draft",
    "active",
    "offer",
    "reservation",
    "spa",
    "completed",
    "cancelled",
    "lost",
  ],
);

export const saleJurisdiction = pgEnum(
  "sale_jurisdiction",
  [
    "adrec",
    "adgm",
    "masdar",
    "other",
  ],
);

/*
 * ============================================================
 * SALE TRANSACTION PARTY
 * ============================================================
 *
 * A transaction can have multiple buyers and sellers.
 *
 * Examples:
 *
 *   buyer
 *   co_buyer
 *   seller
 *   co_seller
 *   representative
 *   other
 */

export const salePartyType = pgEnum(
  "sale_party_type",
  [
    "buyer",
    "co_buyer",
    "seller",
    "co_seller",
    "representative",
    "other",
  ],
);

export const saleTransactionParties = pgTable(
  "sale_transaction_parties",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "cascade",
        },
      ),

    partyType: salePartyType(
      "party_type",
    ).notNull(),

    name: text("name").notNull(),

    companyName: text(
      "company_name",
    ),

    email: text("email"),

    phone: text("phone"),

    role: text("role"),

    metadata: jsonb("metadata"),

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
    transactionIdx: index(
      "sale_transaction_parties_transaction_idx",
    ).on(table.saleTransactionId),

    partyTypeIdx: index(
      "sale_transaction_parties_type_idx",
    ).on(table.partyType),
  }),
);

/*
 * ============================================================
 * SALE TRANSACTION
 * ============================================================
 */

export const saleTransactions = pgTable(
  "sale_transactions",
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
     * A sale can originate from a lead,
     * but the relationship is intentionally optional.
     */
    leadId: uuid("lead_id").references(
      () => leads.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * AXOS broker/team member responsible.
     */
    assignedToMembershipId: uuid(
      "assigned_to_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    transactionNumber: text(
      "transaction_number",
    ).notNull(),

    transactionType: saleTransactionType(
      "transaction_type",
    ).notNull(),

    status: saleTransactionStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    jurisdiction: saleJurisdiction(
      "jurisdiction",
    ),

    /*
     * ----------------------------------------------------------
     * PROPERTY / UNIT REFERENCE
     * ----------------------------------------------------------
     *
     * These are reference relationships only.
     *
     * External references are supported because a broker may
     * create a lead/transaction for an asset not yet present
     * in AXOS inventory.
     */

    propertyId: uuid("property_id").references(
      () => properties.id,
      {
        onDelete: "set null",
      },
    ),

    unitId: uuid("unit_id").references(
      () => units.id,
      {
        onDelete: "set null",
      },
    ),

    externalPropertyName: text(
      "external_property_name",
    ),

    externalUnitNumber: text(
      "external_unit_number",
    ),

    externalDeveloperName: text(
      "external_developer_name",
    ),

    /*
     * ----------------------------------------------------------
     * COMMERCIAL DETAILS
     * ----------------------------------------------------------
     */

    salePrice: numeric(
      "sale_price",
      {
        precision: 18,
        scale: 2,
      },
    ),

    currency: text("currency")
      .notNull()
      .default("AED"),

    /*
     * Broker commission summary.
     *
     * Detailed commission records are stored separately below.
     */

    commissionType: text(
      "commission_type",
    ),

    commissionRate: numeric(
      "commission_rate",
      {
        precision: 8,
        scale: 4,
      },
    ),

    commissionAmount: numeric(
      "commission_amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    /*
     * ----------------------------------------------------------
     * VAT
     * ----------------------------------------------------------
     *
     * VAT is stored at transaction level so invoice generation
     * can reconstruct the commercial transaction.
     */

    vatApplicable: boolean(
      "vat_applicable",
    )
      .notNull()
      .default(false),

    vatRate: numeric(
      "vat_rate",
      {
        precision: 8,
        scale: 4,
      },
    ),

    vatAmount: numeric(
      "vat_amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    /*
     * ----------------------------------------------------------
     * OFF-PLAN
     * ----------------------------------------------------------
     *
     * Phase 1 intentionally keeps this limited to information
     * relevant to the broker.
     *
     * AXOS does NOT track buyer installment payments.
     */

    projectName: text("project_name"),

    developerProjectReference: text(
      "developer_project_reference",
    ),

    brochureReference: text(
      "brochure_reference",
    ),

    /*
     * ----------------------------------------------------------
     * DOCUMENT / WORKFLOW
     * ----------------------------------------------------------
     */

    spaRequired: boolean(
      "spa_required",
    )
      .notNull()
      .default(false),

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

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    completedAt: timestamp(
      "completed_at",
      {
        withTimezone: true,
      },
    ),

    cancelledAt: timestamp(
      "cancelled_at",
      {
        withTimezone: true,
      },
    ),
  },
  (table) => ({
    transactionNumberUnique: uniqueIndex(
      "sale_transactions_organization_number_unique",
    ).on(
      table.organizationId,
      table.transactionNumber,
    ),

    organizationIdx: index(
      "sale_transactions_organization_idx",
    ).on(table.organizationId),

    leadIdx: index(
      "sale_transactions_lead_idx",
    ).on(table.leadId),

    assignedToIdx: index(
      "sale_transactions_assigned_to_idx",
    ).on(
      table.assignedToMembershipId,
    ),

    statusIdx: index(
      "sale_transactions_status_idx",
    ).on(table.status),

    typeIdx: index(
      "sale_transactions_type_idx",
    ).on(table.transactionType),

    jurisdictionIdx: index(
      "sale_transactions_jurisdiction_idx",
    ).on(table.jurisdiction),

    propertyIdx: index(
      "sale_transactions_property_idx",
    ).on(table.propertyId),

    unitIdx: index(
      "sale_transactions_unit_idx",
    ).on(table.unitId),

    createdAtIdx: index(
      "sale_transactions_created_at_idx",
    ).on(table.createdAt),
  }),
);

/*
 * ============================================================
 * SALE OFFERS
 * ============================================================
 *
 * An offer is a commercial event belonging to a sale
 * transaction.
 */

export const saleOfferStatus = pgEnum(
  "sale_offer_status",
  [
    "draft",
    "submitted",
    "accepted",
    "rejected",
    "withdrawn",
    "expired",
  ],
);

export const saleOffers = pgTable(
  "sale_offers",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "cascade",
        },
      ),

    offerNumber: text(
      "offer_number",
    ).notNull(),

    offerAmount: numeric(
      "offer_amount",
      {
        precision: 18,
        scale: 2,
      },
    ).notNull(),

    currency: text("currency")
      .notNull()
      .default("AED"),

    validUntil: timestamp(
      "valid_until",
      {
        withTimezone: true,
      },
    ),

    status: saleOfferStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    terms: text("terms"),

    metadata: jsonb("metadata"),

    createdByMembershipId: uuid(
      "created_by_membership_id",
    )
      .notNull()
      .references(
        () => memberships.id,
        {
          onDelete: "restrict",
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
    offerNumberUnique: uniqueIndex(
      "sale_offers_organization_number_unique",
    ).on(
      table.saleTransactionId,
      table.offerNumber,
    ),

    transactionIdx: index(
      "sale_offers_transaction_idx",
    ).on(table.saleTransactionId),

    statusIdx: index(
      "sale_offers_status_idx",
    ).on(table.status),
  }),
);

/*
 * ============================================================
 * SALE RESERVATIONS
 * ============================================================
 *
 * Used primarily for off-plan transactions.
 *
 * This records the commercial reservation information.
 * It does NOT track whether payment was actually received.
 */

export const saleReservationStatus = pgEnum(
  "sale_reservation_status",
  [
    "draft",
    "issued",
    "accepted",
    "cancelled",
    "expired",
  ],
);

export const saleReservations = pgTable(
  "sale_reservations",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "cascade",
        },
      ),

    reservationNumber: text(
      "reservation_number",
    ).notNull(),

    reservationAmount: numeric(
      "reservation_amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    currency: text("currency")
      .notNull()
      .default("AED"),

    reservationDate: timestamp(
      "reservation_date",
      {
        withTimezone: true,
      },
    ),

    status: saleReservationStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    notes: text("notes"),

    metadata: jsonb("metadata"),

    createdByMembershipId: uuid(
      "created_by_membership_id",
    )
      .notNull()
      .references(
        () => memberships.id,
        {
          onDelete: "restrict",
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
    reservationNumberUnique: uniqueIndex(
      "sale_reservations_transaction_number_unique",
    ).on(
      table.saleTransactionId,
      table.reservationNumber,
    ),

    transactionIdx: index(
      "sale_reservations_transaction_idx",
    ).on(table.saleTransactionId),

    statusIdx: index(
      "sale_reservations_status_idx",
    ).on(table.status),
  }),
);

/*
 * ============================================================
 * SALE INSTALLMENTS
 * ============================================================
 *
 * Commercial installment schedule only.
 *
 * IMPORTANT:
 *
 * This table does NOT contain:
 *
 *   payment_received
 *   payment_received_at
 *   payment_status
 *   bank_reference
 *
 * Those belong to future accounting/payment functionality.
 */

export const saleInstallments = pgTable(
  "sale_installments",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "cascade",
        },
      ),

    sequence: integer(
      "sequence",
    ).notNull(),

    description: text(
      "description",
    ).notNull(),

    milestone: text("milestone"),

    percentage: numeric(
      "percentage",
      {
        precision: 8,
        scale: 4,
      },
    ),

    amount: numeric(
      "amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    currency: text("currency")
      .notNull()
      .default("AED"),

    dueDate: timestamp(
      "due_date",
      {
        withTimezone: true,
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
    transactionSequenceUnique: uniqueIndex(
      "sale_installments_transaction_sequence_unique",
    ).on(
      table.saleTransactionId,
      table.sequence,
    ),

    transactionIdx: index(
      "sale_installments_transaction_idx",
    ).on(table.saleTransactionId),

    dueDateIdx: index(
      "sale_installments_due_date_idx",
    ).on(table.dueDate),
  }),
);
