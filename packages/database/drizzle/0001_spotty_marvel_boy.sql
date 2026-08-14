CREATE TYPE "public"."lead_source" AS ENUM('website', 'property_portal', 'referral', 'walk_in', 'phone', 'email', 'social_media', 'campaign', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'active', 'qualified', 'offer', 'converted', 'lost', 'closed');--> statement-breakpoint
CREATE TYPE "public"."lead_timeline_event_type" AS ENUM('created', 'updated', 'assigned', 'status_changed', 'call', 'email', 'message', 'meeting', 'viewing', 'property_added', 'property_removed', 'unit_added', 'unit_removed', 'note', 'offer_created', 'offer_updated', 'custom');--> statement-breakpoint
CREATE TYPE "public"."lead_type" AS ENUM('sales', 'leasing', 'sales_and_leasing');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('residential', 'commercial', 'retail', 'mixed_use', 'land', 'other');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('apartment', 'villa', 'office', 'retail', 'warehouse', 'land', 'parking', 'other');--> statement-breakpoint
CREATE TABLE "lead_external_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"property_name" text NOT NULL,
	"developer" text,
	"address" text,
	"city" text,
	"emirate" text,
	"property_type" text,
	"reference_code" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_external_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"unit_number" text,
	"property_name" text,
	"address" text,
	"city" text,
	"emirate" text,
	"unit_type" text,
	"bedrooms" integer,
	"bathrooms" integer,
	"area_sq_ft" integer,
	"reference_code" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_properties" (
	"lead_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"created_by_membership_id" uuid,
	"event_type" "lead_timeline_event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_units" (
	"lead_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assigned_to_membership_id" uuid,
	"title" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"lead_type" "lead_type" NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"source" "lead_source",
	"source_details" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"reference_code" text,
	"property_type" "property_type",
	"status" "property_status" DEFAULT 'active' NOT NULL,
	"developer" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"emirate" text,
	"country" text,
	"postal_code" text,
	"latitude" text,
	"longitude" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid,
	"unit_number" text NOT NULL,
	"reference_code" text,
	"unit_type" "unit_type",
	"status" "unit_status" DEFAULT 'active' NOT NULL,
	"floor" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"area_sq_ft" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_external_properties" ADD CONSTRAINT "lead_external_properties_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_external_units" ADD CONSTRAINT "lead_external_units_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_properties" ADD CONSTRAINT "lead_properties_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_properties" ADD CONSTRAINT "lead_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD CONSTRAINT "lead_timeline_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD CONSTRAINT "lead_timeline_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD CONSTRAINT "lead_timeline_events_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_units" ADD CONSTRAINT "lead_units_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_units" ADD CONSTRAINT "lead_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_membership_id_memberships_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_external_properties_lead_idx" ON "lead_external_properties" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_external_properties_reference_idx" ON "lead_external_properties" USING btree ("reference_code");--> statement-breakpoint
CREATE INDEX "lead_external_units_lead_idx" ON "lead_external_units" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_external_units_reference_idx" ON "lead_external_units" USING btree ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_properties_unique" ON "lead_properties" USING btree ("lead_id","property_id");--> statement-breakpoint
CREATE INDEX "lead_properties_lead_idx" ON "lead_properties" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_properties_property_idx" ON "lead_properties" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "lead_timeline_events_organization_idx" ON "lead_timeline_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lead_timeline_events_lead_idx" ON "lead_timeline_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_timeline_events_occurred_at_idx" ON "lead_timeline_events" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "lead_timeline_events_type_idx" ON "lead_timeline_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_units_unique" ON "lead_units" USING btree ("lead_id","unit_id");--> statement-breakpoint
CREATE INDEX "lead_units_lead_idx" ON "lead_units" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_units_unit_idx" ON "lead_units" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "leads_organization_idx" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to_membership_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_type_idx" ON "leads" USING btree ("lead_type");--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "properties_organization_idx" ON "properties" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "properties_reference_idx" ON "properties" USING btree ("reference_code");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_type_idx" ON "properties" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "units_organization_idx" ON "units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "units_property_idx" ON "units" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "units_reference_idx" ON "units" USING btree ("reference_code");--> statement-breakpoint
CREATE INDEX "units_status_idx" ON "units" USING btree ("status");--> statement-breakpoint
CREATE INDEX "units_type_idx" ON "units" USING btree ("unit_type");