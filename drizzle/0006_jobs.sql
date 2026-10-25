CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "job_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" uuid,
	"title" text DEFAULT '' NOT NULL,
	"seniority" "seniority",
	"employment_type" "employment_type",
	"work_mode" "work_mode",
	"description" text DEFAULT '' NOT NULL,
	"brief" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_title_length" CHECK (char_length("jobs"."title") <= 120),
	CONSTRAINT "job_description_length" CHECK (char_length("jobs"."description") <= 8000),
	CONSTRAINT "job_brief_length" CHECK (char_length("jobs"."brief") <= 4000)
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_skills_skill_id_idx" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "jobs_company_id_idx" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "jobs_created_by_idx" ON "jobs" USING btree ("created_by");--> statement-breakpoint
CREATE POLICY "Members can read their company's job skills" ON "job_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from jobs j where j.id = "job_skills"."job_id" and exists (select 1 from company_members m where m.company_id = j.company_id and m.profile_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "Members can read their company's jobs" ON "jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from company_members m where m.company_id = "jobs"."company_id" and m.profile_id = (select auth.uid())));