// The lowercase domain of an email address, e.g. "Ana@Acme.COM" → "acme.com".
export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
}
