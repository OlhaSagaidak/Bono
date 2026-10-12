CREATE TABLE "causes" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nonprofit_causes" (
	"nonprofit_id" uuid NOT NULL,
	"cause_slug" text NOT NULL,
	CONSTRAINT "nonprofit_causes_nonprofit_id_cause_slug_pk" PRIMARY KEY("nonprofit_id","cause_slug")
);
--> statement-breakpoint
CREATE TABLE "nonprofit_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mission" text NOT NULL,
	"logo_image_id" uuid,
	"paypal_payee_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"logo_image_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"cause_slug" text NOT NULL,
	CONSTRAINT "user_interests_user_id_cause_slug_pk" PRIMARY KEY("user_id","cause_slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nonprofit_causes" ADD CONSTRAINT "nonprofit_causes_nonprofit_id_nonprofit_profiles_user_id_fk" FOREIGN KEY ("nonprofit_id") REFERENCES "public"."nonprofit_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nonprofit_causes" ADD CONSTRAINT "nonprofit_causes_cause_slug_causes_slug_fk" FOREIGN KEY ("cause_slug") REFERENCES "public"."causes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD CONSTRAINT "nonprofit_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD CONSTRAINT "nonprofit_profiles_logo_image_id_images_id_fk" FOREIGN KEY ("logo_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD CONSTRAINT "sponsor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_profiles" ADD CONSTRAINT "sponsor_profiles_logo_image_id_images_id_fk" FOREIGN KEY ("logo_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_cause_slug_causes_slug_fk" FOREIGN KEY ("cause_slug") REFERENCES "public"."causes"("slug") ON DELETE no action ON UPDATE no action;