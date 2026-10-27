import freeEmailDomains from "free-email-domains";
import { z } from "zod";
import { blankAsNull } from "@/lib/candidate/schemas";
import { COMPANY_DESCRIPTION_MAX, COMPANY_NAME_MAX, URL_MAX } from "./limits";
import { emailDomain } from "./work-email";

const FREE_DOMAINS = new Set(freeEmailDomains);

export * from "./limits";

// "https://www.Acme.com/about" or "acme.com" → "acme.com". Null when it isn't a public hostname.
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host) return null;
  try {
    host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "").replace(/\.$/, "");
  const labels = host.split(".");
  const validLabel = (label: string) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  // Needs a dot and a letter TLD, which also rules out IP addresses.
  if (labels.length < 2 || !labels.every(validLabel) || !/^[a-z]{2,}$/.test(labels.at(-1)!)) return null;
  return host;
}

// Free-mail domains (gmail.com, …) belong to everyone, so no company can claim or verify them.
export const isFreeMailDomain = (domain: string) => FREE_DOMAINS.has(domain);

// Verification needs an address exactly on the company's domain, not a subdomain.
export const isEmailOnDomain = (email: string, domain: string) => emailDomain(email) === domain;

const url = blankAsNull(
  z
    .string()
    .trim()
    .max(URL_MAX)
    .pipe(z.url({ protocol: /^https?$/, error: "Enter a full link, starting with https://" })),
);

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter the company name").max(COMPANY_NAME_MAX),
  website: url,
  logoUrl: url,
  description: blankAsNull(z.string().trim().max(COMPANY_DESCRIPTION_MAX, `Keep it under ${COMPANY_DESCRIPTION_MAX} characters`)),
});

const domain = z
  .string()
  .transform((value, ctx) => {
    const normalized = normalizeDomain(value);
    if (!normalized) ctx.addIssue({ code: "custom", message: "Enter your company's domain, like acme.com" });
    else if (isFreeMailDomain(normalized)) ctx.addIssue({ code: "custom", message: "Use your company's own domain, not a free email provider" });
    return normalized ?? "";
  });

export const newCompanySchema = companyProfileSchema.extend({ domain });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address" }));

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "recruiter"], { error: "Pick a role" }),
});
