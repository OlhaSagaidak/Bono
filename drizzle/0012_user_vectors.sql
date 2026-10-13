CREATE TABLE "user_vectors" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(384) NOT NULL,
	"signal_count" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_vectors" ADD CONSTRAINT "user_vectors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;