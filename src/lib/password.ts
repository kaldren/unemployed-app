import { z } from "zod";

// Supabase checks its own minimum too (Auth → Providers → Email; `minimum_password_length` locally).
// Keep them in step. Its own module so client forms don't bundle the free-mail domain list.
export const PASSWORD_MIN = 8;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(72, "Use at most 72 characters");
