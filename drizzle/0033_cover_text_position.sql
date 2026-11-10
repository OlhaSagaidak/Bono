CREATE TYPE "public"."cover_text_position" AS ENUM('top', 'middle', 'bottom');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "cover_text_position" "cover_text_position" DEFAULT 'middle' NOT NULL;--> statement-breakpoint
ALTER TABLE "reels" ADD COLUMN "cover_text_position" "cover_text_position" DEFAULT 'middle' NOT NULL;