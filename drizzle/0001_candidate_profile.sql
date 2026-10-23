CREATE TYPE "public"."availability" AS ENUM('immediately', '2_weeks', '1_month', '2_months', '3_months_plus');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'freelance', 'internship');--> statement-breakpoint
CREATE TYPE "public"."job_search_status" AS ENUM('actively_looking', 'open_to_offers', 'not_looking');--> statement-breakpoint
CREATE TYPE "public"."language_proficiency" AS ENUM('basic', 'conversational', 'professional', 'native');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "candidate_languages" (
	"profile_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"proficiency" "language_proficiency" NOT NULL,
	CONSTRAINT "candidate_languages_profile_id_language_code_pk" PRIMARY KEY("profile_id","language_code")
);
--> statement-breakpoint
ALTER TABLE "candidate_languages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"headline" text,
	"about" text,
	"location_city" text,
	"location_country" text,
	"open_to_relocation" boolean DEFAULT false NOT NULL,
	"job_search_status" "job_search_status",
	"available_from" "availability",
	"seniority" "seniority",
	"work_modes" "work_mode"[] DEFAULT '{}' NOT NULL,
	"employment_types" "employment_type"[] DEFAULT '{}' NOT NULL,
	"salary_min" integer,
	"salary_currency" text,
	"work_authorization" text,
	"linkedin_url" text,
	"github_url" text,
	"portfolio_url" text,
	"hidden_company_domains" text[] DEFAULT '{}' NOT NULL,
	"no_experience" boolean DEFAULT false NOT NULL,
	"resume_path" text,
	"resume_uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "about_length" CHECK (char_length("candidate_profiles"."about") <= 2000),
	CONSTRAINT "salary_min_positive" CHECK ("candidate_profiles"."salary_min" >= 0)
);
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "candidate_roles" (
	"profile_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "candidate_roles_profile_id_role_id_pk" PRIMARY KEY("profile_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "candidate_skills" (
	"profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"level" "skill_level",
	"years" smallint,
	CONSTRAINT "candidate_skills_profile_id_skill_id_pk" PRIMARY KEY("profile_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "educations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"degree" text,
	"field_of_study" text,
	"start_year" smallint,
	"end_year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_years" CHECK ("educations"."end_year" is null or "educations"."start_year" is null or "educations"."end_year" >= "educations"."start_year")
);
--> statement-breakpoint
ALTER TABLE "educations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"company_domain" text,
	"title" text NOT NULL,
	"employment_type" "employment_type",
	"location" text,
	"is_remote" boolean DEFAULT false NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experience_dates" CHECK ("experiences"."end_date" is null or "experiences"."end_date" >= "experiences"."start_date")
);
--> statement-breakpoint
ALTER TABLE "experiences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_roles" ADD CONSTRAINT "candidate_roles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_roles" ADD CONSTRAINT "candidate_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educations" ADD CONSTRAINT "educations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_roles_role_id_idx" ON "candidate_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "candidate_skills_skill_id_idx" ON "candidate_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "certifications_profile_id_idx" ON "certifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "educations_profile_id_idx" ON "educations" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "experiences_profile_id_idx" ON "experiences" USING btree ("profile_id");--> statement-breakpoint
CREATE POLICY "Candidates can read their own languages" ON "candidate_languages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own candidate profile" ON "candidate_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own roles" ON "candidate_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own skills" ON "candidate_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own certifications" ON "certifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own educations" ON "educations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Candidates can read their own experiences" ON "experiences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Signed-in users can read roles" ON "roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Signed-in users can read skills" ON "skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);