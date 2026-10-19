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

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
	compression({
		threshold: 512,
		level: 6,
	}),
);

const envCorsOrigins = config.corsOrigin
	? config.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
	: [];

const isOriginAllowed = (origin: string | undefined): boolean => {
	if (!origin || origin === "null") return true;
	if (
		origin === "https://qlhk.dulieudakha.vn" ||
		origin.endsWith(".dulieudakha.vn") ||
		origin === "https://dulieudakha.vn" ||
		origin === "http://tauri.localhost" ||
		origin === "https://tauri.localhost" ||
		origin.startsWith("tauri://") ||
		origin.endsWith(".localhost") ||
		origin.startsWith("http://localhost:") ||
		origin.startsWith("http://127.0.0.1:") ||
		origin.startsWith("https://localhost:") ||
		origin.startsWith("https://127.0.0.1:") ||
		envCorsOrigins.includes(origin)
	) {
		return true;
	}
	return false;
};

app.use(
	cors({
		origin: (origin, callback) => {
			if (isOriginAllowed(origin)) {
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

app.head("/api/health", (_req: Request, res: Response) =>
	res.status(200).end(),
);
app.get("/api/health", (_req: Request, res: Response) => {
	res.json({
		status: "ok",
		app: "qlhk-backend",
		version: "1.5.0",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

app.use("/api", routes);

app.use((req: Request, res: Response) => {
	res.status(404).json({
		error: `Đường dẫn không tồn tại: ${req.method} ${req.originalUrl}`,
	});
});

// Global error handler
app.use(errorHandler);

export default app;
