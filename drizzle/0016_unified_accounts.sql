-- One kind of account: anyone can look for a job and hire. Hiring rights come from company_members, not
-- from the profile. `default_view` only picks the landing dashboard; null until the user answers
-- "What do you want to do first?" after their first sign-in. Existing users keep the side they signed up on.
CREATE TYPE "public"."app_view" AS ENUM('candidate', 'employer');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "default_view" "app_view";--> statement-breakpoint
UPDATE "profiles" SET "default_view" = "type"::text::"public"."app_view";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."profile_type";--> statement-breakpoint
-- 0005 locked the type; the preference is the user's own to change.
GRANT UPDATE ("default_view") ON "profiles" TO "authenticated";
