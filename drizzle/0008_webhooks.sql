ALTER TYPE "public"."donation_status" ADD VALUE 'refunded';--> statement-breakpoint
CREATE TABLE "paypal_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" text,
	"outcome" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
