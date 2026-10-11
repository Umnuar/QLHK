/**
 * Chuẩn hóa Terminal Logger 1 dòng cho Docker Container & Observability
 * Tuân thủ quy chuẩn: [HH:mm:ss] [TAG] Message [Details]
 */

export const isColorEnabled = (): boolean => {
	// Bỏ hoàn toàn mã màu ANSI khi chạy trong môi trường container (!process.stdout.isTTY) hoặc khi có biến NO_COLOR
	return Boolean(process.stdout && process.stdout.isTTY && !process.env.NO_COLOR);
};

export const formatTimestamp = (date: Date = new Date()): string => {
	const h = String(date.getHours()).padStart(2, "0");
	const m = String(date.getMinutes()).padStart(2, "0");
	const s = String(date.getSeconds()).padStart(2, "0");
	return `${h}:${m}:${s}`;
};

// ANSI color codes
const COLORS = {
	RESET: "\x1b[0m",
	DIM: "\x1b[2m",
	CYAN: "\x1b[36m",
	GREEN: "\x1b[32m",
	YELLOW: "\x1b[33m",
	BLUE: "\x1b[34m",
	MAGENTA: "\x1b[35m",
	RED: "\x1b[31m",
};

const formatTag = (tag: string, color: string): string => {
	if (!isColorEnabled()) {
		return `[${tag}]`;
	}
	return `${color}[${tag}]${COLORS.RESET}`;
};

const formatTimePrefix = (date?: Date): string => {
	const time = formatTimestamp(date);
	if (!isColorEnabled()) {
		return `[${time}]`;
	}
	return `${COLORS.DIM}[${time}]${COLORS.RESET}`;
};

/**
 * Trích xuất <HOST>:<PORT>/<DATABASE> từ biến DATABASE_URL
 */
export const getDbTargetInfo = (rawUrl?: string): {
	host: string;
	port: string;
	database: string;
} => {
	const dbUrl = rawUrl || process.env.DATABASE_URL || "";
	try {
		if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
			const parsed = new URL(dbUrl);
			const host = parsed.hostname || "localhost";
			const port = parsed.port || "5432";
			const database = parsed.pathname.replace(/^\//, "") || "postgres";
			return { host, port, database };
		}
	} catch {
		const match = dbUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
		if (match) {
			return {
				host: match[1] || "localhost",
				port: match[2] || "5432",
				database: match[3] || "postgres",
			};
		}
	}
	return { host: "localhost", port: "5432", database: "postgres" };
};

/**
 * [START] Service ready on port <PORT> | DB: Connected | Env: <NODE_ENV>
 */
export const logStart = (port: number | string, env: string): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("START", COLORS.CYAN);
	const line = `${prefix} ${tag} Service ready on port ${port} | DB: Connected | Env: ${env}`;
	console.log(line);
	return line;
};

/**
 * [DB] Connected to PostgreSQL at <HOST>:<PORT>/<DATABASE>
 */
export const logDb = (host: string, port: string, database: string): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("DB", COLORS.BLUE);
	const line = `${prefix} ${tag} Connected to PostgreSQL at ${host}:${port}/${database}`;
	console.log(line);
	return line;
};

/**
 * [HTTP] <METHOD> <PATH> <STATUS> <DURATION>ms | IP: <IP>
 */
export const logHttp = (
	method: string,
	path: string,
	status: number,
	duration: number,
	ip: string,
): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("HTTP", COLORS.GREEN);
	const line = `${prefix} ${tag} ${method} ${path} ${status} ${duration}ms | IP: ${ip}`;
	console.log(line);
	return line;
};

/**
 * [AUTH] <username> (<role>) -> <ACTION> | IP: <IP>
 */
export const logAuth = (
	username: string,
	role: string,
	action: string,
	ip: string,
): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("AUTH", COLORS.MAGENTA);
	const line = `${prefix} ${tag} ${username} (${role}) -> ${action} | IP: ${ip}`;
	console.log(line);
	return line;
};

/**
 * [CRON] <JobName> -> <STATUS>
 */
export const logCron = (jobName: string, status: string): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("CRON", COLORS.YELLOW);
	const line = `${prefix} ${tag} ${jobName} -> ${status}`;
	console.log(line);
	return line;
};

/**
 * [ERROR] [<code>] <message>
 */
export const logError = (code: string | number, message: string): string => {
	const prefix = formatTimePrefix();
	const tag = formatTag("ERROR", COLORS.RED);
	const line = `${prefix} ${tag} [${code}] ${message}`;
	console.error(line);
	return line;
};
