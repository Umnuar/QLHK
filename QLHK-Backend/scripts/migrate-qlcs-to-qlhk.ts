import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { removeAccents } from "../src/utils/crypto";

export interface MigrationResult {
  chucthoMigrated: number;
  htxhMigrated: number;
  auditLogsMigrated: number;
  errors: string[];
}

export type VillageMapping = Record<string, string>;

export function buildVillageMapping(
  qlcsVillages: Array<{ id: string; name: string; code?: string | null }>,
  qlhkVillages: Array<{ id: string; name: string; code?: string | null }>,
): VillageMapping {
  const mapping: VillageMapping = {};
  for (const qlcsV of qlcsVillages) {
    const qlcsNorm = removeAccents(qlcsV.name);
    const matched = qlhkVillages.find((v) => {
      if (qlcsV.code && v.code && qlcsV.code === v.code) return true;
      return removeAccents(v.name) === qlcsNorm;
    });
    if (matched) {
      mapping[qlcsV.id] = matched.id;
    }
  }
  return mapping;
}

export function reEncryptCCCD(
  encryptedCCCD: string,
  oldKey: string,
  newKey: string,
  pepper: string,
): { cccd: string; cccd_hash: string; cccd_last4: string } {
  if (!encryptedCCCD || !encryptedCCCD.includes(":")) {
    return { cccd: encryptedCCCD || "", cccd_hash: "", cccd_last4: "" };
  }
  const parts = encryptedCCCD.split(":");
  if (parts.length !== 3) {
    return { cccd: encryptedCCCD, cccd_hash: "", cccd_last4: "" };
  }
  const [ivHex, authTagHex, dataHex] = parts;
  const oldKeyBuf = /^[0-9a-fA-F]{64}$/.test(oldKey)
    ? Buffer.from(oldKey, "hex")
    : crypto.createHash("sha256").update(oldKey).digest();

  const decipher = crypto.createDecipheriv("aes-256-gcm", oldKeyBuf, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");

  const newKeyBuf = /^[0-9a-fA-F]{64}$/.test(newKey)
    ? Buffer.from(newKey, "hex")
    : crypto.createHash("sha256").update(newKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", newKeyBuf, iv);
  let enc = cipher.update(plain, "utf8", "hex");
  enc += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  const cccd = `${iv.toString("hex")}:${authTag}:${enc}`;
  const cccd_hash = crypto.createHmac("sha256", pepper).update(plain).digest("hex");
  const cccd_last4 = plain.length >= 4 ? plain.slice(-4) : plain;

  return { cccd, cccd_hash, cccd_last4 };
}

export async function migrateQlcsData(options: {
  dryRun?: boolean;
  prisma?: PrismaClient;
  qlcsPrisma?: any;
  oldKey?: string;
  newKey?: string;
  pepper?: string;
} = {}): Promise<MigrationResult> {
  const result: MigrationResult = {
    chucthoMigrated: 0,
    htxhMigrated: 0,
    auditLogsMigrated: 0,
    errors: [],
  };

  if (!options.qlcsPrisma || !options.prisma) {
    return result;
  }

  const qlcsVillages = await options.qlcsPrisma.villages.findMany();
  const qlhkVillages = await options.prisma.villages.findMany();
  const villageMap = buildVillageMapping(qlcsVillages, qlhkVillages);

  const oldKey = options.oldKey || process.env.QLCS_ENCRYPTION_KEY || "";
  const newKey = options.newKey || process.env.ENCRYPTION_KEY || "";
  const pepper = options.pepper || process.env.CCCD_HASH_PEPPER || "";

  const qlcsChuctho = await options.qlcsPrisma.profiles.findMany({ where: { is_deleted: false } });
  for (const p of qlcsChuctho) {
    const targetVillageId = villageMap[p.village_id] || p.village_id;
    const reEnc = p.cccd ? reEncryptCCCD(p.cccd, oldKey, newKey, pepper) : { cccd: null, cccd_hash: null, cccd_last4: null };
    if (!options.dryRun) {
      await options.prisma.chuctho_profiles.create({
        data: {
          id: p.id, stt: p.stt, name: p.name, name_unaccented: p.name_unaccented,
          dob: p.dob, gender: p.gender, cccd: reEnc.cccd, cccd_hash: reEnc.cccd_hash,
          cccd_last4: reEnc.cccd_last4, ethnicity: p.ethnicity, residence: p.residence,
          current_address: p.current_address, village_id: targetVillageId,
          age60: p.age60, age65: p.age65, age70: p.age70, age75: p.age75, age80: p.age80,
          age85: p.age85, age90: p.age90, age95: p.age95, age100: p.age100, age_over_100: p.age_over_100,
          received: p.received, calculation_year: p.calculation_year, notes: p.notes,
        },
      });
    }
    result.chucthoMigrated++;
  }

  return result;
}
