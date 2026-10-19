import bcrypt from "bcryptjs";
import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

export const getUsers = async (
	_req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const users = await prisma.users.findMany({
			orderBy: { created_at: "asc" },
			select: {
				id: true,
				username: true,
				full_name: true,
				role: true,
				village_id: true,
				created_at: true,
				updated_at: true,
				village: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		res.json({
			success: true,
			data: users,
		});
	} catch (error) {
		console.error("Lỗi getUsers:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy danh sách người dùng" });
	}
};

export const createUser = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { username, password, role, village_id, full_name } = req.body;

		if (!username || !password) {
			res
				.status(400)
				.json({ error: "Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu" });
			return;
		}

		const trimmedUsername = String(username).trim();
		if (trimmedUsername.length < 3) {
			res.status(400).json({ error: "Tên đăng nhập phải có ít nhất 3 ký tự" });
			return;
		}

		if (String(password).length < 6) {
			res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
			return;
		}

		const existingUser = await prisma.users.findUnique({
			where: { username: trimmedUsername },
		});

		if (existingUser) {
			res.status(400).json({ error: "Tên đăng nhập đã tồn tại trên hệ thống" });
			return;
		}

		const password_hash = await bcrypt.hash(password, 10);

		const newUser = await prisma.users.create({
			data: {
				username: trimmedUsername,
				password_hash,
				role: role === "admin" ? "admin" : "user",
				village_id: role === "admin" ? null : village_id || null,
				full_name: full_name ? String(full_name).trim() : null,
			},
			select: {
				id: true,
				username: true,
				full_name: true,
				role: true,
				village_id: true,
				created_at: true,
				updated_at: true,
				village: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		res.status(201).json({
			success: true,
			message: "Tạo tài khoản thành công",
			data: newUser,
		});
	} catch (error) {
		console.error("Lỗi createUser:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi tạo tài khoản" });
	}
};

export const updatePassword = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = req.params.id as string;
		const newPassword = req.body.password || req.body.newPassword;

		if (!newPassword || String(newPassword).trim().length < 6) {
			res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
			return;
		}

		const user = await prisma.users.findUnique({
			where: { id },
		});

		if (!user) {
			res.status(404).json({ error: "Không tìm thấy tài khoản người dùng" });
			return;
		}

		if (req.user?.role !== "admin" && req.user?.id !== id) {
			res
				.status(403)
				.json({ error: "Bạn không có quyền đổi mật khẩu cho tài khoản này" });
			return;
		}

		const password_hash = await bcrypt.hash(String(newPassword).trim(), 10);

		await prisma.$transaction([
			prisma.users.update({
				where: { id },
				data: { password_hash },
			}),
			prisma.refresh_tokens.deleteMany({
				where: { user_id: id },
			}),
		]);

		res.json({
			success: true,
			message: "Đổi mật khẩu thành công",
		});
	} catch (error) {
		console.error("Lỗi updatePassword:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi đổi mật khẩu" });
	}
};

export const deleteUser = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = req.params.id as string;

		const user = await prisma.users.findUnique({
			where: { id },
		});

		if (!user) {
			res.status(404).json({ error: "Không tìm thấy tài khoản cần xóa" });
			return;
		}

		if (user.username === "admin") {
			res.status(400).json({
				error: "Không thể xóa tài khoản Quản trị viên mặc định (admin)",
			});
			return;
		}

		if (req.user?.id === id) {
			res
				.status(400)
				.json({ error: "Không thể xóa tài khoản đang đăng nhập hiện tại" });
			return;
		}

		await prisma.$transaction([
			prisma.refresh_tokens.deleteMany({ where: { user_id: id } }),
			prisma.audit_logs.updateMany({
				where: { user_id: id },
				data: { user_id: null },
			}),
			prisma.users.delete({ where: { id } }),
		]);

		res.json({
			success: true,
			message: "Xóa tài khoản thành công",
		});
	} catch (error) {
		console.error("Lỗi deleteUser:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi xóa tài khoản" });
	}
};

export const updateUser = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const id = req.params.id as string;
		const { full_name, role, village_id } = req.body;

		const existing = await prisma.users.findUnique({
			where: { id },
		});

		if (!existing) {
			res.status(404).json({ error: "Không tìm thấy tài khoản người dùng" });
			return;
		}

		const updatedRole =
			role !== undefined
				? role === "admin"
					? "admin"
					: "user"
				: existing.role;
		const updatedVillageId =
			updatedRole === "admin"
				? null
				: village_id !== undefined
					? village_id || null
					: existing.village_id;

		const updated = await prisma.users.update({
			where: { id },
			data: {
				full_name:
					full_name !== undefined
						? full_name
							? String(full_name).trim()
							: null
						: existing.full_name,
				role: updatedRole,
				village_id: updatedVillageId,
			},
			select: {
				id: true,
				username: true,
				full_name: true,
				role: true,
				village_id: true,
				created_at: true,
				updated_at: true,
				village: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		res.json({
			success: true,
			message: "Cập nhật tài khoản và phân công thôn thành công",
			data: updated,
		});
	} catch (error) {
		console.error("Lỗi updateUser:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi cập nhật tài khoản" });
	}
};
