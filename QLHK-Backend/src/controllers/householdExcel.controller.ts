import type { Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

function splitVietnameseName(fullName: string): { lastName: string; firstName: string } {
	const trimmed = (fullName || "").trim();
	if (!trimmed) return { lastName: "", firstName: "" };
	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return { lastName: "", firstName: parts[0].toUpperCase() };
	}
	const firstName = parts[parts.length - 1].toUpperCase();
	const lastName = parts.slice(0, -1).join(" ").toUpperCase();
	return { lastName, firstName };
}

function calculateAgeAndDob(dobRaw: string | null | undefined): { dob: string; age: number | "" } {
	if (!dobRaw) return { dob: "", age: "" };
	const str = String(dobRaw).trim();
	const currentYear = new Date().getFullYear();
	const match = str.match(/(\d{4})/);
	if (match) {
		const year = parseInt(match[1], 10);
		if (year > 1900 && year <= currentYear) {
			return { dob: str, age: currentYear - year };
		}
	}
	return { dob: str, age: "" };
}

function mapReligionCode(religion: string | null | undefined, notes: string | null | undefined): { code: string; note: string } {
	if (!religion) return { code: "", note: notes || "" };
	const r = religion.trim().toLowerCase();
	if (r.includes("công giáo")) return { code: "CG", note: notes || "Công giáo" };
	if (r.includes("tin lành")) return { code: "TL", note: notes || "Tin lành" };
	if (r.includes("phật giáo")) return { code: "PG", note: notes || "Phật giáo" };
	if (r === "không" || r === "none") return { code: "", note: notes || "" };
	return { code: religion.trim(), note: notes || religion.trim() };
}

export const exportHouseholdExcel = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const rawVillageId = (req.query.village_id || req.query.villageId || req.body?.village_id || req.body?.villageId) as string;
		const villageId = req.user?.role === "admin" ? (rawVillageId || req.user?.village_id) : req.user?.village_id;

		const where: any = { is_deleted: false };
		if (villageId) {
			where.village_id = villageId;
		}

		const householdIds = req.body?.household_ids || req.body?.householdIds || (req.query.household_ids ? String(req.query.household_ids).split(",") : undefined);
		if (Array.isArray(householdIds) && householdIds.length > 0) {
			where.id = { in: householdIds.filter(Boolean) };
		}

		const status = (req.query.status || req.body?.status) as string;
		if (status && status !== "all" && status !== "Tất cả") {
			const s = status.trim();
			if (s === "Thường trú" || s === "active") {
				where.status = { in: ["active", "Thường trú"] };
			} else if (s === "Tạm trú" || s === "temporary") {
				where.status = { in: ["temporary", "Tạm trú"] };
			} else if (s === "Tạm vắng" || s === "absent") {
				where.status = { in: ["absent", "Tạm vắng"] };
			} else if (s === "Đã chuyển đi" || s === "moved") {
				where.status = { in: ["moved", "Đã chuyển đi"] };
			} else {
				where.status = s;
			}
		}

		const search = (req.query.search || req.body?.search) as string;
		if (search && search.trim()) {
			const trimmed = search.trim();
			where.OR = [
				{ book_number: { contains: trimmed, mode: "insensitive" } },
				{ address: { contains: trimmed, mode: "insensitive" } },
				{ citizens: { some: { full_name: { contains: trimmed, mode: "insensitive" }, is_deleted: false } } },
			];
		}

		const [households, targetVillage] = await Promise.all([
			prisma.households.findMany({
				where,
				orderBy: [{ book_number: "asc" }, { created_at: "asc" }],
				include: {
					village: true,
					citizens: {
						where: { is_deleted: false },
						orderBy: [{ is_head: "desc" }, { stt: "asc" }, { created_at: "asc" }],
					},
				},
			}),
			villageId ? prisma.villages.findUnique({ where: { id: villageId } }) : null,
		]);

		const villageName = targetVillage?.name || (households.length > 0 && households.every(h => h.village_id === households[0].village_id) ? households[0].village?.name : "");

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Dl Hộ", {
			pageSetup: { paperSize: 9, orientation: "landscape" },
		});

		sheet.getColumn(1).width = 6;
		sheet.getColumn(2).width = 9;
		sheet.getColumn(3).width = 12;
		sheet.getColumn(4).width = 22;
		sheet.getColumn(5).width = 12;
		sheet.getColumn(6).width = 18;
		sheet.getColumn(7).width = 8;
		sheet.getColumn(8).width = 8;
		sheet.getColumn(9).width = 15;
		sheet.getColumn(10).width = 12;
		sheet.getColumn(11).width = 20;

		sheet.getCell("A1").value = "UBND TỈNH QUẢNG NGÃI\nUBND XÃ ĐĂK HÀ";
		sheet.getCell("A1").font = { name: "Times New Roman", size: 10, bold: true };
		sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
		sheet.mergeCells("A1:D1");

		sheet.getCell("F1").value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự Do - Hạnh Phúc";
		sheet.getCell("F1").font = { name: "Times New Roman", size: 10, bold: true };
		sheet.getCell("F1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
		sheet.mergeCells("F1:J1");

		sheet.getCell("A2").value = "THÔN: " + (villageName || "....................");
		sheet.getCell("A2").font = { name: "Times New Roman", size: 10, bold: true };
		sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
		sheet.mergeCells("A2:D2");

		sheet.getCell("F2").value = "Đăk Hà, ngày      tháng      năm";
		sheet.getCell("F2").font = { name: "Times New Roman", size: 10, italic: true };
		sheet.getCell("F2").alignment = { horizontal: "center", vertical: "middle" };
		sheet.mergeCells("F2:J2");

		sheet.getCell("A3").value = "DỮ LIỆU HỘ - NHÂN KHẨU";
		sheet.getCell("A3").font = { name: "Times New Roman", size: 14, bold: true };
		sheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
		sheet.mergeCells("A3:K3");

		sheet.getRow(1).height = 30;
		sheet.getRow(2).height = 20;
		sheet.getRow(3).height = 28;
		sheet.getRow(4).height = 12;
		sheet.getRow(5).height = 24;
		sheet.getRow(6).height = 24;

		sheet.getCell("A5").value = "STT";
		sheet.getCell("B5").value = "HỘ GIA ĐÌNH";
		sheet.getCell("B6").value = "Chủ hộ";
		sheet.getCell("C6").value = "Thành viên";
		sheet.getCell("D5").value = "HỌ VÀ TÊN";
		sheet.getCell("F5").value = "PHÂN TÍCH HỘ GIA ĐÌNH";
		sheet.getCell("F6").value = "Ngày, tháng, năm sinh ";
		sheet.getCell("G6").value = "Tuổi";
		sheet.getCell("H6").value = "Nữ";
		sheet.getCell("I6").value = "DTTS";
		sheet.getCell("J6").value = "Tôn giáo";
		sheet.getCell("K5").value = "Ghi chú";

		sheet.mergeCells("A5:A6");
		sheet.mergeCells("B5:C5");
		sheet.mergeCells("D5:E6");
		sheet.mergeCells("F5:J5");
		sheet.mergeCells("K5:K6");

		const thinBorder: Partial<ExcelJS.Borders> = {
			top: { style: "thin", color: { argb: "FF000000" } },
			left: { style: "thin", color: { argb: "FF000000" } },
			bottom: { style: "thin", color: { argb: "FF000000" } },
			right: { style: "thin", color: { argb: "FF000000" } },
		};

		for (let r = 5; r <= 6; r++) {
			const row = sheet.getRow(r);
			for (let c = 1; c <= 11; c++) {
				const cell = row.getCell(c);
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFCCE5EE" },
				};
				cell.font = { name: "Times New Roman", size: 10, bold: true };
				cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
				cell.border = thinBorder;
			}
		}

		let currentStt = 1;
		let currentRowIndex = 7;

		const genderFilter = ((req.query.gender || req.body?.gender) as string)?.trim()?.toLowerCase();
		const ethnicityFilter = ((req.query.ethnicity || req.body?.ethnicity) as string)?.trim()?.toLowerCase();

		for (const hh of households) {
			let memberIndex = 1;
			for (const c of hh.citizens) {
				if (genderFilter) {
					const cGender = (c.gender || "").toLowerCase();
					if (genderFilter === "nữ" && cGender !== "nữ" && cGender !== "f") continue;
					if (genderFilter === "nam" && (cGender === "nữ" || cGender === "f")) continue;
				}
				if (ethnicityFilter) {
					const cEthnicity = (c.ethnicity || "").toLowerCase();
					if (!cEthnicity.includes(ethnicityFilter)) continue;
				}

				const { lastName, firstName } = splitVietnameseName(c.full_name);
				const { dob, age } = calculateAgeAndDob(c.dob);
				const isFemale = c.gender && (c.gender.toLowerCase() === "nữ" || c.gender.toLowerCase() === "f");
				const { code: religionCode, note: religionNote } = mapReligionCode(c.religion, c.notes);

				const row = sheet.getRow(currentRowIndex);
				row.height = 20;

				row.getCell(1).value = currentStt;
				row.getCell(2).value = c.is_head ? "CH" : "";
				row.getCell(3).value = memberIndex;
				row.getCell(4).value = lastName;
				row.getCell(5).value = firstName;
				row.getCell(6).value = dob;
				row.getCell(7).value = age;
				row.getCell(8).value = isFemale ? "X" : "";
				row.getCell(9).value = c.ethnicity || "";
				row.getCell(10).value = religionCode;
				row.getCell(11).value = religionNote;

				for (let colIdx = 1; colIdx <= 11; colIdx++) {
					const cell = row.getCell(colIdx);
					cell.font = { name: "Times New Roman", size: 11 };
					cell.border = thinBorder;
					if ([1, 2, 3, 6, 7, 8, 10].includes(colIdx)) {
						cell.alignment = { horizontal: "center", vertical: "middle" };
					} else {
						cell.alignment = { horizontal: "left", vertical: "middle" };
					}
				}

				currentStt++;
				memberIndex++;
				currentRowIndex++;
			}
		}

		res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		res.setHeader("Content-Disposition", 'attachment; filename="NhanHoKhau_DakHa.xlsx"');
		await workbook.xlsx.write(res);
		res.end();
	} catch (error) {
		console.error("Lỗi xuất Excel:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: "Lỗi xuất file Excel dữ liệu hộ và nhân khẩu" });
		}
	}
};
