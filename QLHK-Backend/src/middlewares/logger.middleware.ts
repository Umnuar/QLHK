import type { NextFunction, Request, Response } from "express";
import { logHttp } from "../utils/logger";

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

export const isLivenessEndpoint = (url: string): boolean => {
	const cleanUrl = url.split("?")[0].trim();
	return (
		cleanUrl === "/api/health" ||
		cleanUrl === "/api/health/" ||
		cleanUrl === "/api/ping" ||
		cleanUrl === "/api/ping/" ||
		cleanUrl === "/favicon.ico"
	);
};

export const requestLogger = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const startTime = Date.now();
	const clientIp = getClientIp(req);

	res.on("finish", () => {
		const url = req.originalUrl || req.url;

		if (isLivenessEndpoint(url)) {
			return;
		}

		if (process.env.NODE_ENV === "test") {
			return;
		}

		const duration = Date.now() - startTime;
		const method = req.method;
		const status = res.statusCode;

		logHttp(method, url, status, duration, clientIp);
	});

	next();
};
