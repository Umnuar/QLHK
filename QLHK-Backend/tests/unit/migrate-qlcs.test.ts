import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { buildVillageMapping, reEncryptCCCD, migrateQlcsData } from "../../scripts/migrate-qlcs-to-qlhk";
import { decryptCCCD } from "../../src/utils/crypto";
import { config } from "../../src/config/env";

describe("Database ETL & CCCD Re-encryption Migration", () => {
  const oldKey = "1111111111111111111111111111111111111111111111111111111111111111";
  const newKey = config.encryptionKey;
  const pepper = config.cccdHashPepper || "test-pepper-secret";

  function encryptOld(plain: string, hexKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(hexKey, "hex"), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
  }

  it("builds village mapping based on codes and unaccented names", () => {
    const qlcs = [
      { id: "q1", name: "Thôn Kon Hring", code: "KH" },
      { id: "q2", name: "Thôn Đăk Xế Păng", code: "DXP" },
      { id: "q3", name: "Thôn Không Tồn Tại", code: "NONE" },
    ];
    const qlhk = [
      { id: "h1", name: "Thôn Kon Hring", code: "KH" },
      { id: "h2", name: "Thôn Đắk Xế Păng", code: "DXP" },
    ];

    const map = buildVillageMapping(qlcs, qlhk);
    expect(map["q1"]).toBe("h1");
    expect(map["q2"]).toBe("h2");
    expect(map["q3"]).toBeUndefined();
  });

  it("decrypts old CCCD and produces valid QLHK encrypted format", () => {
    const rawCCCD = "064098001234";
    const encryptedOld = encryptOld(rawCCCD, oldKey);
    const reEnc = reEncryptCCCD(encryptedOld, oldKey, newKey, pepper);

    expect(reEnc.cccd).toBeDefined();
    expect(reEnc.cccd_last4).toBe("1234");
    expect(reEnc.cccd_hash.length).toBe(64);

    const decrypted = decryptCCCD(reEnc.cccd);
    expect(decrypted).toBe(rawCCCD);
  });

  it("handles empty or dryRun data gracefully", async () => {
    const res = await migrateQlcsData({ dryRun: true });
    expect(res.chucthoMigrated).toBe(0);
    expect(res.errors).toEqual([]);
  });
});
