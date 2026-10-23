import { createBrowserClient } from "@supabase/ssr";

// Browser client: auth only. The browser never queries tables directly.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
