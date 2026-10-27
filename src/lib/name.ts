import { z } from "zod";

// A person's first and last name, as sign-up, /welcome and settings ask for them.
const namePart = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}`).max(50, `Use at most 50 characters`);

export const nameSchema = z.object({
  firstName: namePart("first name"),
  lastName: namePart("last name"),
});
export type Name = z.infer<typeof nameSchema>;

type Named = { firstName?: string | null; lastName?: string | null; fullName?: string | null; email: string };

// "Ana Maria Petrova" → first "Ana", last "Maria Petrova". For names that only came as one string.
export function splitFullName(fullName: string | null | undefined): { firstName: string | null; lastName: string | null } {
  const [first, ...rest] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: first ?? null, lastName: rest.join(" ") || null };
}

export const joinName = ({ firstName, lastName }: Name) => `${firstName} ${lastName}`;

// The user's name as the name form starts with it: the stored parts, else what full_name gives.
export function nameOf(user: Omit<Named, "email">): Name {
  const split = splitFullName(user.fullName);
  return { firstName: user.firstName ?? split.firstName ?? "", lastName: user.lastName ?? split.lastName ?? "" };
}

export const hasName = (user: Pick<Named, "firstName" | "lastName">) => Boolean(user.firstName && user.lastName);

// What to call the user: their first name, or what's known of it.
export function firstNameOf(user: Omit<Named, "email">): string | null {
  return user.firstName || splitFullName(user.fullName).firstName;
}

// The name shown for the user's account, falling back to their email.
export function displayName(user: Named): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.fullName?.trim() || user.email;
}

// One or two letters for an avatar circle: first and last word of the name, or the email's first letter.
export function initials(user: Named): string {
  const name = displayName(user);
  if (name === user.email) return name.charAt(0).toUpperCase();
  const words = name.split(/\s+/);
  return (words[0]!.charAt(0) + (words.length > 1 ? words.at(-1)!.charAt(0) : "")).toUpperCase();
}
