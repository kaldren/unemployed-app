-- The profile type decides the portal and is set only in /auth/callback, so users may update just these columns.
REVOKE UPDATE ON "profiles" FROM "authenticated";--> statement-breakpoint
GRANT UPDATE ("full_name", "avatar_url") ON "profiles" TO "authenticated";
