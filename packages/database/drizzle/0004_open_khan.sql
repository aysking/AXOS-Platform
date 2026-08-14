CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'approved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('draft', 'approved', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."sale_commission_status" ADD VALUE 'payable' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."sale_commission_status" ADD VALUE 'processed' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"lead_id" uuid,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"subtotal" numeric(18, 2) NOT NULL,
	"vat_applicable" boolean DEFAULT false NOT NULL,
	"vat_rate" numeric(8, 4),
	"vat_amount" numeric(18, 2),
	"total_amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"tax_registration_number" text,
	"notes" text,
	"template_id" uuid,
	"template_version" integer,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"approved_by_membership_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"lead_id" uuid,
	"invoice_id" uuid NOT NULL,
	"receipt_number" text NOT NULL,
	"status" "receipt_status" DEFAULT 'draft' NOT NULL,
	"receipt_date" timestamp with time zone DEFAULT now() NOT NULL,
	"received_amount" numeric(18, 2) NOT NULL,
	"vat_applicable" boolean DEFAULT false NOT NULL,
	"vat_rate" numeric(8, 4),
	"vat_amount" numeric(18, 2),
	"currency" text DEFAULT 'AED' NOT NULL,
	"notes" text,
	"template_id" uuid,
	"template_version" integer,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"approved_by_membership_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "sale_offers_number_unique";--> statement-breakpoint
DROP INDEX "sale_reservations_number_unique";--> statement-breakpoint
DROP INDEX "sale_transactions_number_unique";--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD COLUMN "receipt_id" uuid;--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD COLUMN "payable_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sale_installments" ADD COLUMN "milestone" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_membership_id_memberships_id_fk" FOREIGN KEY ("approved_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_approved_by_membership_id_memberships_id_fk" FOREIGN KEY ("approved_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organization_number_unique" ON "invoices" USING btree ("organization_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_organization_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_transaction_idx" ON "invoices" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "invoices_lead_idx" ON "invoices" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_issue_date_idx" ON "invoices" USING btree ("issue_date");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_organization_number_unique" ON "receipts" USING btree ("organization_id","receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_organization_idx" ON "receipts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "receipts_transaction_idx" ON "receipts" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "receipts_invoice_idx" ON "receipts" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "receipts_lead_idx" ON "receipts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "receipts_status_idx" ON "receipts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "receipts_date_idx" ON "receipts" USING btree ("receipt_date");--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD CONSTRAINT "sale_commissions_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_commissions_receipt_idx" ON "sale_commissions" USING btree ("receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_offers_organization_number_unique" ON "sale_offers" USING btree ("sale_transaction_id","offer_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_reservations_transaction_number_unique" ON "sale_reservations" USING btree ("sale_transaction_id","reservation_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_transactions_organization_number_unique" ON "sale_transactions" USING btree ("organization_id","transaction_number");