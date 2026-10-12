CREATE TYPE "public"."ein_source" AS ENUM('irs', 'demo');--> statement-breakpoint
CREATE TABLE "demo_ein_registry" (
	"ein" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "irs_exempt_orgs" (
	"ein" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"loaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "donation_status" DEFAULT 'created' NOT NULL,
	"paypal_order_id" text,
	"paypal_capture_id" text,
	"payer_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "verification_fees_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "verification_fees_paypal_capture_id_unique" UNIQUE("paypal_capture_id")
);
--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD COLUMN "ein" text;--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD COLUMN "ein_source" "ein_source";--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD COLUMN "ein_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_fees" ADD CONSTRAINT "verification_fees_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD CONSTRAINT "nonprofit_profiles_ein_unique" UNIQUE("ein");