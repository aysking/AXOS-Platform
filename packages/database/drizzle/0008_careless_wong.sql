CREATE TYPE "public"."business_status_semantic" AS ENUM('open', 'success', 'failure', 'neutral');--> statement-breakpoint
CREATE TABLE "membership_reporting_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"manager_membership_id" uuid NOT NULL,
	"relationship_type" text DEFAULT 'line_manager' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"semantic" "business_status_semantic" DEFAULT 'neutral' NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"from_status_definition_id" uuid NOT NULL,
	"to_status_definition_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_workflow" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_response_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"event_type" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"default_description" text,
	"requires_next_action" boolean DEFAULT false NOT NULL,
	"default_next_action_delay_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD COLUMN "response_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD COLUMN "response_key_snapshot" text;--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD COLUMN "response_label_snapshot" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "status_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_description" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_by_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_reporting_lines" ADD CONSTRAINT "membership_reporting_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_reporting_lines" ADD CONSTRAINT "membership_reporting_lines_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_reporting_lines" ADD CONSTRAINT "membership_reporting_lines_manager_membership_id_memberships_id_fk" FOREIGN KEY ("manager_membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_definitions" ADD CONSTRAINT "status_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_definitions" ADD CONSTRAINT "status_definitions_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_from_status_definition_id_status_definitions_id_fk" FOREIGN KEY ("from_status_definition_id") REFERENCES "public"."status_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_to_status_definition_id_status_definitions_id_fk" FOREIGN KEY ("to_status_definition_id") REFERENCES "public"."status_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_response_definitions" ADD CONSTRAINT "timeline_response_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_response_definitions" ADD CONSTRAINT "timeline_response_definitions_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_reporting_lines_membership_idx" ON "membership_reporting_lines" USING btree ("organization_id","membership_id","active");--> statement-breakpoint
CREATE INDEX "membership_reporting_lines_manager_idx" ON "membership_reporting_lines" USING btree ("organization_id","manager_membership_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "status_definitions_org_entity_key_unique" ON "status_definitions" USING btree ("organization_id","entity_type","key");--> statement-breakpoint
CREATE INDEX "status_definitions_org_entity_idx" ON "status_definitions" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "status_definitions_active_idx" ON "status_definitions" USING btree ("organization_id","entity_type","is_active");--> statement-breakpoint
CREATE INDEX "status_definitions_sequence_idx" ON "status_definitions" USING btree ("organization_id","entity_type","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "status_transitions_unique" ON "status_transitions" USING btree ("organization_id","entity_type","from_status_definition_id","to_status_definition_id");--> statement-breakpoint
CREATE INDEX "status_transitions_from_idx" ON "status_transitions" USING btree ("organization_id","from_status_definition_id");--> statement-breakpoint
CREATE INDEX "status_transitions_to_idx" ON "status_transitions" USING btree ("organization_id","to_status_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_response_definitions_unique" ON "timeline_response_definitions" USING btree ("organization_id","entity_type","event_type","key");--> statement-breakpoint
CREATE INDEX "timeline_response_definitions_org_entity_idx" ON "timeline_response_definitions" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "timeline_response_definitions_event_idx" ON "timeline_response_definitions" USING btree ("organization_id","entity_type","event_type");--> statement-breakpoint
ALTER TABLE "lead_timeline_events" ADD CONSTRAINT "lead_timeline_events_response_definition_id_timeline_response_definitions_id_fk" FOREIGN KEY ("response_definition_id") REFERENCES "public"."timeline_response_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_status_definition_id_status_definitions_id_fk" FOREIGN KEY ("status_definition_id") REFERENCES "public"."status_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_next_action_by_membership_id_memberships_id_fk" FOREIGN KEY ("next_action_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_timeline_response_definition_idx" ON "lead_timeline_events" USING btree ("organization_id","response_definition_id");--> statement-breakpoint
CREATE INDEX "leads_status_definition_idx" ON "leads" USING btree ("organization_id","status_definition_id");--> statement-breakpoint
CREATE INDEX "leads_next_action_idx" ON "leads" USING btree ("organization_id","next_action_at");--> statement-breakpoint
CREATE INDEX "leads_next_action_owner_idx" ON "leads" USING btree ("organization_id","next_action_by_membership_id");--> statement-breakpoint
CREATE INDEX "leads_last_activity_idx" ON "leads" USING btree ("organization_id","last_activity_at");

--> statement-breakpoint

/*
 * ============================================================
 * AXOS DEFAULT LEAD STATUSES
 * ============================================================
 *
 * Seed every existing organization with the AXOS defaults.
 * Labels remain editable; keys/UUIDs provide stable identity.
 */

INSERT INTO "status_definitions" (
    "organization_id",
    "entity_type",
    "key",
    "label",
    "description",
    "semantic",
    "is_terminal",
    "is_default",
    "is_active",
    "sequence"
)
SELECT
    o."id",
    'lead',
    defaults."key",
    defaults."label",
    defaults."description",
    defaults."semantic",
    defaults."is_terminal",
    defaults."is_default",
    true,
    defaults."sequence"
FROM "organizations" o
CROSS JOIN (
    VALUES
        (
            'new',
            'New',
            'New lead awaiting initial handling.',
            'open'::"public"."business_status_semantic",
            false,
            true,
            10
        ),
        (
            'active',
            'Active',
            'Lead is actively being worked.',
            'open'::"public"."business_status_semantic",
            false,
            false,
            20
        ),
        (
            'upcoming',
            'Upcoming',
            'Future opportunity requiring follow-up at a later date.',
            'open'::"public"."business_status_semantic",
            false,
            false,
            30
        ),
        (
            'qualified',
            'Qualified',
            'Lead has been qualified as a genuine opportunity.',
            'open'::"public"."business_status_semantic",
            false,
            false,
            40
        ),
        (
            'viewing_scheduled',
            'Viewing Scheduled',
            'A property or unit viewing has been scheduled.',
            'open'::"public"."business_status_semantic",
            false,
            false,
            50
        ),
        (
            'offer',
            'Offer',
            'Lead has progressed to the offer stage.',
            'open'::"public"."business_status_semantic",
            false,
            false,
            60
        ),
        (
            'converted',
            'Converted',
            'Lead successfully converted to a transaction.',
            'success'::"public"."business_status_semantic",
            true,
            false,
            70
        ),
        (
            'lost',
            'Lost',
            'Opportunity was lost.',
            'failure'::"public"."business_status_semantic",
            true,
            false,
            80
        ),
        (
            'closed',
            'Closed',
            'Lead was closed without another active lifecycle state.',
            'neutral'::"public"."business_status_semantic",
            true,
            false,
            90
        )
) AS defaults(
    "key",
    "label",
    "description",
    "semantic",
    "is_terminal",
    "is_default",
    "sequence"
)
ON CONFLICT DO NOTHING;

--> statement-breakpoint

/*
 * ============================================================
 * MIGRATE EXISTING LEAD STATUS
 * ============================================================
 *
 * Existing enum:
 * new / active / qualified / offer / converted / lost / closed
 *
 * Upcoming and Viewing Scheduled have no legacy equivalent.
 */

UPDATE "leads" AS l
SET "status_definition_id" = sd."id"
FROM "status_definitions" AS sd
WHERE
    sd."organization_id" = l."organization_id"
    AND sd."entity_type" = 'lead'
    AND sd."key" = l."status"::text
    AND l."status_definition_id" IS NULL;

--> statement-breakpoint

/*
 * Existing Leads should retain their actual historical activity
 * time rather than appearing active at migration execution time.
 */

UPDATE "leads"
SET "last_activity_at" = "updated_at";

--> statement-breakpoint

/*
 * ============================================================
 * DEFAULT LEAD STATUS TRANSITIONS
 * ============================================================
 */

WITH transition_pairs (
    "from_key",
    "to_key"
) AS (
    VALUES

        -- New
        ('new', 'active'),
        ('new', 'upcoming'),
        ('new', 'qualified'),
        ('new', 'lost'),
        ('new', 'closed'),

        -- Upcoming
        ('upcoming', 'active'),
        ('upcoming', 'qualified'),
        ('upcoming', 'lost'),
        ('upcoming', 'closed'),

        -- Active
        ('active', 'upcoming'),
        ('active', 'qualified'),
        ('active', 'viewing_scheduled'),
        ('active', 'offer'),
        ('active', 'lost'),
        ('active', 'closed'),

        -- Qualified
        ('qualified', 'viewing_scheduled'),
        ('qualified', 'offer'),
        ('qualified', 'active'),
        ('qualified', 'lost'),
        ('qualified', 'closed'),

        -- Viewing Scheduled
        ('viewing_scheduled', 'qualified'),
        ('viewing_scheduled', 'offer'),
        ('viewing_scheduled', 'active'),
        ('viewing_scheduled', 'lost'),
        ('viewing_scheduled', 'closed'),

        -- Offer
        ('offer', 'qualified'),
        ('offer', 'converted'),
        ('offer', 'lost'),
        ('offer', 'closed')
)
INSERT INTO "status_transitions" (
    "organization_id",
    "entity_type",
    "from_status_definition_id",
    "to_status_definition_id",
    "is_active",
    "requires_workflow"
)
SELECT
    source_status."organization_id",
    'lead',
    source_status."id",
    target_status."id",
    true,
    false
FROM transition_pairs p
JOIN "status_definitions" source_status
    ON source_status."entity_type" = 'lead'
    AND source_status."key" = p."from_key"
JOIN "status_definitions" target_status
    ON target_status."organization_id" =
        source_status."organization_id"
    AND target_status."entity_type" = 'lead'
    AND target_status."key" = p."to_key"
ON CONFLICT DO NOTHING;

--> statement-breakpoint

/*
 * ============================================================
 * DEFAULT LEAD TIMELINE RESPONSES
 * ============================================================
 */

INSERT INTO "timeline_response_definitions" (
    "organization_id",
    "entity_type",
    "event_type",
    "key",
    "label",
    "default_description",
    "requires_next_action",
    "default_next_action_delay_minutes",
    "is_active",
    "sequence"
)
SELECT
    o."id",
    'lead',
    response."event_type",
    response."key",
    response."label",
    response."default_description",
    response."requires_next_action",
    response."default_delay",
    true,
    response."sequence"
FROM "organizations" o
CROSS JOIN (
    VALUES

        -- CALL
        (
            'call',
            'contacted_interested',
            'Contacted - Interested',
            'Client was contacted and expressed interest.',
            false,
            NULL::integer,
            10
        ),
        (
            'call',
            'contacted_follow_up_required',
            'Contacted - Follow Up Required',
            'Client was contacted and requires further follow-up.',
            true,
            1440,
            20
        ),
        (
            'call',
            'no_answer',
            'No Answer',
            'Attempted to contact the client but there was no answer.',
            true,
            1440,
            30
        ),
        (
            'call',
            'switched_off_unreachable',
            'Switched Off / Unreachable',
            'Client could not be reached.',
            true,
            1440,
            40
        ),
        (
            'call',
            'wrong_number',
            'Wrong Number',
            'The recorded telephone number is incorrect.',
            false,
            NULL::integer,
            50
        ),
        (
            'call',
            'call_back_requested',
            'Call Back Requested',
            'Client requested to be contacted again.',
            true,
            NULL::integer,
            60
        ),
        (
            'call',
            'not_interested',
            'Not Interested',
            'Client advised that they are not interested.',
            false,
            NULL::integer,
            70
        ),

        -- MESSAGE / WHATSAPP
        (
            'message',
            'message_sent',
            'Message Sent',
            'Message was sent to the client.',
            false,
            NULL::integer,
            10
        ),
        (
            'message',
            'client_responded',
            'Client Responded',
            'Client responded to the message.',
            false,
            NULL::integer,
            20
        ),
        (
            'message',
            'follow_up_required',
            'Follow Up Required',
            'Further message follow-up is required.',
            true,
            1440,
            30
        ),
        (
            'message',
            'no_response',
            'No Response',
            'No response was received from the client.',
            true,
            1440,
            40
        ),

        -- EMAIL
        (
            'email',
            'email_sent',
            'Email Sent',
            'Email was sent to the client.',
            false,
            NULL::integer,
            10
        ),
        (
            'email',
            'client_responded',
            'Client Responded',
            'Client responded by email.',
            false,
            NULL::integer,
            20
        ),
        (
            'email',
            'follow_up_required',
            'Follow Up Required',
            'Email follow-up is required.',
            true,
            1440,
            30
        ),
        (
            'email',
            'documents_requested',
            'Documents Requested',
            'Required documents were requested.',
            true,
            NULL::integer,
            40
        ),
        (
            'email',
            'documents_received',
            'Documents Received',
            'Requested documents were received.',
            false,
            NULL::integer,
            50
        ),

        -- MEETING
        (
            'meeting',
            'meeting_scheduled',
            'Meeting Scheduled',
            'A meeting with the client has been scheduled.',
            true,
            NULL::integer,
            10
        ),
        (
            'meeting',
            'meeting_completed',
            'Meeting Completed',
            'The scheduled meeting was completed.',
            false,
            NULL::integer,
            20
        ),
        (
            'meeting',
            'meeting_rescheduled',
            'Meeting Rescheduled',
            'The meeting was rescheduled.',
            true,
            NULL::integer,
            30
        ),
        (
            'meeting',
            'meeting_cancelled',
            'Meeting Cancelled',
            'The meeting was cancelled.',
            true,
            NULL::integer,
            40
        ),
        (
            'meeting',
            'follow_up_required',
            'Follow Up Required',
            'Follow-up is required following the meeting.',
            true,
            1440,
            50
        ),

        -- VIEWING
        (
            'viewing',
            'viewing_scheduled',
            'Viewing Scheduled',
            'A property viewing was scheduled.',
            true,
            NULL::integer,
            10
        ),
        (
            'viewing',
            'viewing_confirmed',
            'Viewing Confirmed',
            'The scheduled viewing was confirmed.',
            true,
            NULL::integer,
            20
        ),
        (
            'viewing',
            'viewing_completed',
            'Viewing Completed',
            'The property viewing was completed.',
            false,
            NULL::integer,
            30
        ),
        (
            'viewing',
            'interested',
            'Interested',
            'Client expressed interest after the viewing.',
            true,
            1440,
            40
        ),
        (
            'viewing',
            'not_interested',
            'Not Interested',
            'Client advised that the viewed property was not suitable.',
            false,
            NULL::integer,
            50
        ),
        (
            'viewing',
            'second_viewing_required',
            'Second Viewing Required',
            'A further viewing is required.',
            true,
            NULL::integer,
            60
        ),
        (
            'viewing',
            'offer_requested',
            'Offer Requested',
            'Client requested progression to an offer.',
            false,
            NULL::integer,
            70
        ),
        (
            'viewing',
            'cancelled',
            'Cancelled',
            'The property viewing was cancelled.',
            true,
            NULL::integer,
            80
        ),
        (
            'viewing',
            'no_show',
            'No Show',
            'The client did not attend the scheduled viewing.',
            true,
            1440,
            90
        ),

        -- GENERAL / NOTE
        (
            'note',
            'follow_up_required',
            'Follow Up Required',
            'A future follow-up action is required.',
            true,
            NULL::integer,
            10
        ),
        (
            'note',
            'awaiting_client',
            'Awaiting Client',
            'Action or information is currently awaited from the client.',
            true,
            1440,
            20
        ),
        (
            'note',
            'awaiting_landlord',
            'Awaiting Landlord',
            'Action or information is currently awaited from the landlord.',
            true,
            1440,
            30
        ),
        (
            'note',
            'awaiting_developer',
            'Awaiting Developer',
            'Action or information is currently awaited from the developer.',
            true,
            1440,
            40
        ),
        (
            'note',
            'awaiting_documents',
            'Awaiting Documents',
            'Required documents are currently outstanding.',
            true,
            1440,
            50
        ),
        (
            'note',
            'client_not_ready',
            'Client Not Ready',
            'Client is not ready to proceed at this time.',
            true,
            NULL::integer,
            60
        ),
        (
            'note',
            'future_requirement',
            'Future Requirement',
            'The client has a requirement expected at a future date.',
            true,
            NULL::integer,
            70
        ),
        (
            'note',
            'no_further_action',
            'No Further Action',
            'No immediate further action is required.',
            false,
            NULL::integer,
            80
        )

) AS response(
    "event_type",
    "key",
    "label",
    "default_description",
    "requires_next_action",
    "default_delay",
    "sequence"
)
ON CONFLICT DO NOTHING;

--> statement-breakpoint

/*
 * ============================================================
 * MIGRATION VALIDATION
 * ============================================================
 *
 * Every existing Lead must have successfully mapped from the
 * legacy status enum to a status definition.
 */

DO $$
DECLARE
    unmapped_lead_count integer;
BEGIN
    SELECT COUNT(*)
    INTO unmapped_lead_count
    FROM "leads"
    WHERE "status_definition_id" IS NULL;

    IF unmapped_lead_count > 0 THEN
        RAISE EXCEPTION
            'AXOS status migration failed: % Lead(s) have no status_definition_id',
            unmapped_lead_count;
    END IF;
END
$$;