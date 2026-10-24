CREATE TYPE "public"."company_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('pending', 'approved', 'needs_review', 'rejected');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"status" "company_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_domain_unique" UNIQUE("domain"),
	CONSTRAINT "domain_lowercase" CHECK ("companies"."domain" = lower("companies"."domain"))
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_members" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"role" "company_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_members_company_id_idx" ON "company_members" USING btree ("company_id");--> statement-breakpoint
CREATE POLICY "Members can read their company" ON "companies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from company_members m where m.company_id = "companies"."id" and m.profile_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "Employers can read their own membership" ON "company_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);