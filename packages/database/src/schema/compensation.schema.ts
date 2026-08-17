import {
  boolean,
  check,
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

import { sql } from "drizzle-orm";

/*
 * ============================================================
 * COMMISSION PLAN
 * ============================================================
 */

export const commissionPlanStatus = pgEnum(
  "commission_plan_status",
  [
    "draft",
    "active",
    "inactive",
    "archived",
  ],
);

export const commissionScope = pgEnum(
  "commission_scope",
  [
    "sales",
    "leasing",
    "combined",
  ],
);

export const commissionCalculationBasis = pgEnum(
  "commission_calculation_basis",
  [
    "invoiced_amount",
    "receipted_amount",
  ],
);

export const commissionCalculationMethod = pgEnum(
  "commission_calculation_method",
  [
    "highest_slab_entire_amount",
    "progressive_slabs",
  ],
);

export const commissionPayoutType = pgEnum(
  "commission_payout_type",
  [
    "percentage",
    "fixed_amount",
  ],
);

export const commissionPlans = pgTable(
  "commission_plans",
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

    name: text("name")
      .notNull(),

    description: text(
      "description",
    ),

    scope: commissionScope(
      "scope",
    ).notNull(),

    /*
     * IMPORTANT:
     *
     * The organization decides whether this plan
     * calculates against invoiced amount or
     * approved receipted amount.
     */
    calculationBasis:
      commissionCalculationBasis(
        "calculation_basis",
      ).notNull(),

    calculationMethod:
      commissionCalculationMethod(
        "calculation_method",
      ).notNull(),

    currency: text("currency")
      .notNull()
      .default("AED"),

    status: commissionPlanStatus(
      "status",
    )
      .notNull()
      .default("draft"),

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
    organizationNameUnique:
      uniqueIndex(
        "commission_plans_organization_name_unique",
      ).on(
        table.organizationId,
        table.name,
      ),

    organizationIdx: index(
      "commission_plans_organization_idx",
    ).on(table.organizationId),

    scopeIdx: index(
      "commission_plans_scope_idx",
    ).on(table.scope),

    statusIdx: index(
      "commission_plans_status_idx",
    ).on(table.status),
  }),
);

/*
 * ============================================================
 * COMMISSION PLAN SLABS
 * ============================================================
 *
 * Slabs are ordered using sequence.
 *
 * upperBound may be null for an open-ended final slab.
 */

export const commissionPlanSlabs = pgTable(
  "commission_plan_slabs",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    commissionPlanId: uuid(
      "commission_plan_id",
    )
      .notNull()
      .references(
        () => commissionPlans.id,
        {
          onDelete: "cascade",
        },
      ),

    sequence: integer(
      "sequence",
    ).notNull(),

    lowerBound: numeric(
      "lower_bound",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    upperBound: numeric(
      "upper_bound",
      {
        precision: 18,
        scale: 2,
      },
    ),

    payoutType:
      commissionPayoutType(
        "payout_type",
      ).notNull(),

    /*
     * Used when payout_type = percentage.
     *
     * Example:
     * 50.0000 means 50%.
     */
    payoutPercentage: numeric(
      "payout_percentage",
      {
        precision: 8,
        scale: 4,
      },
    ),

    /*
     * Used when payout_type = fixed_amount.
     */
    fixedPayoutAmount: numeric(
      "fixed_payout_amount",
      {
        precision: 18,
        scale: 2,
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
    planSequenceUnique:
        uniqueIndex(
        "commission_plan_slabs_plan_sequence_unique",
        ).on(
        table.commissionPlanId,
        table.sequence,
        ),

    planIdx: index(
        "commission_plan_slabs_plan_idx",
    ).on(table.commissionPlanId),

    /*
    * Slab thresholds cannot be negative.
    */
    lowerBoundNonNegative: check(
        "commission_slabs_lower_bound_non_negative",
        sql`${table.lowerBound} >= 0`,
    ),

    /*
    * upper_bound may be NULL for an open-ended final slab.
    *
    * Otherwise it must be greater than lower_bound.
    */
    upperBoundAfterLower: check(
        "commission_slabs_upper_after_lower",
        sql`
        ${table.upperBound} IS NULL
        OR ${table.upperBound} > ${table.lowerBound}
        `,
    ),

    /*
    * A percentage slab must contain a percentage and must
    * NOT contain a fixed payout.
    *
    * A fixed-amount slab must contain a fixed payout and
    * must NOT contain a percentage.
    */
    payoutConfigurationValid: check(
        "commission_slabs_payout_config_valid",
        sql`
        (
            ${table.payoutType} = 'percentage'
            AND ${table.payoutPercentage} IS NOT NULL
            AND ${table.payoutPercentage} >= 0
            AND ${table.fixedPayoutAmount} IS NULL
        )
        OR
        (
            ${table.payoutType} = 'fixed_amount'
            AND ${table.fixedPayoutAmount} IS NOT NULL
            AND ${table.fixedPayoutAmount} >= 0
            AND ${table.payoutPercentage} IS NULL
        )
        `,
    ),
  }),
);

/*
 * ============================================================
 * BROKER COMMISSION ASSIGNMENTS
 * ============================================================
 *
 * Assigns a commission plan to an AXOS membership/broker.
 *
 * Effective dates preserve historical compensation rules.
 */

export const brokerCommissionAssignmentStatus =
  pgEnum(
    "broker_commission_assignment_status",
    [
      "active",
      "inactive",
      "expired",
      "cancelled",
    ],
  );

export const brokerCommissionAssignments =
  pgTable(
    "broker_commission_assignments",
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

      commissionPlanId: uuid(
        "commission_plan_id",
      )
        .notNull()
        .references(
          () => commissionPlans.id,
          {
            onDelete: "restrict",
          },
        ),

      effectiveFrom: timestamp(
        "effective_from",
        {
          withTimezone: true,
        },
      ).notNull(),

      effectiveTo: timestamp(
        "effective_to",
        {
          withTimezone: true,
        },
      ),

      /*
       * Allows future resolution where multiple
       * assignments are intentionally permitted.
       *
       * Lower number = higher priority.
       */
      priority: integer(
        "priority",
      )
        .notNull()
        .default(100),

      status:
        brokerCommissionAssignmentStatus(
          "status",
        )
          .notNull()
          .default("active"),

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
      organizationIdx: index(
        "broker_commission_assignments_organization_idx",
      ).on(table.organizationId),

      membershipIdx: index(
        "broker_commission_assignments_membership_idx",
      ).on(table.membershipId),

      planIdx: index(
        "broker_commission_assignments_plan_idx",
      ).on(table.commissionPlanId),

      effectiveIdx: index(
        "broker_commission_assignments_effective_idx",
      ).on(
        table.membershipId,
        table.effectiveFrom,
        table.effectiveTo,
      ),
      effectiveDatesValid: check(
        "broker_commission_assignment_dates_valid",
        sql`
            ${table.effectiveTo} IS NULL
            OR ${table.effectiveTo} >= ${table.effectiveFrom}
        `,
        ),

     priorityPositive: check(
        "broker_commission_assignment_priority_positive",
        sql`${table.priority} > 0`,
        ),
    }),
  );

/*
 * ============================================================
 * BROKER SALARY TERMS
 * ============================================================
 */

export const salaryTermStatus = pgEnum(
  "salary_term_status",
  [
    "active",
    "inactive",
    "expired",
    "cancelled",
  ],
);

export const salaryFrequency = pgEnum(
  "salary_frequency",
  [
    "monthly",
  ],
);

export const brokerSalaryTerms = pgTable(
  "broker_salary_terms",
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

    monthlySalary: numeric(
      "monthly_salary",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

    currency: text("currency")
      .notNull()
      .default("AED"),

    frequency: salaryFrequency(
      "frequency",
    )
      .notNull()
      .default("monthly"),

    /*
     * Organization-configurable.
     *
     * Current operational default = 1.
     */
    paymentDay: integer(
      "payment_day",
    )
      .notNull()
      .default(1),

    effectiveFrom: timestamp(
      "effective_from",
      {
        withTimezone: true,
      },
    ).notNull(),

    effectiveTo: timestamp(
      "effective_to",
      {
        withTimezone: true,
      },
    ),

    status: salaryTermStatus(
      "status",
    )
      .notNull()
      .default("active"),

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
    organizationIdx: index(
      "broker_salary_terms_organization_idx",
    ).on(table.organizationId),

    membershipIdx: index(
      "broker_salary_terms_membership_idx",
    ).on(table.membershipId),

    effectiveIdx: index(
      "broker_salary_terms_effective_idx",
    ).on(
      table.membershipId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    monthlySalaryNonNegative: check(
    "broker_salary_monthly_non_negative",
    sql`${table.monthlySalary} >= 0`,
    ),

    paymentDayValid: check(
    "broker_salary_payment_day_valid",
    sql`
        ${table.paymentDay} >= 1
        AND ${table.paymentDay} <= 31
    `,
    ),

    effectiveDatesValid: check(
    "broker_salary_effective_dates_valid",
    sql`
        ${table.effectiveTo} IS NULL
        OR ${table.effectiveTo} >= ${table.effectiveFrom}
    `,
    ),
  }),
);

/*
 * ============================================================
 * COMMISSION PERIOD
 * ============================================================
 */

export const commissionPeriodStatus = pgEnum(
  "commission_period_status",
  [
    "open",
    "calculating",
    "calculated",
    "under_review",
    "approved",
    "exported",
    "closed",
    "cancelled",
  ],
);

export const commissionPeriods = pgTable(
  "commission_periods",
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

    name: text("name")
      .notNull(),

    periodStart: timestamp(
      "period_start",
      {
        withTimezone: true,
      },
    )
      .notNull(),

    periodEnd: timestamp(
      "period_end",
      {
        withTimezone: true,
      },
    )
      .notNull(),

    status: commissionPeriodStatus(
      "status",
    )
      .notNull()
      .default("open"),

    calculatedAt: timestamp(
      "calculated_at",
      {
        withTimezone: true,
      },
    ),

    approvedAt: timestamp(
      "approved_at",
      {
        withTimezone: true,
      },
    ),

    exportedAt: timestamp(
      "exported_at",
      {
        withTimezone: true,
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
    organizationPeriodUnique:
      uniqueIndex(
        "commission_periods_organization_period_unique",
      ).on(
        table.organizationId,
        table.periodStart,
        table.periodEnd,
      ),

    organizationIdx: index(
      "commission_periods_organization_idx",
    ).on(table.organizationId),

    statusIdx: index(
      "commission_periods_status_idx",
    ).on(table.status),
    dateRangeValid: check(
    "commission_periods_date_range_valid",
    sql`${table.periodEnd} > ${table.periodStart}`,
),
  }),
);

/*
 * ============================================================
 * COMMISSION EARNINGS
 * ============================================================
 *
 * This is a normalized, auditable snapshot of a
 * qualifying transaction/financial source.
 *
 * sourceType/sourceId are intentionally generic so leasing
 * can reuse this same engine later.
 */

export const commissionEarningStatus = pgEnum(
  "commission_earning_status",
  [
    "pending",
    "eligible",
    "approved",
    "excluded",
    "cancelled",
  ],
);

export const commissionEarningScope = pgEnum(
  "commission_earning_scope",
  [
    "sales",
    "leasing",
  ],
);

export const commissionEarnings = pgTable(
  "commission_earnings",
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

    commissionPeriodId: uuid(
      "commission_period_id",
    )
      .notNull()
      .references(
        () => commissionPeriods.id,
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
          onDelete: "restrict",
        },
      ),

    scope: commissionEarningScope(
      "scope",
    ).notNull(),

    /*
     * Examples:
     *
     * invoice
     * receipt
     * sale_commission
     * future_lease_commission
     */
    sourceType: text(
      "source_type",
    ).notNull(),

    sourceId: uuid(
      "source_id",
    ).notNull(),

    calculationBasis:
      commissionCalculationBasis(
        "calculation_basis",
      ).notNull(),

    qualifyingAmount: numeric(
      "qualifying_amount",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

    currency: text("currency")
      .notNull()
      .default("AED"),

    commissionPlanId: uuid(
      "commission_plan_id",
    )
      .notNull()
      .references(
        () => commissionPlans.id,
        {
          onDelete: "restrict",
        },
      ),

    /*
     * Snapshot of relevant plan/slabs/calculation input.
     *
     * This prevents a later plan change from rewriting
     * historical approved calculations.
     */
    calculationSnapshot: jsonb(
      "calculation_snapshot",
    )
      .notNull(),

    calculatedCommission: numeric(
      "calculated_commission",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

    status: commissionEarningStatus(
      "status",
    )
      .notNull()
      .default("pending"),

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
    sourceUnique: uniqueIndex(
      "commission_earnings_period_member_source_unique",
    ).on(
      table.commissionPeriodId,
      table.membershipId,
      table.sourceType,
      table.sourceId,
    ),

    organizationIdx: index(
      "commission_earnings_organization_idx",
    ).on(table.organizationId),

    periodIdx: index(
      "commission_earnings_period_idx",
    ).on(table.commissionPeriodId),

    membershipIdx: index(
      "commission_earnings_membership_idx",
    ).on(table.membershipId),

    statusIdx: index(
      "commission_earnings_status_idx",
    ).on(table.status),
    qualifyingAmountNonNegative: check(
        "commission_earnings_qualifying_non_negative",
    sql`${table.qualifyingAmount} >= 0`,
    ),

    calculatedCommissionNonNegative: check(
        "commission_earnings_commission_non_negative",
    sql`${table.calculatedCommission} >= 0`,
    ),
  }),
);

/*
 * ============================================================
 * BROKER PAYOUT STATEMENT
 * ============================================================
 */

export const brokerPayoutStatus = pgEnum(
  "broker_payout_status",
  [
    "draft",
    "calculated",
    "under_review",
    "approved",
    "exported",
    "paid",
    "cancelled",
  ],
);

export const brokerPayoutStatements =
  pgTable(
    "broker_payout_statements",
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

      commissionPeriodId: uuid(
        "commission_period_id",
      )
        .notNull()
        .references(
          () => commissionPeriods.id,
          {
            onDelete: "restrict",
          },
        ),

      membershipId: uuid(
        "membership_id",
      )
        .notNull()
        .references(
          () => memberships.id,
          {
            onDelete: "restrict",
          },
        ),

      statementNumber: text(
        "statement_number",
      ).notNull(),

      currency: text(
        "currency",
      )
        .notNull()
        .default("AED"),

      baseSalaryAmount: numeric(
        "base_salary_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      salesCommissionAmount: numeric(
        "sales_commission_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      leasingCommissionAmount: numeric(
        "leasing_commission_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      combinedCommissionAmount: numeric(
        "combined_commission_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      adjustmentsAmount: numeric(
        "adjustments_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      grossCompensationAmount: numeric(
        "gross_compensation_amount",
        {
          precision: 18,
          scale: 2,
        },
      )
        .notNull(),

      status: brokerPayoutStatus(
        "status",
      )
        .notNull()
        .default("draft"),

      calculationSnapshot: jsonb(
        "calculation_snapshot",
      )
        .notNull(),

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

      paidAt: timestamp(
        "paid_at",
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
      statementNumberUnique:
        uniqueIndex(
          "broker_payout_statements_organization_number_unique",
        ).on(
          table.organizationId,
          table.statementNumber,
        ),

      periodBrokerUnique:
        uniqueIndex(
          "broker_payout_statements_period_broker_unique",
        ).on(
          table.commissionPeriodId,
          table.membershipId,
        ),

      organizationIdx: index(
        "broker_payout_statements_organization_idx",
      ).on(table.organizationId),

      periodIdx: index(
        "broker_payout_statements_period_idx",
      ).on(table.commissionPeriodId),

      membershipIdx: index(
        "broker_payout_statements_membership_idx",
      ).on(table.membershipId),

      statusIdx: index(
        "broker_payout_statements_status_idx",
      ).on(table.status),
      baseSalaryNonNegative: check(
        "broker_payout_base_salary_non_negative",
        sql`${table.baseSalaryAmount} >= 0`,
        ),

        salesCommissionNonNegative: check(
        "broker_payout_sales_commission_non_negative",
        sql`${table.salesCommissionAmount} >= 0`,
        ),

        leasingCommissionNonNegative: check(
        "broker_payout_leasing_commission_non_negative",
        sql`${table.leasingCommissionAmount} >= 0`,
        ),

        combinedCommissionNonNegative: check(
        "broker_payout_combined_commission_non_negative",
        sql`${table.combinedCommissionAmount} >= 0`,
        ),

        grossCompensationNonNegative: check(
        "broker_payout_gross_non_negative",
        sql`${table.grossCompensationAmount} >= 0`,
        ),
    }),
  );

/*
 * ============================================================
 * PAYOUT ITEMS
 * ============================================================
 */

export const brokerPayoutItemType = pgEnum(
  "broker_payout_item_type",
  [
    "base_salary",
    "sales_commission",
    "leasing_commission",
    "combined_commission",
    "adjustment",
    "other",
  ],
);

export const brokerPayoutItems = pgTable(
  "broker_payout_items",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    brokerPayoutStatementId: uuid(
      "broker_payout_statement_id",
    )
      .notNull()
      .references(
        () => brokerPayoutStatements.id,
        {
          onDelete: "cascade",
        },
      ),

    itemType: brokerPayoutItemType(
      "item_type",
    ).notNull(),

    description: text(
      "description",
    ),

    amount: numeric(
      "amount",
      {
        precision: 18,
        scale: 2,
      },
    )
      .notNull(),

    sourceType: text(
      "source_type",
    ),

    sourceId: uuid(
      "source_id",
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
  },
  (table) => ({
    statementIdx: index(
      "broker_payout_items_statement_idx",
    ).on(table.brokerPayoutStatementId),

    typeIdx: index(
      "broker_payout_items_type_idx",
    ).on(table.itemType),

    amountValid: check(
    "broker_payout_items_amount_valid",
    sql`
        ${table.itemType} = 'adjustment'
        OR ${table.amount} >= 0
    `,
),
  }),
);