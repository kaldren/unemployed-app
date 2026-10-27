-- First and last name, asked at sign-up. Existing users get theirs from full_name: the first word is the
-- first name, the rest the last name. Users without a full_name are asked on /welcome or in settings.
ALTER TABLE "profiles" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_name" text;--> statement-breakpoint
UPDATE "profiles"
SET "first_name" = split_part(btrim("full_name"), ' ', 1),
    "last_name" = nullif(btrim(substr(btrim("full_name"), length(split_part(btrim("full_name"), ' ', 1)) + 1)), '')
WHERE nullif(btrim("full_name"), '') IS NOT NULL;
