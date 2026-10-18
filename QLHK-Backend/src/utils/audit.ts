import { prisma } from "../config/prisma";

export interface AuditParams {
	userId?: string | null;
	action:
		| "CREATE"
		| "UPDATE"
		| "DELETE"
		| "RESTORE"
		| "IMPORT"
		| "BULK_DELETE"
		| "HARD_DELETE";
	entityType: "household" | "citizen" | "excel_import";
	entityId?: string | null;
	oldValues?: any;
	newValues?: any;
	ipAddress?: string | null;
	villageId?: string | null;
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function logAudit(params: AuditParams) {
	try {
		let validUserId = params.userId || null;
		if (validUserId) {
			if (!UUID_REGEX.test(validUserId)) {
				validUserId = null;
			} else {
				const userExists = await prisma.users.findUnique({
					where: { id: validUserId },
					select: { id: true },
				});
				if (!userExists) {
					validUserId = null;
				}
			}
		}

		let validVillageId = params.villageId || null;
		if (validVillageId && !UUID_REGEX.test(validVillageId)) {
			validVillageId = null;
		}

		await prisma.audit_logs.create({
			data: {
				village_id: validVillageId,
				user_id: validUserId,
				action: params.action,
				entity_type: params.entityType,
				entity_id: params.entityId || null,
				old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
				new_values: params.newValues ? JSON.stringify(params.newValues) : null,
				ip_address: params.ipAddress || null,
			},
		});
	} catch (error) {
		// Audit logging should not crash the primary operation
		console.error("Lỗi khi ghi audit log:", error);
	}
}

export async function logAuditBatch(items: AuditParams[]): Promise<void> {
	if (!items || items.length === 0) return;
	try {
		const uniqueUserIds = Array.from(
			new Set(
				items
					.map((item) => item.userId)
					.filter((id): id is string => Boolean(id && UUID_REGEX.test(id))),
			),
		);

		const validUserSet = new Set<string>();
		if (uniqueUserIds.length > 0) {
			const existingUsers = await prisma.users.findMany({
				where: { id: { in: uniqueUserIds } },
				select: { id: true },
			});
			for (const u of existingUsers) {
				validUserSet.add(u.id);
			}
		}

		const entries = items.map((params) => {
			let validUserId = params.userId || null;
			if (
				validUserId &&
				(!UUID_REGEX.test(validUserId) || !validUserSet.has(validUserId))
			) {
				validUserId = null;
			}

			let validVillageId = params.villageId || null;
			if (validVillageId && !UUID_REGEX.test(validVillageId)) {
				validVillageId = null;
			}

			return {
				village_id: validVillageId,
				user_id: validUserId,
				action: params.action,
				entity_type: params.entityType,
				entity_id: params.entityId || null,
				old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
				new_values: params.newValues ? JSON.stringify(params.newValues) : null,
				ip_address: params.ipAddress || null,
			};
		});

		await prisma.audit_logs.createMany({
			data: entries,
		});
	} catch (error) {
		console.error("Lỗi khi ghi audit log batch:", error);
	}
}

