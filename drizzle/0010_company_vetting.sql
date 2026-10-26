ALTER TABLE "companies" ADD COLUMN "vetting_reason" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "vetting_model" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "vetted_at" timestamp with time zone;