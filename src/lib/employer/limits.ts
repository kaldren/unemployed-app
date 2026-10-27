// Company limits and roles, shared by server schemas and client forms (kept free of server-only imports).
export const COMPANY_NAME_MAX = 100;
export const COMPANY_DESCRIPTION_MAX = 2000;
export const URL_MAX = 300;

// Roles a teammate can be given; there's exactly one owner, the company's creator.
export const ASSIGNABLE_ROLES = { admin: "Admin", recruiter: "Recruiter" } as const;
export const ROLE_LABELS = { owner: "Owner", ...ASSIGNABLE_ROLES } as const;
export type AssignableRole = keyof typeof ASSIGNABLE_ROLES;
export type Role = keyof typeof ROLE_LABELS;

export const canManageCompany = (role: Role) => role === "owner" || role === "admin";
