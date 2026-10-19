CREATE TABLE "boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"days" integer NOT NULL,
	"paypal_order_id" text,
	"paypal_capture_id" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boosts_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "boosts_paypal_capture_id_unique" UNIQUE("paypal_capture_id")
);
--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_sponsor_id_sponsor_profiles_user_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boosts_post_idx" ON "boosts" USING btree ("post_id","ends_at");--> statement-breakpoint
CREATE INDEX "boosts_sponsor_idx" ON "boosts" USING btree ("sponsor_id");