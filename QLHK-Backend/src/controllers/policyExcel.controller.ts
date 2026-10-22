import { Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeChucthoMilestones, computeHtxhMilestones, parseDobValue } from "../utils/age";
import { decryptCCCD, encryptCCCD, removeAccents } from "../utils/crypto";

const resolveExportCccd = (p: any): string => {
  if (!p.cccd) return p.cccd_last4 ? `***${p.cccd_last4}` : "";
  if (typeof p.cccd === "string" && p.cccd.includes(":")) {
    try {
      return decryptCCCD(p.cccd);
    } catch {
      return p.cccd_last4 ? `***${p.cccd_last4}` : "";
    }
  }
  return String(p.cccd);
};

export const importPolicyExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (Array.isArray(req.body.profiles)) {
      const type = (req.query.type || req.body.type) === "htxh" ? "htxh" : "chuctho";
      const rawVillageId = (req.body.village_id || req.body.villageId || req.query.village_id || req.query.villageId) as string;
      const defaultVillageId = req.user?.role === "admin" ? (rawVillageId || req.user?.village_id) : req.user?.village_id;
      const rawCalcYear = req.body.calculation_year || req.body.calculationYear || req.query.calculation_year || req.query.calculationYear;
      const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : new Date().getFullYear();

      let inserted = 0;
      for (const item of req.body.profiles) {
        const name = String(item.name || "").trim();
        if (!name) continue;
        const targetVillageId = req.user?.role === "admin" ? (item.village_id || item.villageId || defaultVillageId) : req.user?.village_id;
        if (!targetVillageId) continue;

        const parsed = parseDobValue(item.dob);
        const dob = parsed?.dob || String(item.dob || "");
        const cccdRaw = item.cccd ? String(item.cccd).trim() : "";
        const reEnc = cccdRaw ? encryptCCCD(cccdRaw) : { encrypted: null, hash: null, last4: null };
        const currentAddress = item.current_address || item.currentAddress || null;
        const stt = item.stt !== undefined && item.stt !== null ? Number(item.stt) : null;
        const gender = item.gender || null;
        const ethnicity = item.ethnicity || null;
        const residence = item.residence || null;
        const notes = item.notes || null;
        const received = item.received !== undefined ? Boolean(item.received) : false;

        const common = {
          name,
          dob,
          stt,
          gender,
          ethnicity,
          residence,
          current_address: currentAddress,
          notes,
          received,
          name_unaccented: removeAccents(name),
          village_id: targetVillageId,
          calculation_year: calcYear,
          version: 1,
          cccd: reEnc.encrypted,
          cccd_hash: reEnc.hash,
          cccd_last4: reEnc.last4,
        };

        if (type === "chuctho") {
          const milestones = parsed ? computeChucthoMilestones(parsed.year, calcYear) : {};
          await prisma.chuctho_profiles.create({ data: { ...common, ...milestones } });
        } else {
          const milestones = parsed ? computeHtxhMilestones(parsed.year, calcYear, item) : computeHtxhMilestones(0, calcYear, item);
          await prisma.htxh_profiles.create({ data: { ...common, ...milestones } });
        }
        inserted++;
      }
      res.json({ success: true, inserted, updated: 0, errorDetails: [] });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Không tìm thấy file Excel tải lên" });
      return;
    }
    const type = req.query.type === "htxh" ? "htxh" : "chuctho";
    const villageId = req.user?.role === "admin" ? ((req.query.village_id || req.body.village_id) as string) : req.user?.village_id;
    if (!villageId) {
      res.status(400).json({ error: "Thiếu thông tin thôn đích" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      res.status(400).json({ error: "File Excel không có dữ liệu" });
      return;
    }

    let imported = 0;
    const calcYear = new Date().getFullYear();
    const rows: unknown[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      rows.push(row);
    });

    for (const row of rows as ExcelJS.Row[]) {
      const name = String(row.getCell(2).value || "").trim();
      const dobRaw = row.getCell(3).value;
      if (!name) continue;
      const parsed = parseDobValue(dobRaw);
      const dob = parsed?.dob || String(dobRaw || "");
      const cccdRaw = row.getCell(4).value ? String(row.getCell(4).value).trim() : "";
      const reEnc = cccdRaw ? encryptCCCD(cccdRaw) : { encrypted: null, hash: null, last4: null };
      const common = {
        name,
        dob,
        name_unaccented: removeAccents(name),
        village_id: villageId,
        calculation_year: calcYear,
        version: 1,
        cccd: reEnc.encrypted,
        cccd_hash: reEnc.hash,
        cccd_last4: reEnc.last4,
      };

      if (type === "chuctho") {
        await prisma.chuctho_profiles.create({
          data: { ...common, ...(parsed ? computeChucthoMilestones(parsed.year, calcYear) : {}) },
        });
      } else {
        await prisma.htxh_profiles.create({
          data: { ...common, ...(parsed ? computeHtxhMilestones(parsed.year, calcYear) : computeHtxhMilestones(0, calcYear)) },
        });
      }
      imported++;
    }
    res.json({ success: true, count: imported });
  } catch (error) {
    res.status(500).json({ error: "Lỗi xử lý file Excel" });
  }
};

export const exportPolicyExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = req.query.type === "htxh" ? "htxh" : "chuctho";
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear;
    const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : undefined;
    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;
    if (calcYear) where.calculation_year = calcYear;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type === "chuctho" ? "Danh sách Chúc Thọ" : "Danh sách HTXH");

    if (type === "chuctho") {
      sheet.addRow(["STT", "Họ và tên", "Ngày sinh", "CCCD", "60", "65", "70", "75", "80", "85", "90", "95", "100", ">100", "Đã nhận"]);
      const list = await prisma.chuctho_profiles.findMany({ where, orderBy: { stt: "asc" } });
      list.forEach((p, idx) => sheet.addRow([p.stt || idx + 1, p.name, p.dob, resolveExportCccd(p), p.age60, p.age65, p.age70, p.age75, p.age80, p.age85, p.age90, p.age95, p.age100, p.age_over_100, p.received ? "X" : ""]));
    } else {
      sheet.addRow(["STT", "Họ và tên", "Ngày sinh", "CCCD", "75+", "70-74 nghèo", "Bảo trợ", "Hưu trí", "Hưu tuất", "Người có công", "Đã nhận"]);
      const list = await prisma.htxh_profiles.findMany({ where, orderBy: { stt: "asc" } });
      list.forEach((p, idx) => sheet.addRow([p.stt || idx + 1, p.name, p.dob, resolveExportCccd(p), p.age75plus, p.age70to74poor, p.bao_tro, p.huu_tri, p.huu_tuat_bao_hiem, p.nguoi_co_cong, p.received ? "X" : ""]));
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Lỗi xuất file Excel" });
  }
};
