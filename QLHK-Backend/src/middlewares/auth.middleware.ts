import type { NextFunction, Request, Response } from "express";
import { type TokenPayload, verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
	user?: TokenPayload;
}

export const authenticateToken = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): void => {
	try {
		const authHeader = req.headers.authorization;
		const token =
			authHeader && authHeader.startsWith("Bearer ")
				? authHeader.slice(7)
				: null;

		if (!token) {
			res.status(401).json({ error: "Token không được cung cấp" });
			return;
		}

		const decoded = verifyAccessToken(token);
		req.user = decoded;
		next();
	} catch (error) {
		res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
	}
};

export const authorizeVillageScope = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): void => {
	try {
		if (!req.user) {
			res.status(401).json({ error: "Chưa xác thực" });
			return;
		}

		if (req.user.role === "admin") {
			next();
			return;
		}

		if (!req.user.village_id) {
			res
				.status(403)
				.json({ error: "Tài khoản chưa được phân công thôn quản lý" });
			return;
		}

		const userVillageId = req.user.village_id;

		if (req.method === "GET") {
			if (!req.query) req.query = {};
			if (!req.query.villageId && !req.query.village_id) {
				req.query.villageId = userVillageId;
				req.query.village_id = userVillageId;
			}
		}

		if (["PUT", "PATCH"].includes(req.method)) {
			if (req.body && typeof req.body === "object") {
				req.body.village_id = userVillageId;
				req.body.villageId = userVillageId;
			}
		} else if (req.method === "POST") {
			if (req.body && typeof req.body === "object") {
				if (!req.body.village_id && !req.body.villageId) {
					req.body.village_id = userVillageId;
				}
			}
		}

		if (req.query?.villageId && req.query.villageId !== userVillageId) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập dữ liệu của thôn khác" });
			return;
		}
		if (req.query?.village_id && req.query.village_id !== userVillageId) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập dữ liệu của thôn khác" });
			return;
		}

		if (req.params?.villageId && req.params.villageId !== userVillageId) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập dữ liệu của thôn khác" });
			return;
		}
		if (req.params?.village_id && req.params.village_id !== userVillageId) {
			res
				.status(403)
				.json({ error: "Không có quyền truy cập dữ liệu của thôn khác" });
			return;
		}

		if (req.body && typeof req.body === "object") {
			if (req.body.village_id && req.body.village_id !== userVillageId) {
				res.status(403).json({
					error: "Không có quyền tạo hoặc sửa dữ liệu thuộc thôn khác",
				});
				return;
			}
			if (req.body.villageId && req.body.villageId !== userVillageId) {
				res.status(403).json({
					error: "Không có quyền tạo hoặc sửa dữ liệu thuộc thôn khác",
				});
				return;
			}
		}

		if (req.method === "GET") {
			if (!req.query) req.query = {};
			req.query.villageId = userVillageId;
			req.query.village_id = userVillageId;
		}

		next();
	} catch (error) {
		res.status(500).json({ error: "Lỗi kiểm tra phân quyền" });
	}
};

export const requireAdmin = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (!req.user) {
		res.status(401).json({ error: "Chưa xác thực" });
		return;
	}
	if (req.user.role !== "admin") {
		res
			.status(403)
			.json({ error: "Yêu cầu quyền Quản trị viên cấp xã (Admin)" });
		return;
	}
	next();
};
