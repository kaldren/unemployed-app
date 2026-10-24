import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  candidateLanguages,
  candidateProfiles,
  candidateRoles,
  candidateSkills,
  certifications,
  educations,
  experiences,
  roles,
  skills,
} from "@/db/schema";

// Everything on the candidate's /profile page, in one round of parallel queries.
export async function getCandidateProfile(profileId: string) {
  const [[profile], experienceRows, skillRows, roleRows, educationRows, certificationRows, languageRows] =
    await Promise.all([
      db.select().from(candidateProfiles).where(eq(candidateProfiles.profileId, profileId)),
      db
        .select()
        .from(experiences)
        .where(eq(experiences.profileId, profileId))
        // Current jobs first, then most recent.
        .orderBy(sql`${experiences.endDate} is not null`, desc(experiences.startDate)),
      db
        .select({ name: skills.name, level: candidateSkills.level, years: candidateSkills.years })
        .from(candidateSkills)
        .innerJoin(skills, eq(skills.id, candidateSkills.skillId))
        .where(eq(candidateSkills.profileId, profileId))
        .orderBy(asc(skills.name)),
      db
        .select({ name: roles.name })
        .from(candidateRoles)
        .innerJoin(roles, eq(roles.id, candidateRoles.roleId))
        .where(eq(candidateRoles.profileId, profileId))
        .orderBy(asc(roles.name)),
      db
        .select()
        .from(educations)
        .where(eq(educations.profileId, profileId))
        .orderBy(desc(educations.endYear)),
      db
        .select()
        .from(certifications)
        .where(eq(certifications.profileId, profileId))
        .orderBy(desc(certifications.year)),
      db
        .select()
        .from(candidateLanguages)
        .where(eq(candidateLanguages.profileId, profileId))
        .orderBy(asc(candidateLanguages.languageCode)),
    ]);

  return {
    profile: profile ?? null,
    experiences: experienceRows,
    skills: skillRows,
    roles: roleRows.map((r) => r.name),
    educations: educationRows,
    certifications: certificationRows,
    languages: languageRows,
  };
}

export type CandidateProfileData = Awaited<ReturnType<typeof getCandidateProfile>>;
