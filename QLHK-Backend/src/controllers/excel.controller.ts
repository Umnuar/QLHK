import type { Response } from "express";
import crypto from "crypto";
import fs from "fs";
import { config } from "../config/env";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { logAudit } from "../utils/audit";
import { encryptCCCD, removeAccents } from "../utils/crypto";
import {
	type ExcelParseResult,
	parseNhanHoKhauExcel,
} from "../utils/excelParser";

function getExcelSource(req: any): Buffer | string {
	if (req.file && req.file.buffer) {
		return req.file.buffer;
	}
	if (req.file && req.file.path) {
		return req.file.path;
	}
	if (fs.existsSync(config.excelSamplePath)) {
		return config.excelSamplePath;
	}
	throw new Error(
		`Không tìm thấy file Excel. Vui lòng upload file hoặc cấu hình đường dẫn file hợp lệ (Mặc định: ${config.excelSamplePath})`,
	);
}

/**
 * POST /api/excel/preview
 * Bóc tách và xem trước dữ liệu file Excel kèm danh sách cảnh báo
 */
export const previewExcel = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const source = getExcelSource(req);
		const parsed: ExcelParseResult = await parseNhanHoKhauExcel(source);

		res.json({
			success: true,
			message: "Bóc tách dữ liệu Excel thành công",
			data: parsed,
		});
	} catch (error: any) {
		console.error("Lỗi previewExcel:", error);
		res.status(400).json({
			success: false,
			error: error.message || "Lỗi bóc tách file Excel",
		});
	}
};

/**
 * POST /api/excel/import
 * Thực thi Transaction lưu toàn bộ các hộ và nhân khẩu vào CSDL
 */
export const importExcel = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		let targetVillageId = req.user?.village_id;

		if (!targetVillageId) {
			// Nếu là Admin, lấy village_id từ body
			targetVillageId = req.body.village_id || req.body.villageId;
		}

		// Nếu vẫn chưa có village_id, tìm Thôn 1 làm mặc định hoặc từ tên thôn bóc tách
		if (!targetVillageId) {
			const firstVillage = await prisma.villages.findFirst({
				orderBy: { name: "asc" },
			});
			if (firstVillage) {
				targetVillageId = firstVillage.id;
			} else {
				res
					.status(400)
					.json({ error: "Chưa có thôn trong CSDL để liên kết dữ liệu" });
				return;
			}
		}

		// Lấy dữ liệu parsed từ body hoặc parse trực tiếp từ file
		let parseResult: ExcelParseResult;
		if (req.body.households && Array.isArray(req.body.households)) {
			parseResult = {
				sheet_name: "Custom",
				total_households: req.body.households.length,
				total_citizens: req.body.households.reduce(
					(acc: number, h: any) => acc + (h.members?.length || 0),
					0,
				),
				households: req.body.households,
				warnings: [],
				errors: [],
			};
		} else {
			const source = getExcelSource(req);
			parseResult = await parseNhanHoKhauExcel(source);
		}

		if (!parseResult.households || parseResult.households.length === 0) {
			res.status(400).json({ error: "Không có dữ liệu hộ khẩu để nhập" });
			return;
		}

		// Thực thi theo từng batch 100 hộ để tối ưu hoá PostgreSQL I/O transaction và tránh khóa bảng quá lâu
		const CHUNK_SIZE = 100;
		let insertedHouseholds = 0;
		let insertedCitizens = 0;

		const totalHouseholds = parseResult.households.length;
		for (let i = 0; i < totalHouseholds; i += CHUNK_SIZE) {
			const chunk = parseResult.households.slice(i, i + CHUNK_SIZE);
			const householdsData: any[] = [];
			const allCitizensData: any[] = [];

			for (const h of chunk) {
				const householdId = crypto.randomUUID();
				householdsData.push({
					id: householdId,
					village_id: targetVillageId!,
					book_number: h.book_number,
					address:
						(h.address && String(h.address).trim()) ||
						(parseResult.village_name
							? `Thôn ${parseResult.village_name}`.trim()
							: null),
					status: (h.status && String(h.status).trim()) || "active",
					version: 1,
					is_deleted: false,
				});

				for (const m of (h.members || []) as any[]) {
					let cccdCipher: string | null = null;
					let cccdHash: string | null = null;
					let cccdLast4: string | null = null;

					const rawCccd = typeof m.cccd === "string" ? m.cccd.trim() : "";
					const isInvalidCccd =
						!rawCccd ||
						rawCccd.toLowerCase().includes("chưa có") ||
						rawCccd.includes("a có") ||
						rawCccd.includes("•") ||
						rawCccd === "—" ||
						rawCccd === "-";
					if (!isInvalidCccd && /^\d{9,12}$/.test(rawCccd)) {
						const enc = encryptCCCD(rawCccd);
						cccdCipher = enc.encrypted;
						cccdHash = enc.hash;
						cccdLast4 = enc.last4;
					}

					const fullName = (m.full_name || "").trim();

					allCitizensData.push({
						household_id: householdId,
						stt: m.stt,
						is_head: Boolean(m.is_head),
						relationship:
							m.relationship || (m.is_head ? "Chủ hộ" : "Thành viên"),
						full_name: fullName,
						name_unaccented: removeAccents(fullName),
						dob: m.dob || null,
						gender: m.gender || "Nam",
						cccd: cccdCipher,
						cccd_hash: cccdHash,
						cccd_last4: cccdLast4,
						ethnicity: m.ethnicity || "Kinh",
						religion: m.religion || "Không",
						education: m.education ? String(m.education).trim() : null,
						military_status: m.military_status ? String(m.military_status).trim() : null,
						occupation: m.occupation ? String(m.occupation).trim() : null,
						native_place: m.native_place ? String(m.native_place).trim() : null,
						notes: m.notes || null,
						version: 1,
						is_deleted: false,
					});
				}
			}

			await prisma.$transaction(
				async (tx) => {
					if (householdsData.length > 0) {
						await tx.households.createMany({ data: householdsData });
						insertedHouseholds += householdsData.length;
					}
					if (allCitizensData.length > 0) {
						await tx.citizens.createMany({ data: allCitizensData });
						insertedCitizens += allCitizensData.length;
					}
				},
				{
					timeout: 30000,
				},
			);
		}

		const importStats = { insertedHouseholds, insertedCitizens };

		await logAudit({
			userId: req.user?.id,
			action: "IMPORT",
			entityType: "excel_import",
			villageId: targetVillageId,
			newValues: {
				village_id: targetVillageId,
				imported_households: importStats.insertedHouseholds,
				imported_citizens: importStats.insertedCitizens,
			},
			ipAddress: req.ip,
		});

		res.json({
			success: true,
			message: `Nhập dữ liệu thành công: ${importStats.insertedHouseholds} hộ, ${importStats.insertedCitizens} nhân khẩu`,
			data: importStats,
		});
	} catch (error: any) {
		console.error("Lỗi importExcel:", error);
		res.status(500).json({
			success: false,
			error: error.message || "Lỗi lưu dữ liệu vào CSDL",
		});
	}
};
