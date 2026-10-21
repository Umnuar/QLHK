import { Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeChucthoMilestones, computeHtxhMilestones, parseDobValue } from "../utils/age";
import { encryptCCCD, removeAccents } from "../utils/crypto";

export const importPolicyExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "Không tìm thấy file Excel tải lên" }); return; }
    const type = req.query.type === "htxh" ? "htxh" : "chuctho";
    const villageId = req.user?.role === "admin" ? ((req.query.village_id || req.body.village_id) as string) : req.user?.village_id;
    if (!villageId) { res.status(400).json({ error: "Thiếu thông tin thôn đích" }); return; }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) { res.status(400).json({ error: "File Excel không có dữ liệu" }); return; }

    let imported = 0;
    const calcYear = new Date().getFullYear();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const name = String(row.getCell(2).value || "").trim();
      const dobRaw = row.getCell(3).value;
      if (!name) return;
      const parsed = parseDobValue(dobRaw);
      const dob = parsed?.dob || String(dobRaw || "");
      const cccdRaw = row.getCell(4).value ? String(row.getCell(4).value).trim() : "";
      const reEnc = cccdRaw ? encryptCCCD(cccdRaw) : { encrypted: null, hash: null, last4: null };
      const common = { name, dob, name_unaccented: removeAccents(name), village_id: villageId, calculation_year: calcYear, version: 1, cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4 };

      if (type === "chuctho") {
        prisma.chuctho_profiles.create({ data: { ...common, ...(parsed ? computeChucthoMilestones(parsed.year, calcYear) : {}) } }).catch(() => {});
      } else {
        prisma.htxh_profiles.create({ data: { ...common, ...(parsed ? computeHtxhMilestones(parsed.year, calcYear) : computeHtxhMilestones(0, calcYear)) } }).catch(() => {});
      }
      imported++;
    });
    res.json({ success: true, count: imported });
  } catch (error) { res.status(500).json({ error: "Lỗi xử lý file Excel" }); }
};

export const exportPolicyExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = req.query.type === "htxh" ? "htxh" : "chuctho";
    const villageId = req.user?.role === "admin" ? (req.query.village_id as string) : req.user?.village_id;
    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type === "chuctho" ? "Danh sách Chúc Thọ" : "Danh sách HTXH");

    if (type === "chuctho") {
      sheet.addRow(["STT", "Họ và tên", "Ngày sinh", "CCCD", "60", "65", "70", "75", "80", "85", "90", "95", "100", ">100", "Đã nhận"]);
      const list = await prisma.chuctho_profiles.findMany({ where, orderBy: { stt: "asc" } });
      list.forEach((p, idx) => sheet.addRow([p.stt || idx + 1, p.name, p.dob, p.cccd_last4 ? `***${p.cccd_last4}` : "", p.age60, p.age65, p.age70, p.age75, p.age80, p.age85, p.age90, p.age95, p.age100, p.age_over_100, p.received ? "X" : ""]));
    } else {
      sheet.addRow(["STT", "Họ và tên", "Ngày sinh", "CCCD", "75+", "70-74 nghèo", "Bảo trợ", "Hưu trí", "Hưu tuất", "Người có công", "Đã nhận"]);
      const list = await prisma.htxh_profiles.findMany({ where, orderBy: { stt: "asc" } });
      list.forEach((p, idx) => sheet.addRow([p.stt || idx + 1, p.name, p.dob, p.cccd_last4 ? `***${p.cccd_last4}` : "", p.age75plus, p.age70to74poor, p.bao_tro, p.huu_tri, p.huu_tuat_bao_hiem, p.nguoi_co_cong, p.received ? "X" : ""]));
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { if (!res.headersSent) res.status(500).json({ error: "Lỗi xuất file Excel" }); }
};
