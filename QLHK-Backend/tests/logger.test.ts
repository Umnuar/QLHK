import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	logStart,
	logDb,
	logHttp,
	logAuth,
	logCron,
	logError,
	getDbTargetInfo,
	formatTimestamp,
	isColorEnabled,
} from "../src/utils/logger";
import { isLivenessEndpoint } from "../src/middlewares/logger.middleware";

describe("Standardized 1-Line Logger & Observability Engine", () => {
	let originalIsTTY: boolean | undefined;
	let originalNoColor: string | undefined;

	beforeEach(() => {
		originalIsTTY = process.stdout.isTTY;
		originalNoColor = process.env.NO_COLOR;
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.stdout.isTTY = originalIsTTY as any;
		if (originalNoColor === undefined) {
			delete process.env.NO_COLOR;
		} else {
			process.env.NO_COLOR = originalNoColor;
		}
	});

	describe("1. Cấu trúc log 1 dòng chuẩn [HH:mm:ss] [TAG]", () => {
		it("[START]: Định dạng Service ready on port <PORT> | DB: Connected | Env: <NODE_ENV>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const line = logStart(5002, "production");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[START\] Service ready on port 5002 \| DB: Connected \| Env: production$/);
		});

		it("[DB]: Định dạng Connected to PostgreSQL at <HOST>:<PORT>/<DATABASE>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const line = logDb("dakha-postgres", "5432", "dakha_db");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[DB\] Connected to PostgreSQL at dakha-postgres:5432\/dakha_db$/);
		});

		it("[HTTP]: Định dạng <METHOD> <PATH> <STATUS> <DURATION>ms | IP: <IP>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const line = logHttp("GET", "/api/households", 200, 45, "192.168.1.100");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[HTTP\] GET \/api\/households 200 45ms \| IP: 192\.168\.1\.100$/);
		});

		it("[AUTH]: Định dạng <username> (<role>) -> <ACTION> | IP: <IP>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const line = logAuth("admin", "admin", "LOGIN_SUCCESS", "127.0.0.1");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[AUTH\] admin \(admin\) -> LOGIN_SUCCESS \| IP: 127\.0\.0\.1$/);
		});

		it("[CRON]: Định dạng <JobName> -> <STATUS>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const line = logCron("BackupDatabase", "STARTED");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[CRON\] BackupDatabase -> STARTED$/);
		});

		it("[ERROR]: Định dạng [<code>] <message>", () => {
			process.stdout.isTTY = false;
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const line = logError("P2002", "Unique constraint failed on the fields: (`username`)");

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \[ERROR\] \[P2002\] Unique constraint failed on the fields: \(`username`\)$/);
		});
	});

	describe("2. Bộ lọc Liveness & Heartbeat Endpoints", () => {
		it("phải bỏ qua /api/health", () => {
			expect(isLivenessEndpoint("/api/health")).toBe(true);
			expect(isLivenessEndpoint("/api/health/")).toBe(true);
			expect(isLivenessEndpoint("/api/health?check=db")).toBe(true);
		});

		it("phải bỏ qua /api/ping", () => {
			expect(isLivenessEndpoint("/api/ping")).toBe(true);
			expect(isLivenessEndpoint("/api/ping/")).toBe(true);
		});

		it("phải bỏ qua /favicon.ico", () => {
			expect(isLivenessEndpoint("/favicon.ico")).toBe(true);
		});

		it("không được bỏ qua các endpoint nghiệp vụ", () => {
			expect(isLivenessEndpoint("/api/villages")).toBe(false);
			expect(isLivenessEndpoint("/api/households")).toBe(false);
			expect(isLivenessEndpoint("/api/citizens")).toBe(false);
			expect(isLivenessEndpoint("/api/auth/login")).toBe(false);
		});
	});

	describe("3. Khử mã màu ANSI trong môi trường Container (!process.stdout.isTTY)", () => {
		it("không được chứa bất kỳ mã escape ANSI nào khi !process.stdout.isTTY", () => {
			process.stdout.isTTY = false;
			delete process.env.NO_COLOR;

			expect(isColorEnabled()).toBe(false);

			const line = logStart(5002, "production");
			// Kiểm tra không có chuỗi escape \x1b
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI check
			expect(line).not.toMatch(/\x1b\[[0-9;]*[a-zA-Z]/);
		});

		it("không được chứa mã escape ANSI khi biến NO_COLOR được thiết lập", () => {
			process.stdout.isTTY = true;
			process.env.NO_COLOR = "1";

			expect(isColorEnabled()).toBe(false);

			const line = logHttp("POST", "/api/auth/login", 200, 32, "10.0.0.1");
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI check
			expect(line).not.toMatch(/\x1b\[[0-9;]*[a-zA-Z]/);
		});
	});

	describe("4. Phân giải thông tin DATABASE_URL", () => {
		it("phải trích xuất chính xác host, port, database từ URL chuẩn PostgreSQL", () => {
			const info = getDbTargetInfo("postgresql://postgres:secret@dakha-db:5432/dakha_qlhk?schema=qlhk");
			expect(info.host).toBe("dakha-db");
			expect(info.port).toBe("5432");
			expect(info.database).toBe("dakha_qlhk");
		});

		it("phải fallback an toàn khi URL rỗng hoặc không hợp lệ", () => {
			const info = getDbTargetInfo("");
			expect(info.host).toBe("localhost");
			expect(info.port).toBe("5432");
			expect(info.database).toBe("postgres");
		});
	});
});
