CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"nonprofit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_nonprofit_id_pk" PRIMARY KEY("follower_id","nonprofit_id")
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_nonprofit_idx" ON "follows" USING btree ("nonprofit_id");--> statement-breakpoint
CREATE INDEX "post_likes_post_idx" ON "post_likes" USING btree ("post_id");