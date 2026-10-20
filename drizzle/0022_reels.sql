CREATE TABLE "reel_causes" (
	"reel_id" uuid NOT NULL,
	"cause_slug" text NOT NULL,
	CONSTRAINT "reel_causes_reel_id_cause_slug_pk" PRIMARY KEY("reel_id","cause_slug")
);
--> statement-breakpoint
CREATE TABLE "reel_likes" (
	"user_id" uuid NOT NULL,
	"reel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reel_likes_user_id_reel_id_pk" PRIMARY KEY("user_id","reel_id")
);
--> statement-breakpoint
CREATE TABLE "reel_saves" (
	"user_id" uuid NOT NULL,
	"reel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reel_saves_user_id_reel_id_pk" PRIMARY KEY("user_id","reel_id")
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reel_causes" ADD CONSTRAINT "reel_causes_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_causes" ADD CONSTRAINT "reel_causes_cause_slug_causes_slug_fk" FOREIGN KEY ("cause_slug") REFERENCES "public"."causes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reel_likes_reel_idx" ON "reel_likes" USING btree ("reel_id");--> statement-breakpoint
CREATE INDEX "reel_saves_user_idx" ON "reel_saves" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reels_created_idx" ON "reels" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reels_nonprofit_idx" ON "reels" USING btree ("nonprofit_id","created_at");