// Dummy candidates, companies and jobs for local testing, and the AI matches and swipes between them.
// Pure data, so `scripts/seed.mts` can load it with plain Node. Imports carry `.ts` for the same reason.
import { normalizeSlug } from "../candidate/slug.ts";
import { SEED_DOMAIN } from "./domain.ts";

// Mirrors SKILL_COVERAGE_THRESHOLD in lib/matching/prompt.ts; a test keeps the two in sync.
export const SEED_COVERAGE_THRESHOLD = 75;

type WorkMode = "onsite" | "hybrid" | "remote";

export type SeedCandidate = {
  key: string;
  email: string;
  fullName: string;
  headline: string;
  about: string;
  locationCity: string;
  locationCountry: string;
  seniority: "junior" | "mid" | "senior";
  workModes: WorkMode[];
  openToRelocation?: boolean;
  salaryMin?: number;
  skills: string[];
  role: string;
  experiences: { companyName: string; title: string; startDate: string; endDate?: string; description: string }[];
  education?: { institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number };
  languages: { code: string; proficiency: "basic" | "conversational" | "professional" | "native" }[];
};

export type SeedJob = {
  key: string;
  title: string;
  description: string;
  seniority: "junior" | "mid" | "senior";
  employmentType: "full_time" | "contract";
  workMode: WorkMode;
  locationCity?: string;
  locationCountry?: string;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  status: "draft" | "open" | "closed";
};

export type SeedEmployer = { email: string; fullName: string; role: "owner" | "admin" | "recruiter" };

export type SeedCompany = {
  domain: string;
  name: string;
  status: "approved" | "needs_review";
  vettingReason: string;
  employers: SeedEmployer[];
  jobs: SeedJob[];
};

// Listed in ADMIN_USER_IDS by scripts/db.mts for the local database, so it can open /admin. A fixed id,
// so the env can name it before the user exists.
export const SEED_ADMIN = {
  id: "00000000-0000-4000-8000-5eed0000ad01",
  email: `admin@${SEED_DOMAIN}`,
  fullName: "Seed Admin",
};

// Whether ADMIN_USER_IDS (comma-separated, as isAdmin in lib/auth reads it) lists SEED_ADMIN.
export function listsSeedAdmin(adminUserIds = process.env.ADMIN_USER_IDS ?? "") {
  return adminUserIds
    .split(",")
    .map((id) => id.trim())
    .includes(SEED_ADMIN.id);
}

const candidate = (c: Omit<SeedCandidate, "email">): SeedCandidate => ({ ...c, email: `${c.key}@${SEED_DOMAIN}` });

// Hand-written profiles, with the stories the swipes below rely on.
const FEATURED: SeedCandidate[] = [
  candidate({
    key: "ana.petrova",
    fullName: "Ana Petrova",
    headline: "Senior backend engineer",
    about: "Eight years building APIs and data pipelines in TypeScript and Node.js. I like boring, reliable systems.",
    locationCity: "Sofia",
    locationCountry: "BG",
    seniority: "senior",
    workModes: ["remote", "hybrid"],
    salaryMin: 55000,
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "React", "AWS"],
    role: "Backend Engineer",
    experiences: [
      {
        companyName: "Telerik",
        title: "Senior Backend Engineer",
        startDate: "2021-03-01",
        description: "Led the billing API rewrite; cut p95 latency by 60%.",
      },
      {
        companyName: "Payhawk",
        title: "Backend Engineer",
        startDate: "2017-06-01",
        endDate: "2021-02-01",
        description: "Built card-transaction ingestion on PostgreSQL and Kafka.",
      },
    ],
    education: { institution: "Sofia University", degree: "BSc", fieldOfStudy: "Computer Science", startYear: 2013, endYear: 2017 },
    languages: [
      { code: "bg", proficiency: "native" },
      { code: "en", proficiency: "professional" },
    ],
  }),
  candidate({
    key: "jonas.weber",
    fullName: "Jonas Weber",
    headline: "Frontend engineer",
    about: "React and Next.js developer who cares about accessibility and fast pages.",
    locationCity: "Berlin",
    locationCountry: "DE",
    seniority: "mid",
    workModes: ["remote"],
    salaryMin: 50000,
    skills: ["React", "TypeScript", "Next.js", "CSS", "Figma"],
    role: "Frontend Engineer",
    experiences: [
      {
        companyName: "Zalando",
        title: "Frontend Engineer",
        startDate: "2020-09-01",
        description: "Shipped the checkout redesign in Next.js.",
      },
    ],
    languages: [
      { code: "de", proficiency: "native" },
      { code: "en", proficiency: "professional" },
    ],
  }),
  candidate({
    key: "maria.ivanova",
    fullName: "Maria Ivanova",
    headline: "Data analyst",
    about: "I turn messy sales data into dashboards people actually use.",
    locationCity: "Sofia",
    locationCountry: "BG",
    seniority: "mid",
    workModes: ["hybrid", "onsite"],
    salaryMin: 28000,
    skills: ["SQL", "Python", "Power BI", "Excel"],
    role: "Data Analyst",
    experiences: [
      {
        companyName: "Kaufland Bulgaria",
        title: "Data Analyst",
        startDate: "2022-01-01",
        description: "Owned weekly sales reporting for 60 stores.",
      },
    ],
    languages: [
      { code: "bg", proficiency: "native" },
      { code: "en", proficiency: "conversational" },
    ],
  }),
  candidate({
    key: "liam.oconnor",
    fullName: "Liam O'Connor",
    headline: "DevOps engineer",
    about: "Kubernetes, Terraform and on-call that doesn't wake anyone up.",
    locationCity: "Dublin",
    locationCountry: "IE",
    seniority: "senior",
    workModes: ["remote"],
    salaryMin: 70000,
    skills: ["Kubernetes", "Terraform", "AWS", "Docker", "Go"],
    role: "DevOps Engineer",
    experiences: [
      {
        companyName: "Intercom",
        title: "Site Reliability Engineer",
        startDate: "2019-04-01",
        description: "Moved 40 services onto EKS with Terraform.",
      },
    ],
    languages: [{ code: "en", proficiency: "native" }],
  }),
  candidate({
    key: "elena.georgieva",
    fullName: "Elena Georgieva",
    headline: "Junior frontend developer",
    about: "Fresh graduate. Built three React side projects and loved every bug.",
    locationCity: "Sofia",
    locationCountry: "BG",
    seniority: "junior",
    workModes: ["onsite", "hybrid", "remote"],
    skills: ["React", "JavaScript", "HTML", "CSS"],
    role: "Frontend Engineer",
    experiences: [],
    education: { institution: "Technical University of Sofia", degree: "BSc", fieldOfStudy: "Informatics", startYear: 2022, endYear: 2026 },
    languages: [
      { code: "bg", proficiency: "native" },
      { code: "en", proficiency: "professional" },
    ],
  }),
  candidate({
    key: "nikolai.dimitrov",
    fullName: "Nikolai Dimitrov",
    headline: "Product designer",
    about: "I design B2B tools: research first, then prototypes, then pixels.",
    locationCity: "Varna",
    locationCountry: "BG",
    seniority: "mid",
    workModes: ["remote"],
    skills: ["Figma", "UX research", "Prototyping"],
    role: "Product Designer",
    experiences: [
      {
        companyName: "Shelly",
        title: "Product Designer",
        startDate: "2021-05-01",
        description: "Designed the device setup flow used by a million homes.",
      },
    ],
    languages: [
      { code: "bg", proficiency: "native" },
      { code: "en", proficiency: "professional" },
    ],
  }),
];

const NATIVE: Record<string, string> = { BG: "bg", DE: "de", RO: "ro", CZ: "cs", ES: "es", NL: "nl", PL: "pl", SE: "sv", HR: "hr", FR: "fr" };

// More candidates, so every live job has several people in its deck. Each one has all the skills of
// the jobs it should match (coverage must be over 75%), so these are written tersely.
function extra(
  key: string,
  fullName: string,
  headline: string,
  [locationCity, locationCountry]: [string, string],
  seniority: SeedCandidate["seniority"],
  workModes: WorkMode[],
  skills: string[],
  role: string,
  more: Partial<SeedCandidate> = {},
): SeedCandidate {
  const [first, second] = skills;
  return candidate({
    key,
    fullName,
    headline,
    about: `${headline} working mostly with ${first} and ${second}. Looking for a team that ships often.`,
    locationCity,
    locationCountry,
    seniority,
    workModes,
    skills,
    role,
    experiences:
      seniority === "junior"
        ? []
        : [{ companyName: `${locationCity} Software`, title: headline, startDate: "2021-01-01", description: `Day-to-day ${first} and ${second}.` }],
    education:
      seniority === "junior"
        ? { institution: `University of ${locationCity}`, degree: "BSc", fieldOfStudy: "Computer Science", startYear: 2022, endYear: 2026 }
        : undefined,
    languages: [
      { code: NATIVE[locationCountry] ?? "en", proficiency: "native" },
      { code: "en", proficiency: "professional" },
    ],
    ...more,
  });
}

const BACKEND = ["TypeScript", "Node.js", "PostgreSQL", "Docker"];
const DEVOPS = ["Kubernetes", "Terraform", "AWS", "Docker"];
const DESIGN = ["Figma", "UX research", "Prototyping"];
const JUNIOR_FRONTEND = ["React", "JavaScript", "HTML", "CSS"];
const ANALYST = ["SQL", "Python", "Power BI"];

const MORE: SeedCandidate[] = [
  // Backend and full-stack (Northwind backend, Copperleaf full-stack).
  extra("dimitar.kolev", "Dimitar Kolev", "Senior full-stack engineer", ["Sofia", "BG"], "senior", ["remote"], [...BACKEND, "React"], "Full-stack Engineer", { salaryMin: 60000 }),
  extra("sofia.marin", "Sofia Marin", "Backend engineer", ["Bucharest", "RO"], "mid", ["remote", "hybrid"], [...BACKEND, "Redis"], "Backend Engineer"),
  extra("tomas.novak", "Tomas Novak", "Senior software engineer", ["Prague", "CZ"], "senior", ["remote"], [...BACKEND, "React", "GraphQL"], "Full-stack Engineer", { salaryMin: 65000 }),
  extra("lucia.garcia", "Lucia Garcia", "Full-stack developer", ["Madrid", "ES"], "mid", ["remote"], ["TypeScript", "React", "Node.js", "PostgreSQL", "Next.js", "CSS"], "Full-stack Engineer"),
  // Frontend (Northwind frontend; Lucia above fits too).
  extra("mila.stoyanova", "Mila Stoyanova", "Frontend developer", ["Sofia", "BG"], "mid", ["remote", "hybrid"], ["React", "TypeScript", "Next.js", "CSS", "JavaScript", "HTML"], "Frontend Engineer"),
  extra("pieter.devries", "Pieter de Vries", "Senior frontend engineer", ["Amsterdam", "NL"], "senior", ["remote"], ["React", "TypeScript", "Next.js", "CSS", "Storybook"], "Frontend Engineer", { salaryMin: 62000 }),
  // DevOps (Northwind DevOps).
  extra("ivan.petkov", "Ivan Petkov", "Platform engineer", ["Plovdiv", "BG"], "senior", ["remote"], [...DEVOPS, "Linux"], "DevOps Engineer"),
  extra("anna.kowalska", "Anna Kowalska", "Cloud engineer", ["Warsaw", "PL"], "mid", ["remote"], [...DEVOPS, "Python"], "DevOps Engineer", { salaryMin: 55000 }),
  extra("erik.lindqvist", "Erik Lindqvist", "Senior SRE", ["Stockholm", "SE"], "senior", ["remote"], [...DEVOPS, "Go"], "DevOps Engineer", { salaryMin: 80000 }),
  // Data (Bluefin analyst: hybrid in Sofia, so Bulgarians or people who'd relocate).
  extra("georgi.todorov", "Georgi Todorov", "Junior data analyst", ["Sofia", "BG"], "junior", ["hybrid"], [...ANALYST, "Excel"], "Data Analyst", { salaryMin: 25000 }),
  extra("radostina.ilieva", "Radostina Ilieva", "BI analyst", ["Sofia", "BG"], "mid", ["hybrid", "onsite"], [...ANALYST, "Tableau"], "Data Analyst", { salaryMin: 32000 }),
  extra("marek.horvat", "Marek Horvat", "Data analyst", ["Zagreb", "HR"], "mid", ["hybrid", "remote"], ANALYST, "Data Analyst", { openToRelocation: true }),
  // Junior frontend (Bluefin: hybrid in Sofia; Mila above fits too).
  extra("viktor.angelov", "Viktor Angelov", "Junior frontend developer", ["Sofia", "BG"], "junior", ["hybrid", "onsite"], JUNIOR_FRONTEND, "Frontend Engineer"),
  extra("teodora.vasileva", "Teodora Vasileva", "Junior web developer", ["Varna", "BG"], "junior", ["hybrid", "remote"], [...JUNIOR_FRONTEND, "Figma"], "Frontend Engineer"),
  // Design (Bluefin designer).
  extra("chloe.martin", "Chloe Martin", "Product designer", ["Lyon", "FR"], "mid", ["remote"], [...DESIGN, "User testing"], "Product Designer"),
  extra("boris.nikolov", "Boris Nikolov", "Senior product designer", ["Sofia", "BG"], "senior", ["remote", "hybrid"], [...DESIGN, "Design systems"], "Product Designer", { salaryMin: 50000 }),
  extra("julia.schmidt", "Julia Schmidt", "UX designer", ["Munich", "DE"], "mid", ["remote"], DESIGN, "Product Designer"),
];

export const CANDIDATES: SeedCandidate[] = [...FEATURED, ...MORE];

const employer = (name: string, domain: string, role: SeedEmployer["role"] = "owner"): SeedEmployer => ({
  email: `${name.split(" ")[0]!.toLowerCase()}@${domain}`,
  fullName: name,
  role,
});

const NORTHWIND = `northwind.${SEED_DOMAIN}`;
const BLUEFIN = `bluefin.${SEED_DOMAIN}`;
const COPPERLEAF = `copperleaf.${SEED_DOMAIN}`;
const SHADY = `quickcash.${SEED_DOMAIN}`;

export const COMPANIES: SeedCompany[] = [
  {
    domain: NORTHWIND,
    name: "Northwind Labs",
    status: "approved",
    vettingReason: "Seeded: an established software consultancy.",
    employers: [employer("Olivia Hart", NORTHWIND), employer("Sam Reed", NORTHWIND, "recruiter")],
    jobs: [
      {
        key: "northwind-backend",
        title: "Senior Backend Engineer",
        description: "Own our TypeScript APIs end to end: design, build, run. Small team, real ownership.",
        seniority: "senior",
        employmentType: "full_time",
        workMode: "remote",
        salaryMin: 60000,
        salaryMax: 80000,
        skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker"],
        status: "open",
      },
      {
        key: "northwind-frontend",
        title: "Frontend Engineer",
        description: "Build fast, accessible React screens for our clients' products.",
        seniority: "mid",
        employmentType: "full_time",
        workMode: "remote",
        salaryMin: 50000,
        salaryMax: 65000,
        skills: ["React", "TypeScript", "Next.js", "CSS"],
        status: "open",
      },
      {
        key: "northwind-devops",
        title: "DevOps Engineer",
        description: "Run our Kubernetes platform on AWS and keep deploys boring.",
        seniority: "senior",
        employmentType: "contract",
        workMode: "remote",
        salaryMin: 70000,
        salaryMax: 90000,
        skills: ["Kubernetes", "Terraform", "AWS", "Docker"],
        status: "open",
      },
    ],
  },
  {
    domain: BLUEFIN,
    name: "Bluefin Health",
    status: "approved",
    vettingReason: "Seeded: a digital health clinic network.",
    employers: [employer("Priya Shah", BLUEFIN)],
    jobs: [
      {
        key: "bluefin-analyst",
        title: "Data Analyst",
        description: "Help our clinics understand patient flow with SQL and Power BI.",
        seniority: "mid",
        employmentType: "full_time",
        workMode: "hybrid",
        locationCity: "Sofia",
        locationCountry: "BG",
        salaryMin: 28000,
        salaryMax: 38000,
        skills: ["SQL", "Python", "Power BI"],
        status: "open",
      },
      {
        key: "bluefin-junior-frontend",
        title: "Junior Frontend Developer",
        description: "Learn from senior engineers while building our patient booking app in React.",
        seniority: "junior",
        employmentType: "full_time",
        workMode: "hybrid",
        locationCity: "Sofia",
        locationCountry: "BG",
        salaryMin: 20000,
        salaryMax: 30000,
        skills: ["React", "JavaScript", "HTML", "CSS"],
        status: "open",
      },
      {
        key: "bluefin-designer",
        title: "Product Designer",
        description: "Design calm, clear tools for doctors and nurses.",
        seniority: "mid",
        employmentType: "full_time",
        workMode: "remote",
        salaryMin: 40000,
        salaryMax: 55000,
        skills: ["Figma", "UX research", "Prototyping"],
        status: "open",
      },
    ],
  },
  {
    domain: COPPERLEAF,
    name: "Copperleaf Retail",
    status: "approved",
    vettingReason: "Seeded: an online furniture retailer.",
    employers: [employer("Marco Rossi", COPPERLEAF)],
    jobs: [
      {
        key: "copperleaf-fullstack",
        title: "Full-stack Engineer",
        description: "Ship features across our React storefront and Node.js backend.",
        seniority: "senior",
        employmentType: "full_time",
        workMode: "remote",
        salaryMin: 55000,
        salaryMax: 70000,
        skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
        status: "open",
      },
      {
        key: "copperleaf-platform",
        title: "Platform Engineer",
        description: "Draft: still working out the details.",
        seniority: "senior",
        employmentType: "full_time",
        workMode: "remote",
        salaryMin: 60000,
        salaryMax: 75000,
        skills: ["Go", "Kubernetes", "AWS"],
        status: "draft",
      },
      {
        key: "copperleaf-store-analyst",
        title: "Store Analyst",
        description: "This role has been filled.",
        seniority: "mid",
        employmentType: "full_time",
        workMode: "onsite",
        locationCity: "Plovdiv",
        locationCountry: "BG",
        salaryMin: 25000,
        salaryMax: 32000,
        skills: ["SQL", "Excel"],
        status: "closed",
      },
    ],
  },
  {
    domain: SHADY,
    name: "QuickCash Jobs",
    status: "needs_review",
    vettingReason: "Seeded: the homepage promises earnings for an upfront fee; check it by hand.",
    employers: [employer("Vic Grey", SHADY)],
    jobs: [
      {
        key: "quickcash-agent",
        title: "Remote Sales Agent",
        description: "Earn from home! Starter kit required.",
        seniority: "junior",
        employmentType: "contract",
        workMode: "remote",
        salaryMin: 10000,
        salaryMax: 90000,
        skills: ["Excel"],
        status: "open",
      },
    ],
  },
];

export type SeedMatch = {
  jobKey: string;
  candidateKey: string;
  score: number;
  skillCoverage: number;
  matchedSkills: string[];
  candidateReason: string;
  employerReason: string;
};

const listNames = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]!;

// The hard filters of `pairFits` in lib/matching/queries.ts, for the pairs the seed scores.
export function seedPairFits(job: SeedJob, c: SeedCandidate) {
  return (
    c.workModes.includes(job.workMode) &&
    (!job.locationCountry ||
      job.locationCountry === c.locationCountry ||
      (job.workMode !== "remote" && Boolean(c.openToRelocation))) &&
    (c.salaryMin === undefined || job.salaryMax >= c.salaryMin)
  );
}

// What the AI would have scored: every open job of an approved company against every candidate it fits,
// kept when enough of the job's skills are in the profile. Skills compare by slug, as the catalog does.
export function seedMatches(companies = COMPANIES, candidates = CANDIDATES): SeedMatch[] {
  const matches: SeedMatch[] = [];
  for (const job of companies.filter((c) => c.status === "approved").flatMap((c) => c.jobs)) {
    if (job.status !== "open") continue;
    for (const c of candidates) {
      if (!seedPairFits(job, c)) continue;
      const has = new Set(c.skills.map(normalizeSlug));
      const matchedSkills = job.skills.filter((s) => has.has(normalizeSlug(s)));
      const skillCoverage = Math.round((100 * matchedSkills.length) / job.skills.length);
      if (skillCoverage <= SEED_COVERAGE_THRESHOLD) continue;
      const skillsText = listNames(matchedSkills);
      matches.push({
        jobKey: job.key,
        candidateKey: c.key,
        // Varies a little per pair, so decks have an order.
        score: Math.min(98, 60 + Math.round(skillCoverage / 4) + (c.key.length % 7)),
        skillCoverage,
        matchedSkills,
        candidateReason: `Your ${skillsText} experience fits this ${job.title} role.`,
        employerReason: `${c.headline} with ${skillsText}.`,
      });
    }
  }
  return matches;
}

// Likes already made: Ana and Northwind liked each other (a mutual match), and Bluefin liked Maria,
// who hasn't decided yet. Everyone else starts with a full deck.
export const SWIPES = {
  candidate: [{ candidateKey: "ana.petrova", jobKey: "northwind-backend", liked: true }],
  employer: [
    { candidateKey: "ana.petrova", jobKey: "northwind-backend", liked: true },
    { candidateKey: "maria.ivanova", jobKey: "bluefin-analyst", liked: true },
  ],
};

export const SEED_SKILLS = [
  ...new Set([...CANDIDATES.flatMap((c) => c.skills), ...COMPANIES.flatMap((c) => c.jobs.flatMap((j) => j.skills))]),
];
export const SEED_ROLES = [...new Set(CANDIDATES.map((c) => c.role))];
