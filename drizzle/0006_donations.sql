CREATE TYPE "public"."donation_status" AS ENUM('created', 'pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"post_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "donation_status" DEFAULT 'created' NOT NULL,
	"payee_email" text NOT NULL,
	"paypal_order_id" text,
	"paypal_capture_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "donations_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "donations_paypal_capture_id_unique" UNIQUE("paypal_capture_id")
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_nonprofit_idx" ON "donations" USING btree ("nonprofit_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "donations_donor_idx" ON "donations" USING btree ("donor_id","created_at" DESC NULLS LAST);