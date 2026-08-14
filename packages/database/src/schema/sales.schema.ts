import {
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
 * AXOS treats a sale transaction as one commercial object.
 *
 * transactionType distinguishes:
 *
 *   secondary_market
 *   off_plan
 *
 * We intentionally do NOT create separate transaction tables
 * for secondary sales and off-plan sales.
 *
 * This keeps reporting, permissions, workflows and accounting
 * consistent.
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

/*
 * ============================================================
 * JURISDICTION
 * ============================================================
 *
 * The jurisdiction determines which document/workflow rules
 * may apply to a transaction.
 *
 * This is intentionally configurable through a finite enum
 * for Phase 1.
 */

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
 * SALE TRANSACTIONS
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
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    /*
     * Optional lead relationship.
     *
     * A transaction normally originates from a lead,
     * but the database does not force that dependency.
     */
    leadId: uuid("lead_id").references(
      () => leads.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * Broker/team member responsible for the transaction.
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
     * These remain references only.
     *
     * The transaction can also contain external property/unit
     * information when the asset does not exist in AXOS inventory.
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
     * Broker commission.
     *
     * This is the brokerage-side commercial information.
     * It does NOT represent developer/vendor accounting.
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
     * VAT is represented at transaction level so that later
     * invoice generation can use immutable transaction data.
     */

    vatApplicable: integer(
      "vat_applicable",
    )
      .notNull()
      .default(0),

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
     * SECONDARY MARKET
     * ----------------------------------------------------------
     *
     * Optional fields used when transactionType =
     * secondary_market.
     */

    sellerName: text("seller_name"),

    sellerContact: text(
      "seller_contact",
    ),

    buyerName: text("buyer_name"),

    buyerContact: text(
      "buyer_contact",
    ),

    /*
     * ----------------------------------------------------------
     * OFF-PLAN
     * ----------------------------------------------------------
     *
     * These are intentionally limited.
     *
     * AXOS does not track whether the buyer actually paid
     * each installment.
     */

    projectName: text("project_name"),

    developerProjectReference: text(
      "developer_project_reference",
    ),

    reservationAmount: numeric(
      "reservation_amount",
      {
        precision: 18,
        scale: 2,
      },
    ),

    installmentPlan: jsonb(
      "installment_plan",
    ),

    brochureReference: text(
      "brochure_reference",
    ),

    /*
     * ----------------------------------------------------------
     * DOCUMENT / WORKFLOW INFORMATION
     * ----------------------------------------------------------
     */

    spaRequired: integer(
      "spa_required",
    )
      .notNull()
      .default(0),

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
      "sale_transactions_number_unique",
    ).on(table.transactionNumber),

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