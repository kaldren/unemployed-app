-- Employer accounts: any email signs up, creates a company and owns it. Roles become owner | admin | recruiter
-- ("member" → "recruiter"). A company is verified by a link sent to an address on its domain.
-- Enum values added in a transaction can't be used in it, so the type is rebuilt instead.
ALTER TYPE "public"."company_role" RENAME TO "company_role_old";--> statement-breakpoint
CREATE TYPE "public"."company_role" AS ENUM('owner', 'admin', 'recruiter');--> statement-breakpoint
ALTER TABLE "company_members" ALTER COLUMN "role" SET DATA TYPE "public"."company_role" USING (CASE "role"::text WHEN 'member' THEN 'recruiter' ELSE "role"::text END)::"public"."company_role";--> statement-breakpoint
DROP TYPE "public"."company_role_old";--> statement-breakpoint
CREATE TABLE "company_domain_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"requested_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_domain_verifications_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "company_domain_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "company_role" NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_invites_company_email_unique" UNIQUE("company_id","email"),
	CONSTRAINT "company_invite_email_lowercase" CHECK ("company_invites"."email" = lower("company_invites"."email")),
	CONSTRAINT "company_invite_not_owner" CHECK ("company_invites"."role" <> 'owner')
);
--> statement-breakpoint
ALTER TABLE "company_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "companies_domain_unique";--> statement-breakpoint
-- A user may now belong to several companies: one row per (company, user).
DROP INDEX "company_members_company_id_idx";--> statement-breakpoint
ALTER TABLE "company_members" DROP CONSTRAINT "company_members_pkey";--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_profile_id_pk" PRIMARY KEY("company_id","profile_id");--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
-- Existing companies were created by work-email sign-in, which already proved the domain.
UPDATE "companies" SET "verified_at" = "created_at";--> statement-breakpoint
ALTER TABLE "company_domain_verifications" ADD CONSTRAINT "company_domain_verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_domain_verifications" ADD CONSTRAINT "company_domain_verifications_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_domain_verifications_company_id_idx" ON "company_domain_verifications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_invites_email_idx" ON "company_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_verified_domain_unique" ON "companies" USING btree ("domain") WHERE "companies"."verified_at" is not null;--> statement-breakpoint
CREATE INDEX "company_members_profile_id_idx" ON "company_members" USING btree ("profile_id");--> statement-breakpoint
-- Policy helper: does the signed-in user hold one of `roles` in `company`? Security definer so
-- company_members policies can read company_members; in `private`, which the Data API doesn't expose.
CREATE SCHEMA IF NOT EXISTS "private";--> statement-breakpoint
CREATE FUNCTION "private"."has_company_role"(company uuid, roles "public"."company_role"[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = company AND m.profile_id = (SELECT auth.uid()) AND m.role = ANY (roles)
  )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "private"."has_company_role"(uuid, "public"."company_role"[]) FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA "private" TO "authenticated";--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "private"."has_company_role"(uuid, "public"."company_role"[]) TO "authenticated";--> statement-breakpoint
-- Profiles are public, but vetting notes aren't; members may edit only the profile fields.
REVOKE SELECT, UPDATE ON "companies" FROM "anon", "authenticated";--> statement-breakpoint
GRANT SELECT ("id", "domain", "name", "website", "logo_url", "description", "verified_at", "created_at") ON "companies" TO "anon", "authenticated";--> statement-breakpoint
GRANT UPDATE ("name", "website", "logo_url", "description") ON "companies" TO "authenticated";--> statement-breakpoint
-- Only verified companies can publish: a job may become `open` only when its company is verified.
CREATE FUNCTION "private"."jobs_require_verified_company"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'open' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'open') AND NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = NEW.company_id AND c.verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Only verified companies can publish jobs' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "jobs_require_verified_company" BEFORE INSERT OR UPDATE OF "status", "company_id" ON "jobs"
FOR EACH ROW EXECUTE FUNCTION "private"."jobs_require_verified_company"();--> statement-breakpoint
DROP POLICY "Members can read their company" ON "companies" CASCADE;--> statement-breakpoint
DROP POLICY "Employers can read their own membership" ON "company_members" CASCADE;--> statement-breakpoint
CREATE POLICY "Company profiles are public" ON "companies" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Owners and admins can update their company" ON "companies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_company_role("companies"."id", '{owner,admin}'::public.company_role[])) WITH CHECK (private.has_company_role("companies"."id", '{owner,admin}'::public.company_role[]));--> statement-breakpoint
CREATE POLICY "Owners can delete their company" ON "companies" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_company_role("companies"."id", '{owner}'::public.company_role[]));--> statement-breakpoint
CREATE POLICY "Members can read their teammates" ON "company_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.has_company_role("company_members"."company_id", '{owner,admin,recruiter}'::public.company_role[]));--> statement-breakpoint
CREATE POLICY "Owners and admins can add members" ON "company_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.has_company_role("company_members"."company_id", '{owner,admin}'::public.company_role[]) and "company_members"."role" <> 'owner');--> statement-breakpoint
CREATE POLICY "Owners and admins can change roles" ON "company_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_company_role("company_members"."company_id", '{owner,admin}'::public.company_role[]) and "company_members"."role" <> 'owner') WITH CHECK (private.has_company_role("company_members"."company_id", '{owner,admin}'::public.company_role[]) and "company_members"."role" <> 'owner');--> statement-breakpoint
CREATE POLICY "Owners and admins can remove members" ON "company_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_company_role("company_members"."company_id", '{owner,admin}'::public.company_role[]) and "company_members"."role" <> 'owner');--> statement-breakpoint
CREATE POLICY "Owners and admins manage invites" ON "company_invites" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.has_company_role("company_invites"."company_id", '{owner,admin}'::public.company_role[])) WITH CHECK (private.has_company_role("company_invites"."company_id", '{owner,admin}'::public.company_role[]));--> statement-breakpoint
CREATE POLICY "Invitees can read their invites" ON "company_invites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("company_invites"."email" = lower((select auth.jwt() ->> 'email')));