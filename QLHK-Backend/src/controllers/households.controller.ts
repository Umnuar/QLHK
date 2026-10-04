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

function formatHouseholdWithDecryptedCitizens(household: any) {
	if (!household) return household;
	const formattedCitizens = (household.citizens || []).map((c: any) => {
		let last4 = c.cccd_last4;
		if (!last4 && c.cccd) {
			try {
				const plainCCCD = decryptCCCD(c.cccd);
				if (plainCCCD && plainCCCD.length >= 4) {
					last4 = plainCCCD.slice(-4);
				}
			} catch (err) {
				console.warn(
					`[formatHouseholdWithDecryptedCitizens] Lỗi giải mã CCCD cho citizen ${c.id}:`,
					err,
				);
			}
		}
		const cccd_masked = last4
			? `••••••••${last4}`
			: c.cccd
				? "••••••••"
				: "Chưa có";

		return {
			...c,
			cccd: cccd_masked,
			cccd_masked,
			cccd_last4: last4 || null,
		};
	});

	return {
		...household,
		citizens: formattedCitizens,
	};
}

export const getHouseholds = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const {
			villageId,
			search,
			status,
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

		// Soft delete filter
		if (includeDeleted !== "true") {
			where.is_deleted = false;
		}

		// Village scoping
		if (req.user?.village_id) {
			where.village_id = req.user.village_id;
		} else if (villageId) {
			where.village_id = villageId as string;
		}

		// Status filter
		if (
			status &&
			typeof status === "string" &&
			status.trim() &&
			status !== "all" &&
			status !== "Tất cả"
		) {
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

		// Trích xuất query parameters bổ sung
		const targetYearStr = req.query.year;
		let targetYear = new Date().getFullYear();
		if (targetYearStr !== undefined && targetYearStr !== "") {
			const parsedYear = parseInt(targetYearStr as string, 10);
			if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
				res.status(400).json({
					error: "Năm tính toán (year) không hợp lệ (cho phép từ 1900 đến 2100)",
				});
				return;
			}
			targetYear = parsedYear;
		}
		const gender = req.query.gender as string | undefined;
		const ethnicity = req.query.ethnicity as string | undefined;

		// Lọc theo khoảng độ tuổi (minAge, maxAge)
		const minAStr = req.query.minAge;
		const maxAStr = req.query.maxAge;
		let minA: number | undefined;
		let maxA: number | undefined;

		if (minAStr !== undefined && minAStr !== "") {
			minA = parseInt(minAStr as string, 10);
			if (isNaN(minA) || minA < 0 || minA > 130) {
				res.status(400).json({
					error: "Độ tuổi tối thiểu (minAge) không hợp lệ (cho phép từ 0 đến 130)",
				});
				return;
			}
		}

		if (maxAStr !== undefined && maxAStr !== "") {
			maxA = parseInt(maxAStr as string, 10);
			if (isNaN(maxA) || maxA < 0 || maxA > 130) {
				res.status(400).json({
					error: "Độ tuổi tối đa (maxAge) không hợp lệ (cho phép từ 0 đến 130)",
				});
				return;
			}
		}

		if (minA !== undefined && maxA !== undefined && minA > maxA) {
			res.status(400).json({
				error: "Độ tuổi tối thiểu (minAge) không được lớn hơn độ tuổi tối đa (maxAge)",
			});
			return;
		}

		const hasMinA = minA !== undefined;
		const hasMaxA = maxA !== undefined;

		// Cập nhật logic lọc nhân khẩu trong hộ (citizenSomeConditions)
		const citizenSomeConditions: any = {
			is_deleted: false,
		};

		if (gender && (gender === "Nam" || gender === "Nữ")) {
			citizenSomeConditions.gender = gender;
		}

		if (ethnicity && typeof ethnicity === "string" && ethnicity.trim()) {
			const eth = ethnicity.trim();
			if (eth.toLowerCase() === "dtts") {
				citizenSomeConditions.ethnicity = { not: "Kinh" };
			} else if (
				eth.toLowerCase() !== "all" &&
				eth.toLowerCase() !== "tất cả"
			) {
				citizenSomeConditions.ethnicity = eth;
			}
		}

		if (hasMinA || hasMaxA) {
			let minBirthYear = 1900;
			let maxBirthYear = targetYear;

			if (hasMaxA) {
				minBirthYear = targetYear - maxA!;
			}
			if (hasMinA) {
				maxBirthYear = targetYear - minA!;
			}

			const startYear = Math.max(1900, minBirthYear);
			const endYear = Math.min(targetYear, maxBirthYear);
			const validYears: number[] = [];
			for (let y = startYear; y <= endYear; y++) {
				validYears.push(y);
				if (validYears.length >= 150) break;
			}

			if (validYears.length > 0) {
				citizenSomeConditions.OR = validYears.map((y) => ({
					dob: { contains: String(y) },
				}));
			}
		}

		if (Object.keys(citizenSomeConditions).length > 1) {
			where.citizens = {
				some: citizenSomeConditions,
			};
		}

		// Search filter (số sổ, địa chỉ, họ tên, hoặc CCCD)
		if (search && typeof search === "string" && search.trim()) {
			const q = search.trim();
			const cleanDigits = q.replace(/\D/g, "");
			const citizenOrConditions: any[] = [
				{ full_name: { contains: q } },
				{
					name_unaccented: { contains: removeAccents(q).toLowerCase() },
				},
			];

			if (cleanDigits.length === 9 || cleanDigits.length === 12) {
				const cccdHash = hashCCCD(cleanDigits);
				citizenOrConditions.push({ cccd_hash: cccdHash });
			}
			if (cleanDigits.length >= 4 && cleanDigits.length <= 12) {
				citizenOrConditions.push({ cccd_last4: { contains: cleanDigits.slice(-4) } });
			}

			where.OR = [
				{ book_number: { contains: q } },
				{ address: { contains: q } },
				{
					citizens: {
						some: {
							is_deleted: false,
							OR: citizenOrConditions,
						},
					},
				},
			];
		}

		const [total, households] = await Promise.all([
			prisma.households.count({ where }),
			prisma.households.findMany({
				where,
				skip,
				take,
				orderBy: { created_at: "desc" },
				include: {
					village: { select: { id: true, name: true, code: true } },
					citizens: {
						where: { is_deleted: false },
						orderBy: [{ is_head: "desc" }, { stt: "asc" }],
						select: {
							id: true,
							stt: true,
							is_head: true,
							relationship: true,
							full_name: true,
							dob: true,
							gender: true,
							cccd: true,
							cccd_last4: true,
							ethnicity: true,
							religion: true,
						},
					},
				},
			}),
		]);

		const formattedHouseholds = households.map(
			formatHouseholdWithDecryptedCitizens,
		);

		res.json({
			data: formattedHouseholds,
			pagination: {
				page: pageNum,
				limit: take,
				total,
				totalPages: Math.ceil(total / take),
			},
		});
	} catch (error) {
		console.error("Lỗi getHouseholds:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy danh sách hộ khẩu" });
	}
};

export const getHouseholdById = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);

		const household = await prisma.households.findUnique({
			where: { id },
			include: {
				village: true,
				citizens: {
					where: { is_deleted: false },
					orderBy: [{ is_head: "desc" }, { stt: "asc" }],
				},
			},
		});

		if (!household || household.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy thông tin hộ khẩu" });
			return;
		}

		// RBAC Check
		if (req.user?.village_id && household.village_id !== req.user.village_id) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập hộ khẩu của thôn khác" });
			return;
		}

		res.json({ data: formatHouseholdWithDecryptedCitizens(household) });
	} catch (error) {
		console.error("Lỗi getHouseholdById:", error);
		res.status(500).json({ error: "Lỗi máy chủ" });
	}
};

export const createHousehold = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { village_id, book_number, address, status = "active" } = req.body;
		const members = req.body.members || req.body.citizens;

		const targetVillageId = req.user?.village_id || village_id;
		if (!targetVillageId) {
			res.status(400).json({ error: "Vui lòng cung cấp thôn (village_id)" });
			return;
		}

		const finalBookNumber =
			book_number && typeof book_number === "string" && book_number.trim()
				? book_number.trim()
				: `HGD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

		const newHousehold = await prisma.$transaction(async (tx) => {
			const hh = await tx.households.create({
				data: {
					village_id: targetVillageId,
					book_number: finalBookNumber,
					address: address?.trim() || null,
					status,
					version: 1,
					is_deleted: false,
				},
			});

			if (Array.isArray(members) && members.length > 0) {
				for (let idx = 0; idx < members.length; idx++) {
					const m = members[idx];
					const enc = m.cccd ? encryptCCCD(m.cccd) : null;
					const cleanName = m.full_name?.trim() || "";
					const name_unaccented = removeAccents(cleanName);

					await tx.citizens.create({
						data: {
							household_id: hh.id,
							stt: m.stt ? Number(m.stt) : idx + 1,
							is_head: Boolean(m.is_head),
							relationship:
								m.relationship?.trim() || (m.is_head ? "Chủ hộ" : "Thành viên"),
							full_name: cleanName,
							name_unaccented,
							dob: m.dob?.trim() || null,
							gender: m.gender?.trim() || null,
							cccd: enc?.encrypted || null,
							cccd_hash: enc?.hash || null,
							cccd_last4: enc?.last4 || null,
							ethnicity: m.ethnicity?.trim() || null,
							religion: m.religion?.trim() || null,
							notes: m.notes?.trim() || null,
							version: 1,
							is_deleted: false,
						},
					});
				}
			}

			const fullHh = await tx.households.findUnique({
				where: { id: hh.id },
				include: {
					village: true,
					citizens: {
						where: { is_deleted: false },
						orderBy: [{ is_head: "desc" }, { stt: "asc" }],
					},
				},
			});

			return fullHh;
		});

		await logAudit({
			userId: req.user?.id,
			action: "CREATE",
			entityType: "household",
			entityId: newHousehold!.id,
			villageId: targetVillageId,
			newValues: {
				book_number: newHousehold!.book_number,
				address: newHousehold!.address,
				status: newHousehold!.status,
				village_name: newHousehold!.village?.name,
				head_name:
					newHousehold!.citizens?.find((c: any) => c.is_head)?.full_name ||
					"Chưa xác định",
				members_count: newHousehold!.citizens?.length || 0,
				citizens: newHousehold!.citizens?.map((c: any) => ({
					full_name: c.full_name,
					relationship: c.relationship,
					gender: c.gender,
					dob: c.dob,
					cccd_last4: c.cccd_last4,
					ethnicity: c.ethnicity,
					religion: c.religion,
				})),
			},
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.status(201).json({
			message: "Tạo hộ khẩu thành công",
			data: formatHouseholdWithDecryptedCitizens(newHousehold),
		});
	} catch (error) {
		console.error("Lỗi createHousehold:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi tạo hộ khẩu" });
	}
};

export const updateHousehold = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);
		const { book_number, address, status, version } = req.body;
		const members = req.body.members || req.body.citizens;

		const current = await prisma.households.findUnique({
			where: { id },
			include: {
				citizens: {
					where: { is_deleted: false },
					orderBy: [{ is_head: "desc" }, { stt: "asc" }],
				},
			},
		});
		if (!current || current.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy hộ khẩu" });
			return;
		}

		// RBAC Check
		if (req.user?.village_id && current.village_id !== req.user.village_id) {
			res
				.status(403)
				.json({ error: "Không có quyền cập nhật hộ khẩu của thôn khác" });
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
					"Dữ liệu hộ khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
				currentVersion: current.version,
				submittedVersion: version,
			});
			return;
		}

		const existingCitizens = current.citizens || [];

		const updated = await prisma.$transaction(async (tx) => {
			const updateResult = await tx.households.updateMany({
				where: {
					id,
					version: expectedVersion,
					is_deleted: false,
				},
				data: {
					book_number:
						book_number && typeof book_number === "string" && book_number.trim()
							? book_number.trim()
							: current.book_number,
					address: address !== undefined ? address.trim() : current.address,
					status: status !== undefined ? status : current.status,
					version: { increment: 1 },
				},
			});

			if (updateResult.count === 0) {
				const latest = await tx.households.findUnique({ where: { id } });
				throw new Error(`OCC_CONFLICT:${latest?.version ?? current.version}`);
			}

			if (Array.isArray(members)) {
				const processedIds = new Set<string>();

				for (let idx = 0; idx < members.length; idx++) {
					const m = members[idx];
					const existing = existingCitizens.find((c) => c.id === m.id);

					const isMasked =
						typeof m.cccd === "string" &&
						(m.cccd.includes("•") || m.cccd.includes("*"));
					const enc =
						m.cccd && !isMasked ? encryptCCCD(String(m.cccd).trim()) : null;
					const cleanName = m.full_name ? String(m.full_name).trim() : "";
					const name_unaccented = removeAccents(cleanName);

					if (existing) {
						processedIds.add(existing.id);

						const updateData: any = {
							full_name: cleanName || existing.full_name,
							name_unaccented: cleanName
								? name_unaccented
								: existing.name_unaccented,
							dob:
								m.dob !== undefined
									? m.dob
										? String(m.dob).trim()
										: null
									: existing.dob,
							gender:
								m.gender !== undefined
									? m.gender
										? String(m.gender).trim()
										: null
									: existing.gender,
							is_head: Boolean(m.is_head),
							relationship: m.relationship
								? String(m.relationship).trim()
								: m.is_head
									? "Chủ hộ"
									: "Thành viên",
							ethnicity:
								m.ethnicity !== undefined
									? m.ethnicity
										? String(m.ethnicity).trim()
										: null
									: existing.ethnicity,
							religion:
								m.religion !== undefined
									? m.religion
										? String(m.religion).trim()
										: null
									: existing.religion,
							notes:
								m.notes !== undefined
									? m.notes
										? String(m.notes).trim()
										: null
									: existing.notes,
							stt: m.stt ? Number(m.stt) : idx + 1,
							version: existing.version + 1,
						};

						if (enc) {
							updateData.cccd = enc.encrypted;
							updateData.cccd_hash = enc.hash;
							updateData.cccd_last4 = enc.last4;
						}

						await tx.citizens.update({
							where: { id: existing.id },
							data: updateData,
						});
					} else {
						const newCitizen = await tx.citizens.create({
							data: {
								household_id: id,
								stt: m.stt ? Number(m.stt) : idx + 1,
								is_head: Boolean(m.is_head),
								relationship:
									m.relationship?.trim() ||
									(m.is_head ? "Chủ hộ" : "Thành viên"),
								full_name: cleanName,
								name_unaccented,
								dob: m.dob ? String(m.dob).trim() : null,
								gender: m.gender ? String(m.gender).trim() : null,
								cccd: enc?.encrypted || null,
								cccd_hash: enc?.hash || null,
								cccd_last4: enc?.last4 || null,
								ethnicity: m.ethnicity ? String(m.ethnicity).trim() : null,
								religion: m.religion ? String(m.religion).trim() : null,
								notes: m.notes ? String(m.notes).trim() : null,
								version: 1,
								is_deleted: false,
							},
						});
						processedIds.add(newCitizen.id);
					}
				}

				const citizensToDelete = existingCitizens.filter(
					(c) => !processedIds.has(c.id),
				);
				for (const c of citizensToDelete) {
					await tx.citizens.update({
						where: { id: c.id },
						data: {
							is_deleted: true,
							deleted_at: new Date(),
							version: c.version + 1,
						},
					});
				}
			}

			const fullUpdated = await tx.households.findUnique({
				where: { id },
				include: {
					village: true,
					citizens: {
						where: { is_deleted: false },
						orderBy: [{ is_head: "desc" }, { stt: "asc" }],
					},
				},
			});

			return fullUpdated;
		});

		const currentMembers = updated?.citizens || [];
		const existingMap = new Map(existingCitizens.map((c: any) => [c.id, c]));
		const updatedMap = new Map(currentMembers.map((c: any) => [c.id, c]));

		const addedMembers = currentMembers
			.filter((c: any) => !existingMap.has(c.id))
			.map((c: any) => ({
				id: c.id,
				full_name: c.full_name,
				relationship: c.relationship,
				gender: c.gender,
				dob: c.dob,
				cccd_last4: c.cccd_last4,
				ethnicity: c.ethnicity,
				religion: c.religion,
			}));

		const removedMembers = existingCitizens
			.filter((c: any) => !updatedMap.has(c.id))
			.map((c: any) => ({
				id: c.id,
				full_name: c.full_name,
				relationship: c.relationship,
				gender: c.gender,
				dob: c.dob,
				cccd_last4: c.cccd_last4,
			}));

		const compareFields = [
			"full_name",
			"relationship",
			"gender",
			"dob",
			"ethnicity",
			"religion",
			"cccd_last4",
			"notes",
		] as const;
		const updatedMembers: any[] = [];
		for (const c of currentMembers) {
			const oldC = existingMap.get(c.id);
			if (!oldC) continue;
			const changedFields: Record<string, { from: any; to: any }> = {};
			for (const f of compareFields) {
				if ((oldC as any)[f] !== (c as any)[f]) {
					changedFields[f] = { from: (oldC as any)[f], to: (c as any)[f] };
				}
			}
			if (Object.keys(changedFields).length > 0) {
				updatedMembers.push({
					id: c.id,
					full_name: c.full_name,
					relationship: c.relationship,
					changes: changedFields,
				});
			}
		}

		const oldValues = {
			book_number: current.book_number,
			address: current.address,
			status: current.status,
			head_name:
				existingCitizens.find((c: any) => c.is_head)?.full_name || "Chưa rõ",
			members_count: existingCitizens.length,
		};

		const newValues = {
			book_number: updated!.book_number,
			address: updated!.address,
			status: updated!.status,
			head_name:
				updated!.citizens?.find((c: any) => c.is_head)?.full_name || "Chưa rõ",
			members_count: updated!.citizens?.length || 0,
			added_members: addedMembers,
			updated_members: updatedMembers,
			removed_members: removedMembers,
		};

		await logAudit({
			userId: req.user?.id,
			action: "UPDATE",
			entityType: "household",
			entityId: updated!.id,
			villageId: current.village_id,
			oldValues,
			newValues,
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({
			message: "Cập nhật hộ khẩu thành công",
			data: formatHouseholdWithDecryptedCitizens(updated),
		});
	} catch (error: any) {
		if (error?.message?.startsWith("OCC_CONFLICT:")) {
			const latestVersion = parseInt(error.message.split(":")[1], 10);
			res.status(409).json({
				error:
					"Dữ liệu hộ khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
				currentVersion: latestVersion,
				submittedVersion: req.body.version,
			});
			return;
		}
		console.error("Lỗi updateHousehold:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi cập nhật hộ khẩu" });
	}
};

export const deleteHousehold = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);

		const current = await prisma.households.findUnique({
			where: { id },
			include: {
				citizens: {
					where: { is_deleted: false },
				},
			},
		});
		if (!current || current.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy hộ khẩu" });
			return;
		}

		// RBAC Check
		if (req.user?.village_id && current.village_id !== req.user.village_id) {
			res
				.status(403)
				.json({ error: "Không có quyền xóa hộ khẩu của thôn khác" });
			return;
		}

		// Soft delete household and cascade soft-delete its citizens
		const now = new Date();
		await prisma.$transaction([
			prisma.households.update({
				where: { id },
				data: {
					is_deleted: true,
					deleted_at: now,
					version: current.version + 1,
				},
			}),
			prisma.citizens.updateMany({
				where: { household_id: id, is_deleted: false },
				data: {
					is_deleted: true,
					deleted_at: now,
				},
			}),
		]);

		await logAudit({
			userId: req.user?.id,
			action: "DELETE",
			entityType: "household",
			entityId: id,
			villageId: current.village_id,
			oldValues: {
				book_number: current.book_number,
				address: current.address,
				status: current.status,
				head_name:
					current.citizens?.find((c: any) => c.is_head)?.full_name || "Chưa rõ",
				members_count: current.citizens?.length || 0,
			},
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({ message: "Xóa mềm hộ khẩu thành công" });
	} catch (error) {
		console.error("Lỗi deleteHousehold:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa hộ khẩu" });
	}
};

export const restoreHousehold = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);
		const current = await prisma.households.findUnique({
			where: { id },
		});
		if (!current || !current.is_deleted) {
			res.status(404).json({ error: "Không tìm thấy hộ khẩu trong thùng rác" });
			return;
		}

		if (req.user?.village_id && current.village_id !== req.user.village_id) {
			res
				.status(403)
				.json({ error: "Không có quyền khôi phục hộ khẩu của thôn khác" });
			return;
		}

		const now = new Date();
		await prisma.$transaction([
			prisma.households.update({
				where: { id },
				data: {
					is_deleted: false,
					deleted_at: null,
					version: current.version + 1,
					updated_at: now,
				},
			}),
			prisma.citizens.updateMany({
				where: { household_id: id, is_deleted: true },
				data: {
					is_deleted: false,
					deleted_at: null,
					updated_at: now,
				},
			}),
		]);

		await logAudit({
			userId: req.user?.id,
			action: "RESTORE",
			entityType: "household",
			entityId: id,
			villageId: current.village_id,
			newValues: {
				book_number: current.book_number,
				address: current.address,
				status: current.status,
			},
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({ success: true, message: "Khôi phục hộ khẩu thành công" });
	} catch (error) {
		console.error("Lỗi restoreHousehold:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi khôi phục hộ khẩu" });
	}
};

export const batchDeleteHouseholds = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { ids } = req.body;
		if (!Array.isArray(ids) || ids.length === 0) {
			res.status(400).json({ error: "Danh sách ID không hợp lệ" });
			return;
		}

		const households = await prisma.households.findMany({
			where: { id: { in: ids }, is_deleted: false },
		});

		if (households.length === 0) {
			res.status(404).json({ error: "Không tìm thấy hộ khẩu nào cần xóa" });
			return;
		}

		if (req.user?.village_id) {
			const invalid = households.some(
				(h) => h.village_id !== req.user!.village_id,
			);
			if (invalid) {
				res
					.status(403)
					.json({ error: "Không có quyền xóa hộ khẩu của thôn khác" });
				return;
			}
		}

		const confirmedIds = households.map((h) => h.id);
		const now = new Date();

		await prisma.$transaction([
			prisma.households.updateMany({
				where: { id: { in: confirmedIds } },
				data: { is_deleted: true, deleted_at: now },
			}),
			prisma.citizens.updateMany({
				where: { household_id: { in: confirmedIds } },
				data: { is_deleted: true, deleted_at: now },
			}),
		]);

		for (const h of households) {
			await logAudit({
				userId: req.user?.id,
				action: "BULK_DELETE",
				entityType: "household",
				entityId: h.id,
				villageId: h.village_id,
				oldValues: { book_number: h.book_number, address: h.address },
				ipAddress: req.ip ? String(req.ip) : null,
			});
		}

		res.json({
			success: true,
			count: confirmedIds.length,
			message: `Đã xóa ${confirmedIds.length} hộ khẩu vào thùng rác`,
		});
	} catch (error) {
		console.error("Lỗi batchDeleteHouseholds:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa hàng loạt hộ khẩu" });
	}
};

export const hardDeleteHousehold = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		if (req.user?.role !== "admin") {
			res.status(403).json({ error: "Chỉ Admin mới có quyền xóa vĩnh viễn" });
			return;
		}

		const id = String(req.params.id);
		const current = await prisma.households.findUnique({
			where: { id },
		});
		if (!current) {
			res.status(404).json({ error: "Không tìm thấy hộ khẩu" });
			return;
		}

		await prisma.$transaction([
			prisma.citizens.deleteMany({ where: { household_id: id } }),
			prisma.households.delete({ where: { id } }),
		]);

		await logAudit({
			userId: req.user?.id,
			action: "HARD_DELETE",
			entityType: "household",
			entityId: id,
			villageId: current.village_id,
			oldValues: { book_number: current.book_number, address: current.address },
			ipAddress: req.ip ? String(req.ip) : null,
		});

		res.json({ success: true, message: "Đã xóa vĩnh viễn hộ khẩu" });
	} catch (error) {
		console.error("Lỗi hardDeleteHousehold:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa vĩnh viễn hộ khẩu" });
	}
};

export const getRecycleBin = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const where: any = {
			is_deleted: true,
		};

		if (req.user?.village_id) {
			where.village_id = req.user.village_id;
		}

		const deletedHouseholds = await prisma.households.findMany({
			where,
			include: {
				village: true,
				citizens: {
					orderBy: [{ is_head: "desc" }, { stt: "asc" }],
				},
			},
			orderBy: { deleted_at: "desc" },
		});

		res.json({
			success: true,
			data: deletedHouseholds.map(formatHouseholdWithDecryptedCitizens),
		});
	} catch (error) {
		console.error("Lỗi getRecycleBin:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy danh sách thùng rác" });
	}
};
