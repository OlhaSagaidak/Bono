ALTER TABLE "ai_texts" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_texts" ADD CONSTRAINT "ai_texts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_texts_user_idx" ON "ai_texts" USING btree ("user_id","created_at");