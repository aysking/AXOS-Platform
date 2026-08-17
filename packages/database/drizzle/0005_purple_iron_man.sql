CREATE TYPE "public"."broker_commission_assignment_status" AS ENUM('active', 'inactive', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."broker_payout_item_type" AS ENUM('base_salary', 'sales_commission', 'leasing_commission', 'combined_commission', 'adjustment', 'other');--> statement-breakpoint
CREATE TYPE "public"."broker_payout_status" AS ENUM('draft', 'calculated', 'under_review', 'approved', 'exported', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commission_calculation_basis" AS ENUM('invoiced_amount', 'receipted_amount');--> statement-breakpoint
CREATE TYPE "public"."commission_calculation_method" AS ENUM('highest_slab_entire_amount', 'progressive_slabs');--> statement-breakpoint
CREATE TYPE "public"."commission_earning_scope" AS ENUM('sales', 'leasing');--> statement-breakpoint
CREATE TYPE "public"."commission_earning_status" AS ENUM('pending', 'eligible', 'approved', 'excluded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commission_payout_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."commission_period_status" AS ENUM('open', 'calculating', 'calculated', 'under_review', 'approved', 'exported', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commission_plan_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commission_scope" AS ENUM('sales', 'leasing', 'combined');--> statement-breakpoint
CREATE TYPE "public"."salary_frequency" AS ENUM('monthly');--> statement-breakpoint
CREATE TYPE "public"."salary_term_status" AS ENUM('active', 'inactive', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "broker_commission_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"commission_plan_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"priority" integer DEFAULT 100 NOT NULL,
	"status" "broker_commission_assignment_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_payout_statement_id" uuid NOT NULL,
	"item_type" "broker_payout_item_type" NOT NULL,
	"description" text,
	"amount" numeric(18, 2) NOT NULL,
	"source_type" text,
	"source_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_payout_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"commission_period_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"statement_number" text NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"base_salary_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"sales_commission_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"leasing_commission_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"combined_commission_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"adjustments_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"gross_compensation_amount" numeric(18, 2) NOT NULL,
	"status" "broker_payout_status" DEFAULT 'draft' NOT NULL,
	"calculation_snapshot" jsonb NOT NULL,
	"approved_by_membership_id" uuid,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_salary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"monthly_salary" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"frequency" "salary_frequency" DEFAULT 'monthly' NOT NULL,
	"payment_day" integer DEFAULT 1 NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"status" "salary_term_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"commission_period_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"scope" "commission_earning_scope" NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"calculation_basis" "commission_calculation_basis" NOT NULL,
	"qualifying_amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"commission_plan_id" uuid NOT NULL,
	"calculation_snapshot" jsonb NOT NULL,
	"calculated_commission" numeric(18, 2) NOT NULL,
	"status" "commission_earning_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "commission_period_status" DEFAULT 'open' NOT NULL,
	"calculated_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"exported_at" timestamp with time zone,
	"approved_by_membership_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_plan_slabs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_plan_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"lower_bound" numeric(18, 2) DEFAULT '0' NOT NULL,
	"upper_bound" numeric(18, 2),
	"payout_type" "commission_payout_type" NOT NULL,
	"payout_percentage" numeric(8, 4),
	"fixed_payout_amount" numeric(18, 2),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "commission_scope" NOT NULL,
	"calculation_basis" "commission_calculation_basis" NOT NULL,
	"calculation_method" "commission_calculation_method" NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"status" "commission_plan_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignments_commission_plan_id_commission_plans_id_fk" FOREIGN KEY ("commission_plan_id") REFERENCES "public"."commission_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignments_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_payout_items" ADD CONSTRAINT "broker_payout_items_broker_payout_statement_id_broker_payout_statements_id_fk" FOREIGN KEY ("broker_payout_statement_id") REFERENCES "public"."broker_payout_statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_statements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_statements_commission_period_id_commission_periods_id_fk" FOREIGN KEY ("commission_period_id") REFERENCES "public"."commission_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_statements_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_statements_approved_by_membership_id_memberships_id_fk" FOREIGN KEY ("approved_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_terms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_terms_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_terms_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_commission_period_id_commission_periods_id_fk" FOREIGN KEY ("commission_period_id") REFERENCES "public"."commission_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_commission_plan_id_commission_plans_id_fk" FOREIGN KEY ("commission_plan_id") REFERENCES "public"."commission_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_periods" ADD CONSTRAINT "commission_periods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_periods" ADD CONSTRAINT "commission_periods_approved_by_membership_id_memberships_id_fk" FOREIGN KEY ("approved_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_plan_slabs" ADD CONSTRAINT "commission_plan_slabs_commission_plan_id_commission_plans_id_fk" FOREIGN KEY ("commission_plan_id") REFERENCES "public"."commission_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_plans" ADD CONSTRAINT "commission_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_plans" ADD CONSTRAINT "commission_plans_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broker_commission_assignments_organization_idx" ON "broker_commission_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "broker_commission_assignments_membership_idx" ON "broker_commission_assignments" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "broker_commission_assignments_plan_idx" ON "broker_commission_assignments" USING btree ("commission_plan_id");--> statement-breakpoint
CREATE INDEX "broker_commission_assignments_effective_idx" ON "broker_commission_assignments" USING btree ("membership_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "broker_payout_items_statement_idx" ON "broker_payout_items" USING btree ("broker_payout_statement_id");--> statement-breakpoint
CREATE INDEX "broker_payout_items_type_idx" ON "broker_payout_items" USING btree ("item_type");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_payout_statements_organization_number_unique" ON "broker_payout_statements" USING btree ("organization_id","statement_number");--> statement-breakpoint
CREATE UNIQUE INDEX "broker_payout_statements_period_broker_unique" ON "broker_payout_statements" USING btree ("commission_period_id","membership_id");--> statement-breakpoint
CREATE INDEX "broker_payout_statements_organization_idx" ON "broker_payout_statements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "broker_payout_statements_period_idx" ON "broker_payout_statements" USING btree ("commission_period_id");--> statement-breakpoint
CREATE INDEX "broker_payout_statements_membership_idx" ON "broker_payout_statements" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "broker_payout_statements_status_idx" ON "broker_payout_statements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "broker_salary_terms_organization_idx" ON "broker_salary_terms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "broker_salary_terms_membership_idx" ON "broker_salary_terms" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "broker_salary_terms_effective_idx" ON "broker_salary_terms" USING btree ("membership_id","effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_earnings_period_member_source_unique" ON "commission_earnings" USING btree ("commission_period_id","membership_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_organization_idx" ON "commission_earnings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_period_idx" ON "commission_earnings" USING btree ("commission_period_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_membership_idx" ON "commission_earnings" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_status_idx" ON "commission_earnings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_periods_organization_period_unique" ON "commission_periods" USING btree ("organization_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "commission_periods_organization_idx" ON "commission_periods" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_periods_status_idx" ON "commission_periods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_plan_slabs_plan_sequence_unique" ON "commission_plan_slabs" USING btree ("commission_plan_id","sequence");--> statement-breakpoint
CREATE INDEX "commission_plan_slabs_plan_idx" ON "commission_plan_slabs" USING btree ("commission_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_plans_organization_name_unique" ON "commission_plans" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "commission_plans_organization_idx" ON "commission_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_plans_scope_idx" ON "commission_plans" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "commission_plans_status_idx" ON "commission_plans" USING btree ("status");