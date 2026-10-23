import { prisma } from "../config/prisma";
import { parseDobValue } from "../utils/age";
import { ChucthoMilestones } from "../types/policy.types";

export const calculateChucthoMilestonesForSync = (age: number): ChucthoMilestones => ({
  age60: age >= 60 && age < 65 ? "x" : "",
  age65: age >= 65 && age < 70 ? "x" : "",
  age70: age >= 70 && age < 75 ? "x" : "",
  age75: age >= 75 && age < 80 ? "x" : "",
  age80: age >= 80 && age < 85 ? "x" : "",
  age85: age >= 85 && age < 90 ? "x" : "",
  age90: age >= 90 && age < 95 ? "x" : "",
  age95: age >= 95 && age < 100 ? "x" : "",
  age100: age === 100 ? "x" : "",
  age_over_100: age > 100 ? "x" : "",
});

export const syncCitizensToPolicy = async (
  calcYear?: number,
  villageId?: string | null,
): Promise<{ chucthoCount: number; htxhCount: number }> => {
  const targetYear = calcYear || new Date().getFullYear();
  const citizenWhere: Record<string, unknown> = {
    is_deleted: false,
    household: {
      is_deleted: false,
    },
  };
  if (villageId) {
    citizenWhere.household = {
      is_deleted: false,
      village_id: villageId,
    };
  }

  const citizensList = await prisma.citizens.findMany({
    where: citizenWhere,
    include: {
      household: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  let chucthoCount = 0;
  let chucthoStt = 1;
  for (const citizen of citizensList) {
    const parsed = parseDobValue(citizen.dob);
    if (!parsed) continue;
    const age = targetYear - parsed.year;
    if (age < 60) continue;

    const milestones = calculateChucthoMilestonesForSync(age);

    let existing = await prisma.chuctho_profiles.findFirst({
      where: {
        notes: citizen.id,
        is_deleted: false,
      },
    });

    if (!existing && citizen.cccd_hash) {
      existing = await prisma.chuctho_profiles.findFirst({
        where: {
          cccd_hash: citizen.cccd_hash,
          is_deleted: false,
        },
      });
    }
    if (!existing && citizen.name_unaccented && citizen.dob && citizen.household?.village_id) {
      existing = await prisma.chuctho_profiles.findFirst({
        where: {
          name_unaccented: citizen.name_unaccented,
          dob: citizen.dob,
          village_id: citizen.household.village_id,
          notes: "",
          is_deleted: false,
        },
      });
    }

    const payload = {
      name: citizen.full_name,
      name_unaccented: citizen.name_unaccented,
      dob: citizen.dob,
      gender: citizen.gender,
      cccd: citizen.cccd,
      cccd_hash: citizen.cccd_hash,
      cccd_last4: citizen.cccd_last4,
      ethnicity: citizen.ethnicity,
      residence: citizen.household?.address || "",
      current_address: citizen.household?.address || "",
      village_id: citizen.household?.village_id,
      calculation_year: targetYear,
      notes: citizen.id,
      ...milestones,
    };

    if (existing) {
      await prisma.chuctho_profiles.update({
        where: { id: existing.id },
        data: {
          ...payload,
          received: existing.received ?? false,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.chuctho_profiles.create({
        data: {
          ...payload,
          stt: chucthoStt++,
          received: false,
          is_deleted: false,
          version: 1,
        },
      });
    }
    chucthoCount++;
  }

  const activeRetireeProfileIds: string[] = [];
  let htxhCount = 0;
  let htxhStt = 1;
  for (const citizen of citizensList) {
    const occupation = citizen.occupation?.toLowerCase() || "";
    if (!occupation.includes("hưu")) continue;

    let existing = await prisma.htxh_profiles.findFirst({
      where: {
        notes: citizen.id,
        is_deleted: false,
      },
    });

    if (!existing && citizen.cccd_hash) {
      existing = await prisma.htxh_profiles.findFirst({
        where: {
          cccd_hash: citizen.cccd_hash,
          is_deleted: false,
        },
      });
    }
    if (!existing && citizen.name_unaccented && citizen.dob && citizen.household?.village_id) {
      existing = await prisma.htxh_profiles.findFirst({
        where: {
          name_unaccented: citizen.name_unaccented,
          dob: citizen.dob,
          village_id: citizen.household.village_id,
          notes: "",
          is_deleted: false,
        },
      });
    }

    const payload = {
      name: citizen.full_name,
      name_unaccented: citizen.name_unaccented,
      dob: citizen.dob,
      gender: citizen.gender,
      cccd: citizen.cccd,
      cccd_hash: citizen.cccd_hash,
      cccd_last4: citizen.cccd_last4,
      ethnicity: citizen.ethnicity,
      residence: citizen.household?.address || "",
      current_address: citizen.household?.address || "",
      village_id: citizen.household?.village_id || "",
      calculation_year: targetYear,
      huu_tri: "x",
      notes: citizen.id,
    };

    if (existing) {
      const updated = await prisma.htxh_profiles.update({
        where: { id: existing.id },
        data: {
          ...payload,
          received: existing.received ?? false,
          updated_at: new Date(),
        },
      });
      activeRetireeProfileIds.push(updated.id);
    } else {
      const created = await prisma.htxh_profiles.create({
        data: {
          ...payload,
          stt: htxhStt++,
          received: false,
          is_deleted: false,
          version: 1,
        },
      });
      activeRetireeProfileIds.push(created.id);
    }
    htxhCount++;
  }

  const htxhCleanupWhere: Record<string, unknown> = {
    is_deleted: false,
  };
  if (villageId) {
    htxhCleanupWhere.village_id = villageId;
  }
  if (activeRetireeProfileIds.length > 0) {
    htxhCleanupWhere.id = { notIn: activeRetireeProfileIds };
  }
  await prisma.htxh_profiles.updateMany({
    where: htxhCleanupWhere,
    data: {
      is_deleted: true,
      deleted_at: new Date(),
    },
  });

  return { chucthoCount, htxhCount };
};
