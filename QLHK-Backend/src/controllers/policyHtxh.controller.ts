import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeHtxhMilestones, parseDobValue } from "../utils/age";
import { decryptCCCD, encryptCCCD, removeAccents } from "../utils/crypto";

export const isValidUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const formatPolicyProfile = <T extends Record<string, any>>(p: T): T => {
  if (!p) return p;
  let plainCccd = p.cccd || "";
  if (plainCccd && typeof plainCccd === "string" && plainCccd.includes(":")) {
    try {
      plainCccd = decryptCCCD(plainCccd);
    } catch {
      plainCccd = p.cccd_last4 ? `***${p.cccd_last4}` : "";
    }
  }
  return {
    ...p,
    cccd: plainCccd,
  };
};

const SORT_KEY_MAP: Record<string, string> = {
  stt: "stt",
  name: "name",
  dob: "dob",
  gender: "gender",
  cccd: "cccd_last4",
  ethnicity: "ethnicity",
  residence: "residence",
  currentAddress: "current_address",
  current_address: "current_address",
  received: "received",
  calculationYear: "calculation_year",
  calculation_year: "calculation_year",
  createdAt: "created_at",
  created_at: "created_at",
};

export const getHtxhProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const search = (req.query.search as string)?.trim();
    const category = ((req.query.category || req.query.ageGroup || req.query.milestone) as string)?.trim();
    const statusQuery = ((req.query.status || req.query.received) as string)?.trim()?.toLowerCase();
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear;
    const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : undefined;
    const gender = (req.query.gender as string)?.trim();
    const ethnicity = (req.query.ethnicity as string)?.trim();
    const residence = (req.query.residence as string)?.trim();

    let received: boolean | undefined = undefined;
    if (statusQuery === "received" || statusQuery === "true") {
      received = true;
    } else if (statusQuery === "unreceived" || statusQuery === "false") {
      received = false;
    }

    const where: Record<string, unknown> = { is_deleted: false, huu_tri: "x" };
    if (villageId) where.village_id = villageId;
    if (received !== undefined) where.received = received;
    if (calcYear) where.calculation_year = calcYear;
    if (gender) where.gender = gender;
    if (ethnicity) where.ethnicity = ethnicity;
    if (residence) where.residence = residence;
    if (category) where[category] = "x";
    if (search) {
      where.OR = [{ name_unaccented: { contains: removeAccents(search) } }, { cccd_last4: search.slice(-4) }];
    }

    const rawDob = ((req.query.dob as string) || "").trim();
    const exactDate = (((req.query.exact_date || req.query.exactDate) as string) || "").trim();
    const targetDob = exactDate || rawDob;
    if (targetDob) {
      const parts = targetDob.split(/[/.-]/);
      if (parts.length === 3) {
        const d = parts[0];
        const m = parts[1];
        const y = parts[2];
        const padded = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
        const unpadded = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
        if (!where.AND) where.AND = [];
        (where.AND as any[]).push({
          OR: [
            { dob: { contains: padded } },
            { dob: { contains: unpadded } },
            { dob: { contains: targetDob } },
          ],
        });
      } else if (parts.length === 2) {
        const d = parts[0];
        const m = parts[1];
        const padded = `${d.padStart(2, "0")}/${m.padStart(2, "0")}`;
        const unpadded = `${parseInt(d, 10)}/${parseInt(m, 10)}`;
        if (!where.AND) where.AND = [];
        (where.AND as any[]).push({
          OR: [
            { dob: { contains: padded } },
            { dob: { contains: unpadded } },
            { dob: { contains: targetDob } },
          ],
        });
      } else {
        if (!where.AND) where.AND = [];
        (where.AND as any[]).push({
          OR: [
            { dob: { contains: targetDob } },
            { dob: { endsWith: targetDob } },
          ],
        });
      }
    }

    const rawSortKey = (req.query.sortKey as string) || "stt";
    const sortField = SORT_KEY_MAP[rawSortKey] || "stt";
    const sortDirection = ((req.query.sortDirection as string) || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const orderBy = { [sortField]: sortDirection };

    const [items, total] = await Promise.all([
      prisma.htxh_profiles.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy, include: { village: true } }),
      prisma.htxh_profiles.count({ where }),
    ]);

    res.json({ success: true, data: items.map(formatPolicyProfile), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách HTXH" });
  }
};

export const getHtxhStream = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear;
    const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : undefined;
    const where: Record<string, unknown> = { is_deleted: false, huu_tri: "x" };
    if (villageId) where.village_id = villageId;
    if (calcYear) where.calculation_year = calcYear;

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    let closed = false;
    req.on("close", () => { closed = true; });

    const profiles = await prisma.htxh_profiles.findMany({ where, orderBy: { stt: "asc" } });
    for (const p of profiles) {
      if (closed) break;
      res.write(JSON.stringify(formatPolicyProfile(p)) + "\n");
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Lỗi xuất stream dữ liệu HTXH" });
  }
};

export const createHtxhProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, dob, cccd, stt, gender, ethnicity, residence, notes, ...categories } = req.body;
    const village_id = req.body.village_id || req.body.villageId;
    const current_address = req.body.current_address || req.body.currentAddress;
    const calculation_year = req.body.calculation_year || req.body.calculationYear;
    const targetVillageId = req.user?.role === "admin" ? (village_id || req.user?.village_id) : req.user?.village_id;

    if (!name || !targetVillageId) {
      res.status(400).json({ error: "Họ tên và thôn là bắt buộc" });
      return;
    }
    const parsed = parseDobValue(dob);
    const calcYear = calculation_year || new Date().getFullYear();
    const milestones = parsed ? computeHtxhMilestones(parsed.year, calcYear, categories) : computeHtxhMilestones(0, calcYear, categories);
    const reEnc = cccd ? encryptCCCD(cccd) : { encrypted: null, hash: null, last4: null };

    const profile = await prisma.htxh_profiles.create({
      data: {
        name, stt, gender, ethnicity, residence, current_address, notes,
        dob: parsed?.dob || dob, name_unaccented: removeAccents(name),
        village_id: targetVillageId, calculation_year: calcYear, version: 1, ...milestones,
        cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4,
      },
    });
    res.status(201).json({ success: true, data: formatPolicyProfile(profile) });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi tạo hồ sơ HTXH" });
  }
};

export const updateHtxhProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    const current = await prisma.htxh_profiles.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      res.status(404).json({ error: "Không tìm thấy hồ sơ HTXH" });
      return;
    }
    if (req.body.version !== undefined && current.version !== req.body.version) {
      res.status(409).json({ error: "OCC_CONFLICT", message: "Bản ghi đã bị thay đổi bởi phiên khác" });
      return;
    }

    const { name, dob, cccd, village_id, villageId, current_address, currentAddress, calculation_year, calculationYear, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest, version: (current.version || 1) + 1 };
    delete data.id;
    delete data.village;
    delete data.created_at;
    delete data.updated_at;
    delete data.is_deleted;
    delete data.deleted_at;
    delete data.cccd_hash;
    delete data.cccd_last4;
    if (name) {
      data.name = name;
      data.name_unaccented = removeAccents(name);
    }
    const targetVillageId = village_id || villageId;
    if (targetVillageId && req.user?.role === "admin") {
      data.village_id = targetVillageId;
    }
    const targetAddress = current_address || currentAddress;
    if (targetAddress !== undefined) {
      data.current_address = targetAddress;
    }
    const calcYear = calculation_year || calculationYear || current.calculation_year || new Date().getFullYear();
    data.calculation_year = calcYear;
    if (dob) {
      const parsed = parseDobValue(dob);
      data.dob = parsed?.dob || dob;
      if (parsed) Object.assign(data, computeHtxhMilestones(parsed.year, calcYear, rest));
    }
    if (cccd) {
      const reEnc = encryptCCCD(cccd);
      Object.assign(data, { cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4 });
    }

    const updated = await prisma.htxh_profiles.update({ where: { id }, data });
    res.json({ success: true, data: formatPolicyProfile(updated) });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi khi cập nhật hồ sơ HTXH" });
  }
};

export const markHtxhReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    const received = req.body.received !== undefined ? Boolean(req.body.received) : true;
    const updated = await prisma.htxh_profiles.update({ where: { id }, data: { received } });
    res.json({ success: true, data: formatPolicyProfile(updated) });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi cập nhật trạng thái nhận HTXH" });
  }
};

export const deleteHtxhProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    await prisma.htxh_profiles.update({ where: { id }, data: { is_deleted: true, deleted_at: new Date() } });
    res.json({ success: true, message: "Đã xóa hồ sơ HTXH thành công" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi khi xóa hồ sơ HTXH" });
  }
};
