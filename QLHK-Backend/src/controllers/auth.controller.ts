import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
	generateAccessToken,
	generateRefreshToken,
	type TokenPayload,
	verifyRefreshToken,
} from "../utils/jwt";

export const login = async (req: Request, res: Response): Promise<void> => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			res
				.status(400)
				.json({ error: "Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu" });
			return;
		}

		const user = await prisma.users.findUnique({
			where: { username },
			include: { village: true },
		});

		if (!user) {
			res
				.status(401)
				.json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác" });
			return;
		}

		const isMatch = await bcrypt.compare(password, user.password_hash);
		if (!isMatch) {
			res
				.status(401)
				.json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác" });
			return;
		}

		const payload: TokenPayload = {
			id: user.id,
			username: user.username,
			role: user.role as "admin" | "user",
			village_id: user.village_id,
		};

		const accessToken = generateAccessToken(payload);
		const refreshToken = generateRefreshToken(payload);

		// Lưu refresh token vào DB (7 ngày)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		// Dọn dẹp các token đã hết hạn
		await prisma.refresh_tokens.deleteMany({
			where: { expires_at: { lt: new Date() } },
		});

		await prisma.refresh_tokens.create({
			data: {
				user_id: user.id,
				token: refreshToken,
				expires_at: expiresAt,
			},
		});

		res.json({
			message: "Đăng nhập thành công",
			user: {
				id: user.id,
				username: user.username,
				full_name: user.full_name,
				role: user.role,
				village_id: user.village_id,
				village_name: user.village?.name || null,
			},
			accessToken,
			refreshToken,
		});
	} catch (error) {
		console.error("Lỗi login:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi đăng nhập" });
	}
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			res.status(400).json({ error: "Thiếu refresh token" });
			return;
		}

		let decoded: TokenPayload;
		try {
			decoded = verifyRefreshToken(refreshToken);
		} catch {
			res
				.status(401)
				.json({ error: "Refresh token không hợp lệ hoặc đã hết hạn" });
			return;
		}

		// Kiểm tra token có trong DB không (Token Rotation & Revocation)
		const tokenRecord = await prisma.refresh_tokens.findUnique({
			where: { token: refreshToken },
			include: { user: true },
		});

		if (!tokenRecord || tokenRecord.expires_at < new Date()) {
			if (tokenRecord) {
				await prisma.refresh_tokens.delete({ where: { id: tokenRecord.id } });
			}
			res
				.status(401)
				.json({ error: "Refresh token đã bị thu hồi hoặc hết hạn" });
			return;
		}

		const user = tokenRecord.user;
		const payload: TokenPayload = {
			id: user.id,
			username: user.username,
			role: user.role as "admin" | "user",
			village_id: user.village_id,
		};

		const newAccessToken = generateAccessToken(payload);
		const newRefreshToken = generateRefreshToken(payload);

		// Thu hồi token cũ và lưu token mới (Rotation)
		const newExpiresAt = new Date();
		newExpiresAt.setDate(newExpiresAt.getDate() + 7);

		await prisma.$transaction([
			prisma.refresh_tokens.delete({ where: { id: tokenRecord.id } }),
			prisma.refresh_tokens.create({
				data: {
					user_id: user.id,
					token: newRefreshToken,
					expires_at: newExpiresAt,
				},
			}),
		]);

		res.json({
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		});
	} catch (error: any) {
		if (error?.code === "P2025") {
			res
				.status(401)
				.json({ error: "Refresh token đã bị thu hồi hoặc hết hạn" });
			return;
		}
		console.error("Lỗi refresh token:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi làm mới token" });
	}
};

export const logout = async (req: Request, res: Response): Promise<void> => {
	try {
		const { refreshToken } = req.body;
		if (refreshToken) {
			await prisma.refresh_tokens.deleteMany({
				where: { token: refreshToken },
			});
		}
		res.json({ message: "Đăng xuất thành công" });
	} catch (error) {
		console.error("Lỗi logout:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi đăng xuất" });
	}
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ error: "Chưa xác thực" });
			return;
		}

		const user = await prisma.users.findUnique({
			where: { id: req.user.id },
			select: {
				id: true,
				username: true,
				full_name: true,
				role: true,
				village_id: true,
				created_at: true,
				village: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		if (!user) {
			res.status(404).json({ error: "Không tìm thấy người dùng" });
			return;
		}

		res.json({ user });
	} catch (error) {
		console.error("Lỗi getMe:", error);
		res.status(500).json({ error: "Lỗi máy chủ" });
	}
};
