ALTER TYPE "public"."lead_timeline_event_type" ADD VALUE 'archived';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "archived_by_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_archived_by_membership_id_memberships_id_fk" FOREIGN KEY ("archived_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_archived_idx" ON "leads" USING btree ("organization_id","archived_at");