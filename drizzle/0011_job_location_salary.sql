ALTER TABLE "jobs" ADD COLUMN "location_city" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "location_country" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "job_salary_range" CHECK ("jobs"."salary_min" >= 0 and "jobs"."salary_max" >= "jobs"."salary_min");