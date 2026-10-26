// Every seeded account and company lives under this reserved domain, so the seed can wipe exactly its
// own rows, and seeded and real accounts never see each other in matching.
export const SEED_DOMAIN = "seed.test";

export function isSeedDomain(domain: string) {
  const d = domain.toLowerCase();
  return d === SEED_DOMAIN || d.endsWith(`.${SEED_DOMAIN}`);
}

export function isSeedEmail(email: string) {
  return isSeedDomain(email.slice(email.lastIndexOf("@") + 1));
}
