import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export const getVillages = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const villages = await prisma.villages.findMany({
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				code: true,
				created_at: true,
				_count: {
					select: {
						households: {
							where: { is_deleted: false },
						},
					},
				},
			},
		});

		res.setHeader(
			"Cache-Control",
			"public, max-age=120, stale-while-revalidate=300",
		);
		res.json({
			success: true,
			data: villages.map((v) => ({
				id: v.id,
				name: v.name,
				code: v.code,
				household_count: v._count.households,
			})),
		});
	} catch (error) {
		console.error("Lỗi getVillages:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy danh sách thôn" });
	}
};

export const createVillage = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { name, code } = req.body;
		if (!name || typeof name !== "string" || !name.trim()) {
			res.status(400).json({ error: "Tên thôn không được để trống" });
			return;
		}

		const trimmedName = name.trim();
		const finalCode =
			code && typeof code === "string" && code.trim()
				? code.trim()
				: `THON_${Date.now()}`;

		// Kiểm tra trùng lặp tên
		const existingByName = await prisma.villages.findFirst({
			where: { name: trimmedName },
		});
		if (existingByName) {
			res.status(409).json({ error: "Tên thôn đã tồn tại" });
			return;
		}

		// Kiểm tra trùng lặp mã
		const existingByCode = await prisma.villages.findFirst({
			where: { code: finalCode },
		});
		if (existingByCode) {
			res.status(409).json({ error: "Mã thôn đã tồn tại" });
			return;
		}

		const village = await prisma.villages.create({
			data: {
				name: trimmedName,
				code: finalCode,
			},
		});

		res.status(201).json({
			success: true,
			data: village,
			message: "Tạo thôn mới thành công",
		});
	} catch (error) {
		console.error("Lỗi createVillage:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi tạo thôn" });
	}
};

export const updateVillage = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);
		const { name, code } = req.body;

		const current = await prisma.villages.findUnique({
			where: { id },
		});
		if (!current) {
			res.status(404).json({ error: "Không tìm thấy thôn" });
			return;
		}

		if (name !== undefined) {
			if (typeof name !== "string" || !name.trim()) {
				res.status(400).json({ error: "Tên thôn không được để trống" });
				return;
			}
			const trimmedName = name.trim();
			if (trimmedName !== current.name) {
				const dup = await prisma.villages.findFirst({
					where: { name: trimmedName, NOT: { id } },
				});
				if (dup) {
					res.status(409).json({ error: "Tên thôn đã tồn tại" });
					return;
				}
			}
		}

		if (code !== undefined) {
			if (typeof code !== "string" || !code.trim()) {
				res.status(400).json({ error: "Mã thôn không được để trống" });
				return;
			}
			const trimmedCode = code.trim();
			if (trimmedCode !== current.code) {
				const dup = await prisma.villages.findFirst({
					where: { code: trimmedCode, NOT: { id } },
				});
				if (dup) {
					res.status(409).json({ error: "Mã thôn đã tồn tại" });
					return;
				}
			}
		}

		const updated = await prisma.villages.update({
			where: { id },
			data: {
				...(name !== undefined && { name: name.trim() }),
				...(code !== undefined && { code: code.trim() }),
			},
		});

		res.json({
			success: true,
			data: updated,
			message: "Cập nhật thôn thành công",
		});
	} catch (error) {
		console.error("Lỗi updateVillage:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi cập nhật thôn" });
	}
};

export const deleteVillage = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const id = String(req.params.id);
		const current = await prisma.villages.findUnique({
			where: { id },
		});
		if (!current) {
			res.status(404).json({ error: "Không tìm thấy thôn" });
			return;
		}

		// Kiểm tra số lượng hộ khẩu trong thôn
		const householdCount = await prisma.households.count({
			where: { village_id: id, is_deleted: false },
		});

		// Thực hiện trong transaction: hủy liên kết user, xóa hộ dân và công dân liên quan, rồi xóa thôn
		await prisma.$transaction(async (tx) => {
			// 1. Hủy liên kết người dùng với thôn bị xóa
			await tx.users.updateMany({
				where: { village_id: id },
				data: { village_id: null },
			});

			// 2. Hủy liên kết audit logs với thôn bị xóa để tránh vi phạm foreign key
			await tx.audit_logs.updateMany({
				where: { village_id: id },
				data: { village_id: null },
			});

			// 2. Lấy danh sách households thuộc thôn để xóa các citizens trước
			const households = await tx.households.findMany({
				where: { village_id: id },
				select: { id: true },
			});
			const householdIds = households.map((h) => h.id);

			if (householdIds.length > 0) {
				await tx.citizens.deleteMany({
					where: { household_id: { in: householdIds } },
				});
				await tx.households.deleteMany({
					where: { id: { in: householdIds } },
				});
			}

			// 3. Xóa thôn
			await tx.villages.delete({
				where: { id },
			});
		});

		res.json({
			success: true,
			message: "Xóa thôn thành công",
			deletedHouseholdCount: householdCount,
		});
	} catch (error) {
		console.error("Lỗi deleteVillage:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa thôn" });
	}
};
