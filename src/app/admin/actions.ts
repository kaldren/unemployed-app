"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { decideCompany } from "@/lib/employer/queries";

const decisionSchema = z.object({ companyId: z.uuid(), status: z.enum(["approved", "rejected"]) });

// An admin approves or rejects a company. Approved companies' published jobs go live right away.
export async function setCompanyStatus(formData: FormData) {
  await requireAdmin();
  const parsed = decisionSchema.safeParse({
    companyId: formData.get("companyId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  await decideCompany(parsed.data.companyId, parsed.data.status);
  revalidatePath("/admin");
}
