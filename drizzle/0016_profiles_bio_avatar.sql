ALTER TABLE "users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_image_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_image_id_images_id_fk" FOREIGN KEY ("avatar_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Sponsors' "about" becomes their bio, like everyone else's, before the column goes.
UPDATE "users" SET "bio" = "sponsor_profiles"."about" FROM "sponsor_profiles" WHERE "sponsor_profiles"."user_id" = "users"."id";--> statement-breakpoint
ALTER TABLE "sponsor_profiles" DROP COLUMN "about";