import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

// Browser client: auth only. The browser never queries tables directly.
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
