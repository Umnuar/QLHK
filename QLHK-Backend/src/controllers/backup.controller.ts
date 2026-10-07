import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

export const exportDatabase = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	try {
		const [
			villages,
			users,
			refresh_tokens,
			households,
			citizens,
			audit_logs,
			settings,
		] = await Promise.all([
			prisma.villages.findMany(),
			prisma.users.findMany({
				select: {
					id: true,
					username: true,
					full_name: true,
					role: true,
					village_id: true,
					created_at: true,
					updated_at: true,
				},
			}),
			prisma.refresh_tokens.findMany(),
			prisma.households.findMany(),
			prisma.citizens.findMany(),
			prisma.audit_logs.findMany(),
			prisma.settings.findMany(),
		]);

		const backupData = {
			metadata: {
				exportedAt: new Date().toISOString(),
				version: "1.0",
				app: "qlhk-backend",
				schema: "qlhk",
				environment: process.env.NODE_ENV || "development",
			},
			data: {
				villages,
				users,
				refresh_tokens,
				households,
				citizens,
				audit_logs,
				settings,
			},
		};

		res.setHeader("Content-Type", "application/json");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="qlhk_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json"`,
		);
		res.send(JSON.stringify(backupData, null, 2));
	} catch (error: any) {
		console.error("Lỗi khi export database:", error);
		res.status(500).json({ error: "Không thể xuất dữ liệu backup." });
	}
};

export const runAutoBackup = async (): Promise<string | null> => {
	try {
		console.log("[AutoBackup] Đang tiến hành sao lưu dữ liệu 7 bảng PostgreSQL...");

		const [
			villages,
			users,
			refresh_tokens,
			households,
			citizens,
			audit_logs,
			settings,
		] = await Promise.all([
			prisma.villages.findMany(),
			prisma.users.findMany({
				select: {
					id: true,
					username: true,
					full_name: true,
					role: true,
					village_id: true,
					created_at: true,
					updated_at: true,
				},
			}),
			prisma.refresh_tokens.findMany(),
			prisma.households.findMany(),
			prisma.citizens.findMany(),
			prisma.audit_logs.findMany(),
			prisma.settings.findMany(),
		]);

		const backupData = {
			metadata: {
				exportedAt: new Date().toISOString(),
				version: "1.0",
				type: "auto",
				app: "qlhk-backend",
				schema: "qlhk",
			},
			data: {
				villages,
				users,
				refresh_tokens,
				households,
				citizens,
				audit_logs,
				settings,
			},
		};

		const backupDir = path.join(process.cwd(), "backups");
		if (!fs.existsSync(backupDir)) {
			fs.mkdirSync(backupDir, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const filename = `qlhk_backup_${timestamp}.json`;
		const filepath = path.join(backupDir, filename);

		fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
		console.log(`[AutoBackup] Đã tạo bản sao lưu thành công tại: ${filename}`);

		// Cleanup cũ (lưu trữ xoay vòng 7 ngày tương tự QLCS/QLNN)
		const files = fs.readdirSync(backupDir);
		const now = Date.now();
		const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

		for (const file of files) {
			if (file.startsWith("qlhk_backup_") && file.endsWith(".json")) {
				const fullPath = path.join(backupDir, file);
				const stats = fs.statSync(fullPath);
				if (now - stats.mtimeMs > SEVEN_DAYS) {
					fs.unlinkSync(fullPath);
					console.log(`[AutoBackup] Đã xoá bản sao lưu cũ quá 7 ngày: ${file}`);
				}
			}
		}

		return filepath;
	} catch (error) {
		console.error("[AutoBackup] Lỗi nghiêm trọng khi sao lưu tự động:", error);
		return null;
	}
};

export const restoreDatabase = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		if (req.user?.role !== "admin") {
			res.status(403).json({ error: "Không có quyền thực hiện chức năng này." });
			return;
		}

		const { data, admin_password } = req.body;
		if (!admin_password) {
			res.status(400).json({
				error: "Vui lòng nhập mật khẩu quản trị viên để xác nhận phục hồi.",
			});
			return;
		}

		const adminUser = await prisma.users.findUnique({
			where: { id: req.user!.id },
		});

		if (
			!adminUser ||
			!(await bcrypt.compare(admin_password, adminUser.password_hash))
		) {
			res.status(401).json({
				error: "Mật khẩu quản trị viên không chính xác. Thao tác phục hồi bị hủy bỏ.",
			});
			return;
		}

		if (!data || !data.villages || !data.households) {
			res.status(400).json({ error: "Dữ liệu backup không hợp lệ hoặc thiếu thông tin." });
			return;
		}

		await prisma.$transaction(
			async (tx) => {
				// Xóa theo thứ tự ràng buộc khóa ngoại (child to parent)
				await tx.audit_logs.deleteMany();
				await tx.citizens.deleteMany();
				await tx.households.deleteMany();
				await tx.refresh_tokens.deleteMany();
				await tx.settings.deleteMany();

				if (data.villages && data.villages.length > 0) {
					for (const v of data.villages) {
						await tx.villages.upsert({
							where: { id: v.id },
							create: v,
							update: v,
						});
					}
				}

				if (data.settings && data.settings.length > 0) {
					for (const s of data.settings) {
						await tx.settings.upsert({
							where: { id: s.id },
							create: s,
							update: s,
						});
					}
				}

				if (data.households && data.households.length > 0) {
					await tx.households.createMany({ data: data.households });
				}

				if (data.citizens && data.citizens.length > 0) {
					await tx.citizens.createMany({ data: data.citizens });
				}

				if (data.audit_logs && data.audit_logs.length > 0) {
					await tx.audit_logs.createMany({ data: data.audit_logs });
				}
			},
			{ timeout: 30000, maxWait: 15000 },
		);

		res.status(200).json({ message: "Phục hồi dữ liệu thành công." });
	} catch (error: any) {
		console.error("Lỗi khi restore database:", error);
		res.status(500).json({ error: "Không thể phục hồi dữ liệu.", details: error.message });
	}
};
