CREATE TYPE "public"."integration_webhook_processing_status" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "integration_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"external_entity_id" text,
	"external_entity_type" text,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processing_status" "integration_webhook_processing_status" DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_webhook_events" ADD CONSTRAINT "integration_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_webhook_events_org_provider_event_unique" ON "integration_webhook_events" USING btree ("organization_id","provider","external_event_id");--> statement-breakpoint
CREATE INDEX "integration_webhook_events_processing_idx" ON "integration_webhook_events" USING btree ("organization_id","provider","processing_status","received_at");--> statement-breakpoint
CREATE INDEX "integration_webhook_events_type_idx" ON "integration_webhook_events" USING btree ("organization_id","provider","event_type","received_at");--> statement-breakpoint
CREATE INDEX "integration_webhook_events_entity_idx" ON "integration_webhook_events" USING btree ("organization_id","provider","external_entity_type","external_entity_id");