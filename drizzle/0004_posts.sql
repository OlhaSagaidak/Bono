CREATE TABLE "post_causes" (
	"post_id" uuid NOT NULL,
	"cause_slug" text NOT NULL,
	CONSTRAINT "post_causes_post_id_cause_slug_pk" PRIMARY KEY("post_id","cause_slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"body" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"image_id" uuid,
	"image_alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_causes" ADD CONSTRAINT "post_causes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_causes" ADD CONSTRAINT "post_causes_cause_slug_causes_slug_fk" FOREIGN KEY ("cause_slug") REFERENCES "public"."causes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_nonprofit_created_at_idx" ON "posts" USING btree ("nonprofit_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);