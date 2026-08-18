CREATE TABLE "lead_contact_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"listing_id" uuid,
	"provider" text NOT NULL,
	"external_inquiry_id" text NOT NULL,
	"external_entity_type" text,
	"channel" text,
	"provider_status" text,
	"distribution_type" text,
	"external_public_profile_id" text,
	"sender_name" text,
	"sender_contacts" jsonb,
	"response_link" text,
	"external_listing_id" text,
	"external_listing_reference" text,
	"external_project_id" text,
	"external_developer_id" text,
	"call_talk_time_seconds" integer,
	"call_wait_time_seconds" integer,
	"call_recording_url" text,
	"tags" jsonb,
	"enrichment" jsonb,
	"provider_created_at" timestamp with time zone,
	"raw_payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"link_source" text DEFAULT 'inquiry' NOT NULL,
	"first_linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_membership_id" uuid
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"reference" text,
	"property_id" uuid,
	"unit_id" uuid,
	"assigned_to_membership_id" uuid,
	"external_assigned_to_id" text,
	"external_assigned_to_name" text,
	"title_en" text,
	"title_ar" text,
	"description_en" text,
	"description_ar" text,
	"category" text,
	"offering_type" text,
	"property_type" text,
	"project_status" text,
	"bedrooms" text,
	"bathrooms" text,
	"size" numeric(14, 2),
	"built_up_area" numeric(14, 2),
	"external_location_id" text,
	"uae_emirate" text,
	"unit_number" text,
	"floor_number" text,
	"parking_slots" integer,
	"developer" text,
	"furnishing_type" text,
	"finishing_type" text,
	"available_from" date,
	"price_amount" numeric(18, 2),
	"price_type" text,
	"currency" text,
	"state_type" text,
	"state_stage" text,
	"is_live" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"verification_status" text,
	"advertisement_number" text,
	"issuing_client_license_number" text,
	"primary_image_url" text,
	"provider_created_at" timestamp with time zone,
	"provider_updated_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "first_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "lead_contact_methods" ADD CONSTRAINT "lead_contact_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_contact_methods" ADD CONSTRAINT "lead_contact_methods_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_inquiries" ADD CONSTRAINT "lead_inquiries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_inquiries" ADD CONSTRAINT "lead_inquiries_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_inquiries" ADD CONSTRAINT "lead_inquiries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_listings" ADD CONSTRAINT "lead_listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_listings" ADD CONSTRAINT "lead_listings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_listings" ADD CONSTRAINT "lead_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_listings" ADD CONSTRAINT "lead_listings_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_assigned_to_membership_id_memberships_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_contact_methods_lead_contact_unique" ON "lead_contact_methods" USING btree ("organization_id","lead_id","contact_type","normalized_value");--> statement-breakpoint
CREATE INDEX "lead_contact_methods_lookup_idx" ON "lead_contact_methods" USING btree ("organization_id","contact_type","normalized_value");--> statement-breakpoint
CREATE INDEX "lead_contact_methods_lead_idx" ON "lead_contact_methods" USING btree ("organization_id","lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_inquiries_external_unique" ON "lead_inquiries" USING btree ("organization_id","provider","external_inquiry_id");--> statement-breakpoint
CREATE INDEX "lead_inquiries_lead_idx" ON "lead_inquiries" USING btree ("organization_id","lead_id");--> statement-breakpoint
CREATE INDEX "lead_inquiries_listing_idx" ON "lead_inquiries" USING btree ("organization_id","listing_id");--> statement-breakpoint
CREATE INDEX "lead_inquiries_provider_created_idx" ON "lead_inquiries" USING btree ("organization_id","provider","provider_created_at");--> statement-breakpoint
CREATE INDEX "lead_inquiries_channel_idx" ON "lead_inquiries" USING btree ("organization_id","provider","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_listings_unique" ON "lead_listings" USING btree ("organization_id","lead_id","listing_id");--> statement-breakpoint
CREATE INDEX "lead_listings_lead_idx" ON "lead_listings" USING btree ("organization_id","lead_id");--> statement-breakpoint
CREATE INDEX "lead_listings_listing_idx" ON "lead_listings" USING btree ("organization_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_provider_external_id_unique" ON "listings" USING btree ("organization_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "listings_reference_idx" ON "listings" USING btree ("organization_id","provider","reference");--> statement-breakpoint
CREATE INDEX "listings_live_idx" ON "listings" USING btree ("organization_id","provider","is_live");--> statement-breakpoint
CREATE INDEX "listings_property_idx" ON "listings" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE INDEX "listings_unit_idx" ON "listings" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE INDEX "listings_assigned_idx" ON "listings" USING btree ("organization_id","assigned_to_membership_id");--> statement-breakpoint
CREATE INDEX "listings_state_idx" ON "listings" USING btree ("organization_id","provider","state_stage");--> statement-breakpoint
CREATE INDEX "listings_location_idx" ON "listings" USING btree ("organization_id","external_location_id");

--> statement-breakpoint

/*
 * ============================================================
 * EXISTING LEAD DISPLAY NAME BACKFILL
 * ============================================================
 */

UPDATE "leads"
SET "display_name" =
    NULLIF(
        TRIM(
            CONCAT_WS(
                ' ',
                "first_name",
                "last_name"
            )
        ),
        ''
    )
WHERE "display_name" IS NULL;

--> statement-breakpoint

/*
 * ============================================================
 * EXISTING LEAD EMAIL CONTACT BACKFILL
 * ============================================================
 *
 * Existing lead.email remains as the convenient primary
 * contact field. This creates the normalized searchable
 * contact identity used by portal deduplication.
 */

INSERT INTO "lead_contact_methods" (
    "organization_id",
    "lead_id",
    "contact_type",
    "value",
    "normalized_value",
    "is_primary",
    "source"
)
SELECT
    "organization_id",
    "id",
    'email',
    TRIM("email"),
    LOWER(TRIM("email")),
    true,
    'existing_lead'
FROM "leads"
WHERE
    "email" IS NOT NULL
    AND TRIM("email") <> ''
ON CONFLICT DO NOTHING;

--> statement-breakpoint

/*
 * ============================================================
 * EXISTING LEAD PHONE CONTACT BACKFILL
 * ============================================================
 *
 * Removes spaces, brackets and separators while preserving
 * a leading + where present.
 *
 * The application integration layer will later implement
 * stricter UAE/international E.164 normalization.
 */

INSERT INTO "lead_contact_methods" (
    "organization_id",
    "lead_id",
    "contact_type",
    "value",
    "normalized_value",
    "is_primary",
    "source"
)
SELECT
    "organization_id",
    "id",
    'phone',
    TRIM("phone"),
    REGEXP_REPLACE(
        TRIM("phone"),
        '[^0-9+]',
        '',
        'g'
    ),
    true,
    'existing_lead'
FROM "leads"
WHERE
    "phone" IS NOT NULL
    AND TRIM("phone") <> ''
ON CONFLICT DO NOTHING;