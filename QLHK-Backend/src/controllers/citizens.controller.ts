import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { logAudit } from "../utils/audit";
import {
	decryptCCCD,
	encryptCCCD,
	hashCCCD,
	removeAccents,
} from "../utils/crypto";

export const getCitizens = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const {
			householdId,
			villageId,
			search,
			cccd,
			gender,
			ethnicity,
			religion,
			isHead,
			page = "1",
			limit = "20",
			includeDeleted = "false",
		} = req.query;

		const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
		const take = Math.max(
			1,
			Math.min(100, parseInt(limit as string, 10) || 20),
		);
		const skip = (pageNum - 1) * take;

		const where: any = {};

		if (includeDeleted !== "true") {
			where.is_deleted = false;
		}

		if (householdId) {
			where.household_id = householdId as string;
		}

		// Village scoping through household
		const effectiveVillageId = req.user?.village_id || (villageId as string);
		if (effectiveVillageId) {
			where.household = { village_id: effectiveVillageId, is_deleted: false };
		}

		if (gender) {
			where.gender = gender as string;
		}

		if (ethnicity) {
			where.ethnicity = ethnicity as string;
		}

		if (religion) {
			where.religion = religion as string;
		}

		if (isHead !== undefined) {
			where.is_head = isHead === "true";
		}

		// Tìm kiếm chính xác theo CCCD thông qua hash
		if (cccd && typeof cccd === "string" && cccd.trim()) {
			const cccdHash = hashCCCD(cccd.trim());
			where.cccd_hash = cccdHash;
		}

		// Tìm kiếm họ tên không dấu hoặc 4 số cuối CCCD
		if (search && typeof search === "string" && search.trim()) {
			const cleanSearch = removeAccents(search.trim());
			where.OR = [
				{ name_unaccented: { contains: cleanSearch } },
				{ full_name: { contains: search.trim() } },
				{ cccd_last4: { contains: search.trim() } },
			];
		}

		const [total, citizens] = await Promise.all([
			prisma.citizens.count({ where }),
			prisma.citizens.findMany({
				where,
				skip,
				take,
				orderBy: [{ created_at: "desc" }],
				include: {
					household: {
						select: {
							id: true,
							book_number: true,
							address: true,
							village_id: true,
							village: { select: { id: true, name: true, code: true } },
						},
					},
				},
			}),
		]);

		// Format output: không trả về chuỗi mã hóa cccd thô, chỉ trả cccd_last4
		const sanitized = citizens.map((c) => ({
			id: c.id,
			household_id: c.household_id,
			stt: c.stt,
			is_head: c.is_head,
			relationship: c.relationship,
			full_name: c.full_name,
			dob: c.dob,
			gender: c.gender,
			cccd_last4: c.cccd_last4,
			has_cccd: !!c.cccd,
			ethnicity: c.ethnicity,
			religion: c.religion,
			notes: c.notes,
			version: c.version,
			created_at: c.created_at,
			updated_at: c.updated_at,
			household: c.household,
		}));

		res.json({
			data: sanitized,
			pagination: {
				page: pageNum,
				limit: take,
				total,
				totalPages: Math.ceil(total / take),
			},
		});
	} catch (error) {
		console.error("Lỗi getCitizens:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy danh sách nhân khẩu" });
	}
};

export const getCitizenById = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);

		const citizen = await prisma.citizens.findUnique({
			where: { id },
			include: {
				household: {
					include: { village: true },
				},
			},
		});

		if (!citizen || citizen.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy thông tin nhân khẩu" });
			return;
		}

		// RBAC Check
		if (
			req.user?.village_id &&
			citizen.household.village_id !== req.user.village_id
		) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập nhân khẩu của thôn khác" });
			return;
		}

		res.json({
			data: {
				...citizen,
				cccd: undefined, // Không để lộ raw ciphertext
				has_cccd: !!citizen.cccd,
			},
		});
	} catch (error) {
		console.error("Lỗi getCitizenById:", error);
		res.status(500).json({ error: "Lỗi máy chủ" });
	}
};

export const revealCitizenCCCD = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);

		const citizen = await prisma.citizens.findUnique({
			where: { id },
			include: { household: true },
		});

		if (!citizen || citizen.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy nhân khẩu" });
			return;
		}

		if (
			req.user?.village_id &&
			citizen.household.village_id !== req.user.village_id
		) {
			res.status(403).json({ error: "Không có quyền" });
			return;
		}

		if (!citizen.cccd) {
			res.json({ cccd: null });
			return;
		}

		const plainCCCD = decryptCCCD(citizen.cccd);

		await logAudit({
			userId: req.user?.id,
			action: "UPDATE",
			entityType: "citizen",
			entityId: citizen.id,
			villageId: citizen.household.village_id,
			newValues: { action: "REVEAL_CCCD" },
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({ cccd: plainCCCD });
	} catch (error) {
		console.error("Lỗi revealCitizenCCCD:", error);
		res.status(500).json({ error: "Lỗi giải mã CCCD" });
	}
};

export const createCitizen = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const {
			household_id,
			stt,
			is_head,
			relationship,
			full_name,
			dob,
			gender,
			cccd,
			ethnicity,
			religion,
			notes,
		} = req.body;

		if (!household_id) {
			res
				.status(400)
				.json({ error: "Vui lòng cung cấp mã hộ gia đình (household_id)" });
			return;
		}

		if (!full_name || !full_name.trim()) {
			res.status(400).json({ error: "Vui lòng cung cấp họ và tên nhân khẩu" });
			return;
		}

		const household = await prisma.households.findUnique({
			where: { id: household_id },
		});

		if (!household || household.is_deleted) {
			res
				.status(404)
				.json({ error: "Hộ gia đình không tồn tại hoặc đã bị xóa" });
			return;
		}

		// RBAC Check
		if (req.user?.village_id && household.village_id !== req.user.village_id) {
			res
				.status(403)
				.json({ error: "Không có quyền thêm nhân khẩu vào hộ của thôn khác" });
			return;
		}

		let cccdCipher = null;
		let cccdHash = null;
		let cccdLast4 = null;

		if (cccd && typeof cccd === "string" && cccd.trim()) {
			const enc = encryptCCCD(cccd.trim());
			cccdCipher = enc.encrypted;
			cccdHash = enc.hash;
			cccdLast4 = enc.last4;
		}

		const cleanFullName = full_name.trim();

		const newCitizen = await prisma.$transaction(async (tx) => {
			if (is_head) {
				await tx.citizens.updateMany({
					where: { household_id, is_head: true, is_deleted: false },
					data: { is_head: false },
				});
			}
			return tx.citizens.create({
				data: {
					household_id,
					stt: stt ? Number(stt) : null,
					is_head: !!is_head,
					relationship:
						relationship?.trim() || (is_head ? "Chủ hộ" : "Thành viên"),
					full_name: cleanFullName,
					name_unaccented: removeAccents(cleanFullName),
					dob: dob?.trim() || null,
					gender: gender || "Nam",
					cccd: cccdCipher,
					cccd_hash: cccdHash,
					cccd_last4: cccdLast4,
					ethnicity: ethnicity?.trim() || "Kinh",
					religion: religion?.trim() || "Không",
					notes: notes?.trim() || null,
					version: 1,
					is_deleted: false,
				},
			});
		});

		await logAudit({
			userId: req.user?.id,
			action: "CREATE",
			entityType: "citizen",
			entityId: newCitizen.id,
			villageId: household.village_id,
			newValues: { ...newCitizen, cccd: "***" },
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.status(201).json({
			message: "Thêm nhân khẩu thành công",
			data: {
				...newCitizen,
				cccd: undefined,
				has_cccd: !!newCitizen.cccd,
			},
		});
	} catch (error) {
		console.error("Lỗi createCitizen:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi thêm nhân khẩu" });
	}
};

export const updateCitizen = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);
		const {
			stt,
			is_head,
			relationship,
			full_name,
			dob,
			gender,
			cccd,
			ethnicity,
			religion,
			notes,
			version,
		} = req.body;

		const current = await prisma.citizens.findUnique({
			where: { id },
			include: { household: true },
		});

		if (!current || current.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy nhân khẩu" });
			return;
		}

		// RBAC Check
		if (
			req.user?.village_id &&
			current.household.village_id !== req.user.village_id
		) {
			res
				.status(403)
				.json({ error: "Không có quyền cập nhật nhân khẩu thuộc thôn khác" });
			return;
		}

		// Optimistic Concurrency Control (OCC)
		const expectedVersion =
			version !== undefined && version !== null
				? Number(version)
				: current.version;

		if (
			version !== undefined &&
			version !== null &&
			Number(version) !== current.version
		) {
			res.status(409).json({
				error:
					"Dữ liệu nhân khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
				currentVersion: current.version,
				submittedVersion: version,
			});
			return;
		}

		const updateData: any = {
			version: { increment: 1 },
		};

		if (stt !== undefined) updateData.stt = Number(stt);
		if (is_head !== undefined) updateData.is_head = !!is_head;
		if (relationship !== undefined)
			updateData.relationship = relationship.trim();
		if (full_name !== undefined) {
			updateData.full_name = full_name.trim();
			updateData.name_unaccented = removeAccents(full_name.trim());
		}
		if (dob !== undefined) updateData.dob = dob ? dob.trim() : null;
		if (gender !== undefined) updateData.gender = gender;
		if (ethnicity !== undefined) updateData.ethnicity = ethnicity.trim();
		if (religion !== undefined) updateData.religion = religion.trim();
		if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

		if (cccd !== undefined) {
			if (cccd && cccd.trim()) {
				const enc = encryptCCCD(cccd.trim());
				updateData.cccd = enc.encrypted;
				updateData.cccd_hash = enc.hash;
				updateData.cccd_last4 = enc.last4;
			} else {
				updateData.cccd = null;
				updateData.cccd_hash = null;
				updateData.cccd_last4 = null;
			}
		}

		const updated = await prisma.$transaction(async (tx) => {
			if (is_head) {
				await tx.citizens.updateMany({
					where: {
						household_id: current.household_id,
						is_head: true,
						is_deleted: false,
						id: { not: id },
					},
					data: { is_head: false },
				});
			}

			const updateResult = await tx.citizens.updateMany({
				where: {
					id,
					version: expectedVersion,
					is_deleted: false,
				},
				data: updateData,
			});

			if (updateResult.count === 0) {
				const latest = await tx.citizens.findUnique({ where: { id } });
				throw new Error(`OCC_CONFLICT:${latest?.version ?? current.version}`);
			}

			return tx.citizens.findUniqueOrThrow({
				where: { id },
			});
		});

		await logAudit({
			userId: req.user?.id,
			action: "UPDATE",
			entityType: "citizen",
			entityId: updated.id,
			villageId: current.household.village_id,
			oldValues: { ...current, cccd: "***" },
			newValues: { ...updated, cccd: "***" },
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({
			message: "Cập nhật nhân khẩu thành công",
			data: {
				...updated,
				cccd: undefined,
				has_cccd: !!updated.cccd,
			},
		});
	} catch (error: any) {
		if (error?.message?.startsWith("OCC_CONFLICT:")) {
			const latestVersion = parseInt(error.message.split(":")[1], 10);
			res.status(409).json({
				error:
					"Dữ liệu nhân khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
				currentVersion: latestVersion,
				submittedVersion: req.body.version,
			});
			return;
		}
		console.error("Lỗi updateCitizen:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi cập nhật nhân khẩu" });
	}
};

export const deleteCitizen = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);

		const current = await prisma.citizens.findUnique({
			where: { id },
			include: { household: true },
		});

		if (!current || current.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy nhân khẩu" });
			return;
		}

		// RBAC Check
		if (
			req.user?.village_id &&
			current.household.village_id !== req.user.village_id
		) {
			res
				.status(403)
				.json({ error: "Không có quyền xóa nhân khẩu thuộc thôn khác" });
			return;
		}

		await prisma.citizens.update({
			where: { id },
			data: {
				is_deleted: true,
				deleted_at: new Date(),
				version: current.version + 1,
			},
		});

		await logAudit({
			userId: req.user?.id,
			action: "DELETE",
			entityType: "citizen",
			entityId: id,
			villageId: current.household.village_id,
			oldValues: { ...current, cccd: "***" },
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({ message: "Xóa mềm nhân khẩu thành công" });
	} catch (error) {
		console.error("Lỗi deleteCitizen:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa nhân khẩu" });
	}
};
