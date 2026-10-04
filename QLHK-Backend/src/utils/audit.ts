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

export async function logAudit(params: AuditParams) {
	try {
		let validUserId = params.userId || null;
		if (validUserId) {
			const userExists = await prisma.users.findUnique({
				where: { id: validUserId },
				select: { id: true },
			});
			if (!userExists) {
				validUserId = null;
			}
		}

		await prisma.audit_logs.create({
			data: {
				village_id: params.villageId || null,
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
