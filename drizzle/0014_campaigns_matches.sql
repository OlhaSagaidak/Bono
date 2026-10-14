CREATE TYPE "public"."campaign_status" AS ENUM('unfunded', 'funded');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('queued', 'processing', 'sent', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "campaign_nonprofits" (
	"campaign_id" uuid NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	CONSTRAINT "campaign_nonprofits_campaign_id_nonprofit_id_pk" PRIMARY KEY("campaign_id","nonprofit_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cause_slug" text,
	"ratio_percent" integer NOT NULL,
	"cap_cents" integer NOT NULL,
	"pool_cents" integer NOT NULL,
	"reserved_cents" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'unfunded' NOT NULL,
	"paypal_order_id" text,
	"paypal_capture_id" text,
	"funded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "campaigns_paypal_capture_id_unique" UNIQUE("paypal_capture_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"donation_id" uuid NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"receiver_email" text NOT NULL,
	"status" "match_status" DEFAULT 'queued' NOT NULL,
	"payout_batch_id" text,
	"payout_item_id" text,
	"payout_status" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_donation_id_unique" UNIQUE("donation_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_nonprofits" ADD CONSTRAINT "campaign_nonprofits_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_nonprofits" ADD CONSTRAINT "campaign_nonprofits_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sponsor_id_sponsor_profiles_user_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_cause_slug_causes_slug_fk" FOREIGN KEY ("cause_slug") REFERENCES "public"."causes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_campaign_idx" ON "matches" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");