// Supabase's shared pooler (Supavisor) has two modes on one host: transaction mode on 6543, for
// serverless (Vercel), and session mode on 5432, for long-running servers. `next dev` is a long-running
// server, and through transaction mode its queries sometimes stalled half-sent, hanging every page
// that used that connection. So in development the app uses session mode.
const SUPAVISOR_HOST = /\.pooler\.supabase\.com$/;

export function databaseUrl(url: string, nodeEnv = process.env.NODE_ENV): string {
  if (nodeEnv !== "development") return url;
  const parsed = new URL(url);
  if (!SUPAVISOR_HOST.test(parsed.hostname) || parsed.port !== "6543") return url;
  parsed.port = "5432";
  return parsed.toString();
}
