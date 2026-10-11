import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logError } from "../utils/logger";

export function errorHandler(
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	const statusCode = err.status || err.statusCode || (err instanceof ZodError ? 400 : 500);
	const code = err.code || statusCode;
	const message = err.message || "Lỗi hệ thống nội bộ";

	logError(code, message);

	if (err instanceof ZodError) {
		res.status(400).json({
			error: "Dữ liệu không hợp lệ",
			details: err.errors.map((e) => ({
				path: e.path.join("."),
				message: e.message,
			})),
		});
		return;
	}

	// Optimistic concurrency conflict error
	if (err?.status === 409 || err?.code === "OCC_CONFLICT") {
		res.status(409).json({
			error:
				err.message ||
				"Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.",
			currentVersion: err.currentVersion,
		});
		return;
	}

	// Prisma unique constraint error
	if (err?.code === "P2002") {
		res.status(409).json({
			error: "Dữ liệu đã tồn tại trong hệ thống (trùng lặp giá trị duy nhất)",
			target: err?.meta?.target,
		});
		return;
	}

	// Prisma record not found error
	if (err?.code === "P2025") {
		res.status(404).json({
			error: "Không tìm thấy bản ghi yêu cầu",
		});
		return;
	}

	res.status(statusCode).json({
		error: err.message || "Lỗi hệ thống nội bộ",
	});
}
