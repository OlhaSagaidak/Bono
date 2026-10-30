DROP TABLE "irs_exempt_orgs" CASCADE;--> statement-breakpoint
ALTER TABLE "demo_ein_registry" ADD COLUMN "ruling_date" date DEFAULT '2015-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "nonprofit_profiles" ADD COLUMN "ein_ruling_date" date;