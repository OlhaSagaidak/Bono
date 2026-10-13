ALTER TABLE "causes" ADD COLUMN "embedding" vector(384);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "embedding" vector(384);