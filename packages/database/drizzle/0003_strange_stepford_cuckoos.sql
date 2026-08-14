CREATE TYPE "public"."sale_commission_status" AS ENUM('draft', 'approved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sale_offer_status" AS ENUM('draft', 'submitted', 'accepted', 'rejected', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sale_party_type" AS ENUM('buyer', 'co_buyer', 'seller', 'co_seller', 'representative', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_reservation_status" AS ENUM('draft', 'issued', 'accepted', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "sale_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"membership_id" uuid,
	"description" text,
	"commission_type" text,
	"rate" numeric(8, 4),
	"amount" numeric(18, 2),
	"currency" text DEFAULT 'AED' NOT NULL,
	"vat_applicable" boolean DEFAULT false NOT NULL,
	"vat_rate" numeric(8, 4),
	"vat_amount" numeric(18, 2),
	"status" "sale_commission_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"description" text NOT NULL,
	"percentage" numeric(8, 4),
	"amount" numeric(18, 2),
	"currency" text DEFAULT 'AED' NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"offer_number" text NOT NULL,
	"offer_amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"valid_until" timestamp with time zone,
	"status" "sale_offer_status" DEFAULT 'draft' NOT NULL,
	"terms" text,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"reservation_number" text NOT NULL,
	"reservation_amount" numeric(18, 2),
	"currency" text DEFAULT 'AED' NOT NULL,
	"reservation_date" timestamp with time zone,
	"status" "sale_reservation_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_transaction_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_transaction_id" uuid NOT NULL,
	"party_type" "sale_party_type" NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"email" text,
	"phone" text,
	"role" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_transactions" ALTER COLUMN "vat_applicable" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "sale_transactions" ALTER COLUMN "spa_required" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD CONSTRAINT "sale_commissions_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_commissions" ADD CONSTRAINT "sale_commissions_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_installments" ADD CONSTRAINT "sale_installments_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_offers" ADD CONSTRAINT "sale_offers_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_offers" ADD CONSTRAINT "sale_offers_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_reservations" ADD CONSTRAINT "sale_reservations_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_reservations" ADD CONSTRAINT "sale_reservations_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_transaction_parties" ADD CONSTRAINT "sale_transaction_parties_sale_transaction_id_sale_transactions_id_fk" FOREIGN KEY ("sale_transaction_id") REFERENCES "public"."sale_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_commissions_transaction_idx" ON "sale_commissions" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "sale_commissions_membership_idx" ON "sale_commissions" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "sale_commissions_status_idx" ON "sale_commissions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_installments_transaction_sequence_unique" ON "sale_installments" USING btree ("sale_transaction_id","sequence");--> statement-breakpoint
CREATE INDEX "sale_installments_transaction_idx" ON "sale_installments" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "sale_installments_due_date_idx" ON "sale_installments" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_offers_number_unique" ON "sale_offers" USING btree ("offer_number");--> statement-breakpoint
CREATE INDEX "sale_offers_transaction_idx" ON "sale_offers" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "sale_offers_status_idx" ON "sale_offers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_reservations_number_unique" ON "sale_reservations" USING btree ("reservation_number");--> statement-breakpoint
CREATE INDEX "sale_reservations_transaction_idx" ON "sale_reservations" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "sale_reservations_status_idx" ON "sale_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sale_transaction_parties_transaction_idx" ON "sale_transaction_parties" USING btree ("sale_transaction_id");--> statement-breakpoint
CREATE INDEX "sale_transaction_parties_type_idx" ON "sale_transaction_parties" USING btree ("party_type");--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "seller_name";--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "seller_contact";--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "buyer_name";--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "buyer_contact";--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "reservation_amount";--> statement-breakpoint
ALTER TABLE "sale_transactions" DROP COLUMN "installment_plan";