import freeEmailDomains from "free-email-domains";

const FREE_DOMAINS = new Set(freeEmailDomains);

// The lowercase domain of an email address, e.g. "Ana@Acme.COM" → "acme.com".
export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
}

// Personal and disposable addresses (gmail.com, yahoo.com, …) can't stand for a company.
export function isWorkEmail(email: string): boolean {
  const domain = emailDomain(email);
  return domain.includes(".") && !FREE_DOMAINS.has(domain);
}

// A starting name for a new company: "acme-labs.co.uk" → "Acme Labs". Employers can rename it later.
export function companyNameFromDomain(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}
