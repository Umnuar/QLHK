import type { NextFunction, Request, Response } from "express";
import { recordRequestLog } from "../utils/dashboard";

const METHOD_COLORS: Record<string, string> = {
	GET: "\x1b[32m", // Green
	POST: "\x1b[34m", // Blue
	PUT: "\x1b[33m", // Yellow
	PATCH: "\x1b[35m", // Magenta
	DELETE: "\x1b[31m", // Red
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

/**
 * Trích xuất địa chỉ IP thực của client hỗ trợ qua Cloudflare Tunnel và reverse proxies
 */
export const getClientIp = (req: Request): string => {
	let ip = "";
	const cfIp = req.headers["cf-connecting-ip"];
	if (cfIp) {
		ip = (Array.isArray(cfIp) ? cfIp[0] : cfIp).trim();
	} else {
		const forwarded = req.headers["x-forwarded-for"];
		if (forwarded) {
			const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
			ip = ips.split(",")[0].trim();
		} else {
			ip = req.ip || req.socket?.remoteAddress || "unknown";
		}
	}
	if (ip.startsWith("::ffff:")) {
		ip = ip.substring(7);
	}
	return ip;
};

const getStatusColor = (status: number): string => {
	if (status >= 500) return "\x1b[31m"; // Red
	if (status >= 400) return "\x1b[33m"; // Yellow
	if (status >= 300) return "\x1b[36m"; // Cyan
	if (status >= 200) return "\x1b[32m"; // Green
	return RESET;
};

/**
 * Middleware ghi log HTTP request và đồng bộ Terminal Status Dashboard thời gian thực
 */
export const requestLogger = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const startTime = Date.now();
	const clientIp = getClientIp(req);

	res.on("finish", () => {
		const duration = Date.now() - startTime;
		const method = req.method;
		const url = req.originalUrl || req.url;
		const status = res.statusCode;

		if (url.includes("/api/health") || url.includes("/api/ping")) {
			return; // Bỏ qua heartbeat ping để terminal sạch và không nghẽn Event Loop
		}

		// Cập nhật vào Terminal Dashboard
		recordRequestLog({
			method,
			url,
			status,
			duration,
			ip: clientIp,
		});

		// Nếu không ở chế độ TTY và không phải môi trường test, xuất ANSI log bình thường
		if (!process.stdout.isTTY && process.env.NODE_ENV !== "test") {
			const methodColor = METHOD_COLORS[method] || "\x1b[37m";
			const statusColor = getStatusColor(status);
			const timestamp = new Date().toLocaleTimeString("vi-VN", {
				hour12: false,
			});

			console.log(
				`${DIM}[${timestamp}]${RESET} ` +
					`${methodColor}${BOLD}${method.padEnd(7)}${RESET} ` +
					`${url} ` +
					`${statusColor}${BOLD}${status}${RESET} ` +
					`${DIM}${duration}ms${RESET} - ` +
					`${DIM}IP: ${clientIp}${RESET}`,
			);
		}
	});

	next();
};
