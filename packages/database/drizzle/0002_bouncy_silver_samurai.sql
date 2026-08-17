CREATE TYPE "public"."sale_jurisdiction" AS ENUM('adrec', 'adgm', 'masdar', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_transaction_status" AS ENUM('draft', 'active', 'offer', 'reservation', 'spa', 'completed', 'cancelled', 'lost');--> statement-breakpoint
CREATE TYPE "public"."sale_transaction_type" AS ENUM('secondary_market', 'off_plan');--> statement-breakpoint
CREATE TABLE "sale_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid,
	"assigned_to_membership_id" uuid,
	"transaction_number" text NOT NULL,
	"transaction_type" "sale_transaction_type" NOT NULL,
	"status" "sale_transaction_status" DEFAULT 'draft' NOT NULL,
	"jurisdiction" "sale_jurisdiction",
	"property_id" uuid,
	"unit_id" uuid,
	"external_property_name" text,
	"external_unit_number" text,
	"external_developer_name" text,
	"sale_price" numeric(18, 2),
	"currency" text DEFAULT 'AED' NOT NULL,
	"commission_type" text,
	"commission_rate" numeric(8, 4),
	"commission_amount" numeric(18, 2),
	"vat_applicable" integer DEFAULT 0 NOT NULL,
	"vat_rate" numeric(8, 4),
	"vat_amount" numeric(18, 2),
	"seller_name" text,
	"seller_contact" text,
	"buyer_name" text,
	"buyer_contact" text,
	"project_name" text,
	"developer_project_reference" text,
	"reservation_amount" numeric(18, 2),
	"installment_plan" jsonb,
	"brochure_reference" text,
	"spa_required" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_assigned_to_membership_id_memberships_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sale_transactions_number_unique" ON "sale_transactions" USING btree ("transaction_number");--> statement-breakpoint
CREATE INDEX "sale_transactions_organization_idx" ON "sale_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sale_transactions_lead_idx" ON "sale_transactions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "sale_transactions_assigned_to_idx" ON "sale_transactions" USING btree ("assigned_to_membership_id");--> statement-breakpoint
CREATE INDEX "sale_transactions_status_idx" ON "sale_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sale_transactions_type_idx" ON "sale_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "sale_transactions_jurisdiction_idx" ON "sale_transactions" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "sale_transactions_property_idx" ON "sale_transactions" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "sale_transactions_unit_idx" ON "sale_transactions" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "sale_transactions_created_at_idx" ON "sale_transactions" USING btree ("created_at");