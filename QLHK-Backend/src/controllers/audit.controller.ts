import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

/**
 * GET /api/audit-logs
 * Lấy danh sách nhật ký kiểm toán (Audit Logs)
 *
 * Query params:
 * - limit: số lượng bản ghi (mặc định 50)
 * - offset / page: vị trí bắt đầu hoặc trang
 * - action: lọc theo hành động (CREATE | UPDATE | DELETE | RESTORE | IMPORT)
 * - entity_type: lọc theo loại đối tượng (household | citizen | excel_import)
 * - search: tìm kiếm theo entity_id, action, entity_type, old_values, new_values, ip_address
 * - village_id / villageId: lọc theo thôn (chỉ dành cho admin)
 *
 * RBAC:
 * - Admin: xem toàn xã hoặc lọc theo thôn nếu có
 * - Non-admin: chỉ xem nhật ký do cán bộ thuộc thôn mình thực hiện
 *
 * Nguyên tắc bất biến (Immutability):
 * - Không cung cấp API xóa, sửa hoặc phục hồi audit_logs
 */
export const getAuditLogs = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { action, entity_type, search } = req.query;

		const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
		const page = req.query.page
			? Math.max(1, parseInt(req.query.page as string))
			: 1;
		const offset =
			req.query.offset !== undefined
				? Math.max(0, parseInt(req.query.offset as string) || 0)
				: (page - 1) * limit;
		const currentPage =
			req.query.offset !== undefined ? Math.floor(offset / limit) + 1 : page;

		const where: any = {};

		if (action && typeof action === "string" && action.trim()) {
			where.action = action.trim();
		}

		if (entity_type && typeof entity_type === "string" && entity_type.trim()) {
			where.entity_type = entity_type.trim();
		}

		// Xử lý phân quyền (RBAC) theo phạm vi thôn/xã
		let targetVillageId: string | undefined;
		let villageCondition: any;

		if (req.user?.role === "admin") {
			targetVillageId = (req.params.village_id ||
				req.query.village_id ||
				req.query.villageId) as string | undefined;
			if (targetVillageId) {
				villageCondition = {
					OR: [
						{ village_id: targetVillageId },
						{ user: { village_id: targetVillageId } },
					],
				};
			}
		} else {
			targetVillageId = req.user?.village_id || undefined;
			if (targetVillageId) {
				villageCondition = {
					user: { village_id: targetVillageId },
				};
			}
		}

		if (
			villageCondition &&
			search &&
			typeof search === "string" &&
			search.trim()
		) {
			const searchTerm = search.trim();
			where.AND = [
				villageCondition,
				{
					OR: [
						{ entity_id: { contains: searchTerm } },
						{ action: { contains: searchTerm } },
						{ entity_type: { contains: searchTerm } },
						{ old_values: { contains: searchTerm } },
						{ new_values: { contains: searchTerm } },
						{ ip_address: { contains: searchTerm } },
					],
				},
			];
		} else if (villageCondition) {
			Object.assign(where, villageCondition);
		} else if (search && typeof search === "string" && search.trim()) {
			const searchTerm = search.trim();
			where.OR = [
				{ entity_id: { contains: searchTerm } },
				{ action: { contains: searchTerm } },
				{ entity_type: { contains: searchTerm } },
				{ old_values: { contains: searchTerm } },
				{ new_values: { contains: searchTerm } },
				{ ip_address: { contains: searchTerm } },
			];
		}

		const [total, logs] = await Promise.all([
			prisma.audit_logs.count({ where }),
			prisma.audit_logs.findMany({
				where,
				orderBy: { created_at: "desc" },
				take: limit,
				skip: offset,
				include: {
					village: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
					user: {
						select: {
							id: true,
							username: true,
							full_name: true,
							role: true,
							village_id: true,
						},
					},
				},
			}),
		]);

		const safeParse = (val: string | null) => {
			if (!val) return null;
			try {
				return JSON.parse(val);
			} catch {
				return val;
			}
		};

		const formattedLogs = logs.map((log) => ({
			...log,
			village_id: log.village_id || log.village?.id || null,
			village_name: log.village?.name || null,
			old_values: safeParse(log.old_values),
			new_values: safeParse(log.new_values),
		}));

		res.json({
			success: true,
			data: formattedLogs,
			pagination: {
				total,
				limit,
				offset,
				page: currentPage,
				totalPages: Math.ceil(total / limit) || 1,
			},
		});
	} catch (error) {
		console.error("Lỗi getAuditLogs:", error);
		res
			.status(500)
			.json({ error: "Lỗi máy chủ khi lấy danh sách nhật ký kiểm toán" });
	}
};
