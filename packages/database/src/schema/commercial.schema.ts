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
} from "./domain.schema.js";

import {
  saleTransactions,
} from "./sales.schema.js";

/*
 * ============================================================
 * INVOICE
 * ============================================================
 *
 * Phase 1 commercial invoice.
 *
 * This is NOT a general ledger.
 *
 * It records the commercial invoice required for the
 * brokerage transaction workflow.
 */

export const invoiceStatus = pgEnum(
  "invoice_status",
  [
    "draft",
    "approved",
    "cancelled",
  ],
);

export const invoices = pgTable(
  "invoices",
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
     * Sale transaction is required for Phase 1
     * sales/off-plan invoicing.
     */
    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "restrict",
        },
      ),

    /*
     * Lead remains the primary commercial object.
     *
     * This is retained for reporting and traceability.
     */
    leadId: uuid(
      "lead_id",
    ).references(
      () => leads.id,
      {
        onDelete: "set null",
      },
    ),

    invoiceNumber: text(
      "invoice_number",
    ).notNull(),

    status: invoiceStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    issueDate: timestamp(
      "issue_date",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    dueDate: timestamp(
      "due_date",
      {
        withTimezone: true,
      },
    ),

    /*
     * Commercial values.
     */
    subtotal: numeric(
      "subtotal",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

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

    totalAmount: numeric(
      "total_amount",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

    currency: text(
      "currency",
    )
      .notNull()
      .default("AED"),

    /*
     * Tax information required for document generation.
     */
    taxRegistrationNumber: text(
      "tax_registration_number",
    ),

    notes: text(
      "notes",
    ),

    /*
     * Reference to the template used when rendered.
     *
     * We do NOT store the generated PDF here.
     */
    templateId: uuid(
      "template_id",
    ),

    templateVersion: integer(
      "template_version",
    ),

    metadata: jsonb(
      "metadata",
    ),

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

    approvedByMembershipId: uuid(
      "approved_by_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    approvedAt: timestamp(
      "approved_at",
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
    organizationNumberUnique:
      uniqueIndex(
        "invoices_organization_number_unique",
      ).on(
        table.organizationId,
        table.invoiceNumber,
      ),

    organizationIdx: index(
      "invoices_organization_idx",
    ).on(table.organizationId),

    transactionIdx: index(
      "invoices_transaction_idx",
    ).on(table.saleTransactionId),

    leadIdx: index(
      "invoices_lead_idx",
    ).on(table.leadId),

    statusIdx: index(
      "invoices_status_idx",
    ).on(table.status),

    issueDateIdx: index(
      "invoices_issue_date_idx",
    ).on(table.issueDate),
  }),
);

/*
 * ============================================================
 * RECEIPT
 * ============================================================
 *
 * A receipt represents the brokerage's commercial receipt.
 *
 * IMPORTANT:
 *
 * This does NOT represent confirmation that a buyer paid
 * a developer installment.
 *
 * It represents the receipt associated with the AXOS
 * brokerage transaction/invoice.
 */

export const receiptStatus = pgEnum(
  "receipt_status",
  [
    "draft",
    "approved",
    "cancelled",
  ],
);

export const receipts = pgTable(
  "receipts",
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

    saleTransactionId: uuid(
      "sale_transaction_id",
    )
      .notNull()
      .references(
        () => saleTransactions.id,
        {
          onDelete: "restrict",
        },
      ),

    leadId: uuid(
      "lead_id",
    ).references(
      () => leads.id,
      {
        onDelete: "set null",
      },
    ),

    invoiceId: uuid(
      "invoice_id",
    )
      .notNull()
      .references(
        () => invoices.id,
        {
          onDelete: "restrict",
        },
      ),

    receiptNumber: text(
      "receipt_number",
    ).notNull(),

    status: receiptStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    receiptDate: timestamp(
      "receipt_date",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),

    receivedAmount: numeric(
      "received_amount",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

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

    currency: text(
      "currency",
    )
      .notNull()
      .default("AED"),

    notes: text(
      "notes",
    ),

    /*
     * Template reference only.
     *
     * Generated documents remain reproducible.
     */
    templateId: uuid(
      "template_id",
    ),

    templateVersion: integer(
      "template_version",
    ),

    metadata: jsonb(
      "metadata",
    ),

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

    approvedByMembershipId: uuid(
      "approved_by_membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    approvedAt: timestamp(
      "approved_at",
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
    organizationNumberUnique:
      uniqueIndex(
        "receipts_organization_number_unique",
      ).on(
        table.organizationId,
        table.receiptNumber,
      ),

    organizationIdx: index(
      "receipts_organization_idx",
    ).on(table.organizationId),

    transactionIdx: index(
      "receipts_transaction_idx",
    ).on(table.saleTransactionId),

    invoiceIdx: index(
      "receipts_invoice_idx",
    ).on(table.invoiceId),

    leadIdx: index(
      "receipts_lead_idx",
    ).on(table.leadId),

    statusIdx: index(
      "receipts_status_idx",
    ).on(table.status),

    receiptDateIdx: index(
      "receipts_date_idx",
    ).on(table.receiptDate),
  }),
);

/*
 * ============================================================
 * SALE COMMISSION
 * ============================================================
 *
 * Broker-side commission lifecycle.
 *
 * Commission cannot become payable until the qualifying
 * receipt has been created/approved through the workflow.
 */

export const saleCommissionStatus = pgEnum(
  "sale_commission_status",
  [
    "draft",
    "approved",
    "payable",
    "processed",
    "cancelled",
  ],
);

export const saleCommissions = pgTable(
  "sale_commissions",
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

    /*
     * Broker/team member receiving the commission.
     */
    membershipId: uuid(
      "membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    /*
     * The receipt that qualifies this commission
     * for processing.
     *
     * This is intentionally nullable while the commission
     * is still being prepared.
     */
    receiptId: uuid(
      "receipt_id",
    ).references(
      () => receipts.id,
      {
        onDelete: "set null",
      },
    ),

    description: text(
      "description",
    ),

    commissionType: text(
      "commission_type",
    ),

    rate: numeric(
      "rate",
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

    currency: text(
      "currency",
    )
      .notNull()
      .default("AED"),

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

    status: saleCommissionStatus(
      "status",
    )
      .notNull()
      .default("draft"),

    payableAt: timestamp(
      "payable_at",
      {
        withTimezone: true,
      },
    ),

    processedAt: timestamp(
      "processed_at",
      {
        withTimezone: true,
      },
    ),

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
    transactionIdx: index(
      "sale_commissions_transaction_idx",
    ).on(table.saleTransactionId),

    membershipIdx: index(
      "sale_commissions_membership_idx",
    ).on(table.membershipId),

    receiptIdx: index(
      "sale_commissions_receipt_idx",
    ).on(table.receiptId),

    statusIdx: index(
      "sale_commissions_status_idx",
    ).on(table.status),
  }),
);