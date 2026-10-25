import { ChucthoMilestones, HtxhMilestones } from "../types/policy.types";

const FULL_DOB_REGEX = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const MONTH_YEAR_DOB_REGEX = /^(\d{1,2})[/.-](\d{4})$/;
const YEAR_ONLY_DOB_REGEX = /^(\d{4})$/;

export function parseDobValue(raw: unknown): { dob: string; year: number } | null {
  if (!raw && raw !== 0) return null;

  if (raw instanceof Date) {
    const d = String(raw.getDate()).padStart(2, "0");
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const y = raw.getFullYear();
    return { dob: `${d}/${m}/${y}`, year: y };
  }

  if (typeof raw === "number") {
    if (raw >= 1850 && raw <= 2100) {
      return { dob: `01/01/${raw}`, year: raw };
    }
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const d = String(date.getUTCDate()).padStart(2, "0");
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const y = date.getUTCFullYear();
      return { dob: `${d}/${m}/${y}`, year: y };
    }
  }

  const str = String(raw).trim();
  const full = str.match(FULL_DOB_REGEX);
  if (full) {
    return {
      dob: `${full[1].padStart(2, "0")}/${full[2].padStart(2, "0")}/${full[3]}`,
      year: parseInt(full[3], 10),
    };
  }

  const monthYear = str.match(MONTH_YEAR_DOB_REGEX);
  if (monthYear) {
    return {
      dob: `01/${monthYear[1].padStart(2, "0")}/${monthYear[2]}`,
      year: parseInt(monthYear[2], 10),
    };
  }

  const yearOnly = str.match(YEAR_ONLY_DOB_REGEX);
  if (yearOnly) {
    return {
      dob: `01/01/${yearOnly[1]}`,
      year: parseInt(yearOnly[1], 10),
    };
  }

  return null;
}

export function calculateExactAge(
  dobRaw: unknown,
  referenceDate: Date = new Date(),
): number | null {
  const parsed = parseDobValue(dobRaw);
  if (!parsed) return null;

  const [dStr, mStr, yStr] = parsed.dob.split("/");
  const birthDay = parseInt(dStr, 10);
  const birthMonth = parseInt(mStr, 10);
  const birthYear = parseInt(yStr, 10);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - birthYear;
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age--;
  }
  return age;
}

export function computeChucthoMilestones(
  birthYearOrAge: number,
  calculationYear?: number,
): ChucthoMilestones {
  const age =
    calculationYear !== undefined
      ? calculationYear - birthYearOrAge
      : birthYearOrAge;
  return {
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
  };
}

export function computeHtxhMilestones(
  birthYear: number,
  calculationYear: number,
  record?: Record<string, unknown>,
): HtxhMilestones {
  const age = calculationYear - birthYear;
  return {
    age75plus: age >= 75 ? "x" : String(record?.age75plus || record?.age_75_plus || ""),
    age70to74poor:
      age >= 70 && age <= 74
        ? String(record?.age70to74poor || record?.age_70_74_poor || "")
        : "",
    bao_tro: String(record?.bao_tro || record?.baoTro || ""),
    huu_tri: String(record?.huu_tri || record?.huuTri || ""),
    huu_tuat_bao_hiem: String(
      record?.huu_tuat_bao_hiem || record?.huuTuatBaoHiem || "",
    ),
    nguoi_co_cong: String(record?.nguoi_co_cong || record?.nguoiCoCong || ""),
  };
}
