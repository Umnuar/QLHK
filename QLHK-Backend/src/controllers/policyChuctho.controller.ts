import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeChucthoMilestones, parseDobValue } from "../utils/age";
import { encryptCCCD, removeAccents } from "../utils/crypto";

export const getChucthoProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const villageId = req.user?.role === "admin" ? (req.query.village_id as string) : req.user?.village_id;
    const search = (req.query.search as string)?.trim();
    const milestone = req.query.milestone as string;
    const received = req.query.received !== undefined ? req.query.received === "true" : undefined;
    const calcYear = req.query.calculation_year ? parseInt(req.query.calculation_year as string, 10) : undefined;

    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;
    if (received !== undefined) where.received = received;
    if (calcYear) where.calculation_year = calcYear;
    if (milestone) where[milestone] = "x";
    if (search) {
      where.OR = [{ name_unaccented: { contains: removeAccents(search) } }, { cccd_last4: search.slice(-4) }];
    }

    const [items, total] = await Promise.all([
      prisma.chuctho_profiles.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { stt: "asc" }, include: { village: true } }),
      prisma.chuctho_profiles.count({ where }),
    ]);

    res.json({ success: true, data: items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách chúc thọ" });
  }
};

export const getChucthoStream = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const villageId = req.user?.role === "admin" ? (req.query.village_id as string) : req.user?.village_id;
    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    let closed = false;
    req.on("close", () => { closed = true; });

    const profiles = await prisma.chuctho_profiles.findMany({ where, orderBy: { stt: "asc" } });
    for (const p of profiles) {
      if (closed) break;
      res.write(JSON.stringify(p) + "\n");
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Lỗi xuất stream dữ liệu" });
  }
};

export const createChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, dob, cccd, village_id, stt, gender, ethnicity, residence, current_address, notes, calculation_year } = req.body;
    if (!name) {
      res.status(400).json({ error: "Họ và tên là bắt buộc" });
      return;
    }
    const parsed = parseDobValue(dob);
    const calcYear = calculation_year || new Date().getFullYear();
    const milestones = parsed ? computeChucthoMilestones(parsed.year, calcYear) : {};
    const reEnc = cccd ? encryptCCCD(cccd) : { encrypted: null, hash: null, last4: null };

    const profile = await prisma.chuctho_profiles.create({
      data: {
        name, stt, gender, ethnicity, residence, current_address, notes,
        dob: parsed?.dob || dob, name_unaccented: removeAccents(name),
        village_id: req.user?.role === "admin" ? (village_id || req.user?.village_id) : req.user?.village_id,
        calculation_year: calcYear, version: 1, ...milestones,
        cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4,
      },
    });
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi tạo hồ sơ chúc thọ" });
  }
};

export const updateChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const current = await prisma.chuctho_profiles.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      res.status(404).json({ error: "Không tìm thấy hồ sơ" });
      return;
    }
    if (req.body.version !== undefined && current.version !== req.body.version) {
      res.status(409).json({ error: "OCC_CONFLICT", message: "Bản ghi đã bị thay đổi bởi phiên khác" });
      return;
    }

    const { name, dob, cccd, calculation_year, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest, version: (current.version || 1) + 1 };
    if (name) {
      data.name = name;
      data.name_unaccented = removeAccents(name);
    }
    const calcYear = calculation_year || current.calculation_year || new Date().getFullYear();
    data.calculation_year = calcYear;
    if (dob) {
      const parsed = parseDobValue(dob);
      data.dob = parsed?.dob || dob;
      if (parsed) Object.assign(data, computeChucthoMilestones(parsed.year, calcYear));
    }
    if (cccd) {
      const reEnc = encryptCCCD(cccd);
      Object.assign(data, { cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4 });
    }

    const updated = await prisma.chuctho_profiles.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi cập nhật hồ sơ" });
  }
};

export const markChucthoReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const received = req.body.received !== undefined ? Boolean(req.body.received) : true;
    const updated = await prisma.chuctho_profiles.update({ where: { id }, data: { received } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: "Lỗi cập nhật trạng thái nhận quà" });
  }
};

export const deleteChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.chuctho_profiles.update({ where: { id }, data: { is_deleted: true, deleted_at: new Date() } });
    res.json({ success: true, message: "Đã xóa hồ sơ thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa hồ sơ" });
  }
};
