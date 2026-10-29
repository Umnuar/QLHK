import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeChucthoMilestones, parseDobValue } from "../utils/age";
import { decryptCCCD, encryptCCCD, removeAccents } from "../utils/crypto";

export const isValidUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const formatPolicyProfile = <T extends Record<string, any>>(p: T, targetYear?: number): T => {
  if (!p) return p;
  let plainCccd = p.cccd || "";
  if (plainCccd && typeof plainCccd === "string" && plainCccd.includes(":")) {
    try {
      plainCccd = decryptCCCD(plainCccd);
    } catch {
      plainCccd = p.cccd_last4 ? `***${p.cccd_last4}` : "";
    }
  }
  const formatted: any = {
    ...p,
    cccd: plainCccd,
  };
  if (targetYear) {
    formatted.calculation_year = targetYear;
    if (p.dob) {
      const parsed = parseDobValue(p.dob);
      if (parsed) {
        const age = targetYear - parsed.year;
        if (age >= 60) {
          Object.assign(formatted, computeChucthoMilestones(age));
        }
      }
    }
  }
  return formatted;
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

export const getChucthoProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const search = (req.query.search as string)?.trim();
    const milestone = ((req.query.milestone || req.query.ageGroup) as string)?.trim();
    const statusQuery = ((req.query.status || req.query.received) as string)?.trim()?.toLowerCase();
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear || req.query.year;
    const targetYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : new Date().getFullYear();

    const gender = (req.query.gender as string)?.trim();
    const ethnicity = (req.query.ethnicity as string)?.trim();
    const residence = (req.query.residence as string)?.trim();
    const day = ((req.query.day as string) || "").trim();
    const month = ((req.query.month as string) || "").trim();
    const rawDob = ((req.query.dob as string) || "").trim();
    const exactDate = (((req.query.exact_date || req.query.exactDate) as string) || "").trim();
    const dateFrom = (((req.query.date_from || req.query.dateFrom) as string) || "").trim();
    const dateTo = (((req.query.date_to || req.query.dateTo) as string) || "").trim();

    let received: boolean | undefined = undefined;
    if (statusQuery === "received" || statusQuery === "true") {
      received = true;
    } else if (statusQuery === "unreceived" || statusQuery === "false") {
      received = false;
    }

    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;
    if (received !== undefined) where.received = received;

    if (gender) where.gender = gender;
    if (ethnicity) where.ethnicity = ethnicity;
    if (residence) where.residence = residence;

    if (search) {
      where.OR = [{ name_unaccented: { contains: removeAccents(search) } }, { cccd_last4: search.slice(-4) }];
    }

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
    } else if (dateFrom || dateTo) {
      const range: Record<string, string> = {};
      if (dateFrom) range.gte = dateFrom;
      if (dateTo) range.lte = dateTo;
      where.dob = range;
    }

    if (day) {
      const dayStr = day.padStart(2, "0");
      const dayConditions = [
        { dob: { startsWith: `${dayStr}/` } },
        { dob: { startsWith: `${day}/` } },
        { dob: { contains: `-${dayStr}` } },
        { dob: { contains: `-${day}` } },
      ];
      if (!where.AND) where.AND = [];
      (where.AND as any[]).push({ OR: dayConditions });
    }

    if (month) {
      const monthStr = month.padStart(2, "0");
      const monthConditions = [
        { dob: { contains: `/${monthStr}/` } },
        { dob: { contains: `/${month}/` } },
        { dob: { contains: `-${monthStr}-` } },
        { dob: { contains: `-${month}-` } },
      ];
      if (!where.AND) where.AND = [];
      (where.AND as any[]).push({ OR: monthConditions });
    }

    const rawSortKey = (req.query.sortKey as string) || "stt";
    const sortField = SORT_KEY_MAP[rawSortKey] || "stt";
    const sortDirection = ((req.query.sortDirection as string) || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const orderBy = { [sortField]: sortDirection };

    let items: any[] = [];
    let total = 0;
    const validMilestone = milestone && milestone !== "all" ? milestone : undefined;
    if (validMilestone && ["age60", "age65", "age70", "age75", "age80", "age85", "age90", "age95", "age100", "age_over_100"].includes(validMilestone)) {
      const allRows = await prisma.chuctho_profiles.findMany({ where, orderBy, include: { village: true } });
      const filtered = allRows
        .map((p) => formatPolicyProfile(p, targetYear))
        .filter((p: any) => p[validMilestone] === "x");
      total = filtered.length;
      items = filtered.slice((page - 1) * limit, page * limit);
    } else {
      const [rows, cnt] = await Promise.all([
        prisma.chuctho_profiles.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy, include: { village: true } }),
        prisma.chuctho_profiles.count({ where }),
      ]);
      total = cnt;
      items = rows.map((p) => formatPolicyProfile(p, targetYear));
    }





    res.json({ success: true, data: items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách chúc thọ" });
  }
};

export const getChucthoStream = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear || req.query.year;
    const targetYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : new Date().getFullYear();

    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;


    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    let closed = false;
    req.on("close", () => { closed = true; });

    const profiles = await prisma.chuctho_profiles.findMany({ where, orderBy: { stt: "asc" } });
    for (const p of profiles) {
      if (closed) break;
      res.write(JSON.stringify(formatPolicyProfile(p, targetYear)) + "\n");
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Lỗi xuất stream dữ liệu" });
  }
};

export const createChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, dob, cccd, stt, gender, ethnicity, residence, notes } = req.body;
    const village_id = req.body.village_id || req.body.villageId;
    const current_address = req.body.current_address || req.body.currentAddress;
    const calculation_year = req.body.calculation_year || req.body.calculationYear;

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
    res.status(201).json({ success: true, data: formatPolicyProfile(profile) });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi tạo hồ sơ chúc thọ" });
  }
};

export const updateChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    const current = await prisma.chuctho_profiles.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      res.status(404).json({ error: "Không tìm thấy hồ sơ" });
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
      if (parsed) Object.assign(data, computeChucthoMilestones(parsed.year, calcYear));
    }
    if (cccd) {
      const reEnc = encryptCCCD(cccd);
      Object.assign(data, { cccd: reEnc.encrypted, cccd_hash: reEnc.hash, cccd_last4: reEnc.last4 });
    }

    const updated = await prisma.chuctho_profiles.update({ where: { id }, data });
    res.json({ success: true, data: formatPolicyProfile(updated) });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi khi cập nhật hồ sơ" });
  }
};

export const markChucthoReceived = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    const received = req.body.received !== undefined ? Boolean(req.body.received) : true;
    const updated = await prisma.chuctho_profiles.update({ where: { id }, data: { received } });
    res.json({ success: true, data: formatPolicyProfile(updated) });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi cập nhật trạng thái nhận quà" });
  }
};

export const deleteChucthoProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" });
      return;
    }
    await prisma.chuctho_profiles.update({ where: { id }, data: { is_deleted: true, deleted_at: new Date() } });
    res.json({ success: true, message: "Đã xóa hồ sơ thành công" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Hồ sơ không tồn tại" });
      return;
    }
    res.status(500).json({ error: "Lỗi khi xóa hồ sơ" });
  }
};
