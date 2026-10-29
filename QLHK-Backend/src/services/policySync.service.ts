import { prisma } from "../config/prisma";
import { calculateExactAge } from "../utils/age";
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
  const now = new Date();
  const targetYear = calcYear || now.getFullYear();
  const refDate = new Date(targetYear, 11, 31);
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
    const age = calculateExactAge(citizen.dob, refDate);
    if (age === null || age < 60) continue;

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

    const hasPolicy = (key: string) => {
      const p = citizen as any;
      if (Array.isArray(p.pension_policies) && p.pension_policies.includes(key)) return true;
      if (p[key] === "x" || p[key] === true || p[key] === "true") return true;
      return false;
    };

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
      huu_tri: hasPolicy("huu_tri") ? "x" : "",
      age75plus: hasPolicy("age75plus") ? "x" : "",
      age70to74poor: hasPolicy("age70to74poor") ? "x" : "",
      bao_tro: hasPolicy("bao_tro") ? "x" : "",
      huu_tuat_bao_hiem: hasPolicy("huu_tuat_bao_hiem") ? "x" : "",
      nguoi_co_cong: hasPolicy("nguoi_co_cong") ? "x" : "",
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

export const syncSingleCitizenToPolicy = async (citizenId: string): Promise<void> => {
  const citizen = await prisma.citizens.findUnique({
    where: { id: citizenId },
    include: { household: true },
  });

  if (!citizen || citizen.is_deleted || citizen.household?.is_deleted) {
    await prisma.chuctho_profiles.updateMany({
      where: { notes: citizenId, is_deleted: false },
      data: { is_deleted: true, deleted_at: new Date() },
    });
    await prisma.htxh_profiles.updateMany({
      where: { notes: citizenId, is_deleted: false },
      data: { is_deleted: true, deleted_at: new Date() },
    });
    return;
  }

  const now = new Date();
  const targetYear = now.getFullYear();
  const exactAge = calculateExactAge(citizen.dob, now);

  if (exactAge !== null && exactAge >= 60) {
    const milestones = calculateChucthoMilestonesForSync(exactAge);
    let existing = await prisma.chuctho_profiles.findFirst({
      where: { notes: citizen.id, is_deleted: false },
    });
    if (!existing && citizen.cccd_hash) {
      existing = await prisma.chuctho_profiles.findFirst({
        where: { cccd_hash: citizen.cccd_hash, is_deleted: false },
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
      const maxStt = await prisma.chuctho_profiles.aggregate({
        _max: { stt: true },
        where: { calculation_year: targetYear },
      });
      const nextStt = (maxStt._max.stt || 0) + 1;
      await prisma.chuctho_profiles.create({
        data: {
          ...payload,
          stt: nextStt,
          received: false,
          is_deleted: false,
          version: 1,
        },
      });
    }
  }

  const occupation = citizen.occupation?.toLowerCase() || "";
  const isRetiree =
    occupation.includes("hưu") ||
    occupation.includes("huu") ||
    occupation.includes("mất sức") ||
    occupation.includes("mat suc") ||
    occupation.includes("bhxh") ||
    citizen.huu_tri === "x" ||
    (Array.isArray(citizen.pension_policies) && citizen.pension_policies.length > 0);
  if (isRetiree) {
    let existing = await prisma.htxh_profiles.findFirst({
      where: { notes: citizen.id, is_deleted: false },
    });
    if (!existing && citizen.cccd_hash) {
      existing = await prisma.htxh_profiles.findFirst({
        where: { cccd_hash: citizen.cccd_hash, is_deleted: false },
      });
    }

    const hasPolicy = (key: string) => {
      const p = citizen as any;
      if (Array.isArray(p.pension_policies) && p.pension_policies.includes(key)) return true;
      if (p[key] === "x" || p[key] === true || p[key] === "true") return true;
      return false;
    };

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
      huu_tri: hasPolicy("huu_tri") ? "x" : "",
      age75plus: hasPolicy("age75plus") ? "x" : "",
      age70to74poor: hasPolicy("age70to74poor") ? "x" : "",
      bao_tro: hasPolicy("bao_tro") ? "x" : "",
      huu_tuat_bao_hiem: hasPolicy("huu_tuat_bao_hiem") ? "x" : "",
      nguoi_co_cong: hasPolicy("nguoi_co_cong") ? "x" : "",
      notes: citizen.id,
    };

    if (existing) {
      await prisma.htxh_profiles.update({
        where: { id: existing.id },
        data: {
          ...payload,
          received: existing.received ?? false,
          updated_at: new Date(),
        },
      });
    } else {
      const maxStt = await prisma.htxh_profiles.aggregate({
        _max: { stt: true },
        where: { calculation_year: targetYear },
      });
      const nextStt = (maxStt._max.stt || 0) + 1;
      await prisma.htxh_profiles.create({
        data: {
          ...payload,
          stt: nextStt,
          received: false,
          is_deleted: false,
          version: 1,
        },
      });
    }
  } else {
    await prisma.htxh_profiles.updateMany({
      where: { notes: citizen.id, is_deleted: false, huu_tri: "x" },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }
};
