export const SITE_NAME = "Unemployed";
export const SITE_TAGLINE = "Find jobs where both sides say yes.";

// Where users reach us: legal pages, a refused company. Set NEXT_PUBLIC_CONTACT_EMAIL before launch.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com";

// Who runs the service, named in the privacy policy and terms. Set NEXT_PUBLIC_OPERATOR_NAME before launch.
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || SITE_NAME;
