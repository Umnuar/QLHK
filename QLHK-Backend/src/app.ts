import compression from "compression";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import routes from "./routes";

const app = express();

app.set("trust proxy", 1);

/**
 * Ultra-low latency Ping — zero middleware overhead.
 * Đặt TRƯỚC toàn bộ middleware (helmet, compression, cors, logger)
 * để request được phản hồi 204 ngay lập tức.
 */
app.all("/api/ping", (req: Request, res: Response) => {
	const origin = req.headers.origin;
	if (origin) {
		res.setHeader("Access-Control-Allow-Origin", origin);
		res.setHeader("Access-Control-Allow-Credentials", "true");
	}
	res.setHeader(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, proxy-revalidate",
	);
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Expires", "0");

	if (req.method === "OPTIONS") {
		res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, Cache-Control, Pragma, Expires, X-Requested-With",
		);
		res.status(204).end();
		return;
	}

	res.status(204).end();
});

// Bảo mật HTTP Headers & CORS
app.use(helmet({ contentSecurityPolicy: false }));

app.use(
	compression({
		threshold: 512, // Nén mọi response lớn hơn 512 bytes
		level: 6, // Cân bằng tối ưu giữa CPU và tỷ lệ nén
	}),
);

const corsOrigins = config.corsOrigin
	? config.corsOrigin.split(",").map((o) => o.trim())
	: [
			"http://localhost:5175",
			"https://qlhk.dulieudakha.vn",
			"https://dulieudakha.vn",
		];

app.use(
	cors({
		origin: (origin, callback) => {
			// Cho phép requests không có origin (Electron / Mobile / Postman)
			if (!origin) {
				return callback(null, true);
			}
			// Cho phép requests từ hệ sinh thái dulieudakha.vn, qlhk, corsOrigins, hoặc localhost
			if (
				origin === "https://qlhk.dulieudakha.vn" ||
				origin.endsWith(".dulieudakha.vn") ||
				corsOrigins.includes(origin) ||
				origin.startsWith("http://localhost:") ||
				origin.startsWith("http://127.0.0.1:")
			) {
				return callback(null, true);
			}
			return callback(new Error("Blocked by CORS"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Cache-Control",
			"Pragma",
			"Expires",
			"X-Requested-With",
		],
	}),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);

/**
 * Health Check Endpoint theo chuẩn Hệ sinh thái Đăk Hà:
 * GET /api/health
 */
app.head("/api/health", (_req: Request, res: Response) =>
	res.status(200).end(),
);
app.get("/api/health", (_req: Request, res: Response) => {
	res.json({
		status: "ok",
		app: "qlhk-backend",
		version: "1.0.0",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

// Gắn toàn bộ API routes
app.use("/api", routes);

// 404 handler
app.use((req: Request, res: Response) => {
	res.status(404).json({
		error: `Đường dẫn không tồn tại: ${req.method} ${req.originalUrl}`,
	});
});

// Global error handler
app.use(errorHandler);

export default app;
