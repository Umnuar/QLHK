import { config } from "../config/env";
import { prisma } from "../config/prisma";

export interface RequestLogEntry {
	timestamp: string;
	method: string;
	url: string;
	status: number;
	duration: number;
	ip: string;
}

export interface DashboardStats {
	households: number;
	citizens: number;
	villages: number;
}

const startTime = Date.now();
let totalRequests = 0;
const recentLogs: RequestLogEntry[] = [];
const lastStats: DashboardStats = {
	households: 0,
	citizens: 0,
	villages: 7,
};

let statsTimer: NodeJS.Timeout | null = null;
let isResizeListenerAttached = false;

// Màu ANSI
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";

const METHOD_COLORS: Record<string, string> = {
	GET: GREEN,
	POST: BLUE,
	PUT: YELLOW,
	PATCH: MAGENTA,
	DELETE: RED,
};

function getStatusColor(status: number): string {
	if (status >= 500) return RED;
	if (status >= 400) return YELLOW;
	if (status >= 300) return CYAN;
	if (status >= 200) return GREEN;
	return RESET;
}

function formatUptime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function getFormattedTime(date: Date = new Date()): string {
	const h = String(date.getHours()).padStart(2, "0");
	const m = String(date.getMinutes()).padStart(2, "0");
	const s = String(date.getSeconds()).padStart(2, "0");
	return `${h}:${m}:${s}`;
}

/**
 * Tính toán độ rộng terminal thích ứng (Executive Adaptive Grid)
 * Tối thiểu 92 cột, tối ưu 96-105 cột, giới hạn tối đa 120 cột
 */
export function getBoxWidth(): number {
	const cols = process.stdout.columns || 96;
	return Math.max(92, Math.min(cols, 120));
}

export function stripAnsi(str: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence stripping for terminal output
	return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Bao bọc nội dung vào hàng của bảng với viền chuẩn xác 100% không tràn
 */
export function row(content: string, width: number = getBoxWidth()): string {
	const maxContentWidth = width - 4; // Trừ đi '│ ' (2 ký tự) và ' │' (2 ký tự)
	const visible = stripAnsi(content);
	let safeContent = content;

	if (visible.length > maxContentWidth) {
		safeContent =
			stripAnsi(content).slice(0, Math.max(0, maxContentWidth - 3)) + "...";
	}

	const safeVisible = stripAnsi(safeContent);
	const pad = Math.max(0, maxContentWidth - safeVisible.length);
	return `│ ${safeContent}${" ".repeat(pad)} │`;
}

/**
 * Căn chỉnh 2 cột đều nhau trong Executive Grid
 */
export function twoCol(
	left: string,
	right: string,
	width: number = getBoxWidth(),
): string {
	const innerW = width - 4;
	const half = Math.floor((innerW - 2) / 2);
	const leftVis = stripAnsi(left);
	const leftPad = Math.max(1, half - leftVis.length);
	return `  ${left}${" ".repeat(leftPad)}${right}`;
}

/**
 * Cập nhật số liệu cơ sở từ CSDL Prisma
 */
export async function refreshStats(): Promise<void> {
	try {
		const [hhCount, citCount, vilCount] = await Promise.all([
			prisma.households.count({ where: { is_deleted: false } }),
			prisma.citizens.count({ where: { is_deleted: false } }),
			prisma.villages.count(),
		]);
		lastStats.households = hhCount;
		lastStats.citizens = citCount;
		lastStats.villages = vilCount || 7;
	} catch {
		// Không ném lỗi nếu database chưa sẵn sàng hoặc trong test
	}
}

/**
 * Vẽ Terminal Status Dashboard chuyên nghiệp chuẩn Hệ sinh thái Đăk Hà (Executive Adaptive Grid)
 */
export function renderDashboard(): void {
	if (process.env.NODE_ENV === "test") return;

	const width = getBoxWidth();
	const topBorder = `┌${"─".repeat(width - 2)}┐`;
	const divider = `├${"─".repeat(width - 2)}┤`;
	const bottomBorder = `└${"─".repeat(width - 2)}┘`;

	const port = config.port || 5002;
	const env = config.nodeEnv || "development";
	const now = getFormattedTime();
	const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
	const mem = process.memoryUsage();
	const ramMB = Math.round(mem.rss / 1024 / 1024);
	const heapMB = Math.round(mem.heapUsed / 1024 / 1024);

	// Cố định độ rộng các cột log ngoại trừ URL:
	// 2 (indent) + 10 (time) + 1 + 6 (method) + 1 + 1 + 3 (status) + 1 + 7 (latency) + 2 + 15 (ip) = 49 ký tự
	const fixedColumnsWidth = 49;
	const urlMaxLen = Math.max(20, width - 4 - fixedColumnsWidth);

	const lines: string[] = [
		topBorder,
		row(
			`  ${BOLD}${CYAN}QLHK-SERVER DASHBOARD — QUẢN LÝ HỘ KHẨU & NHÂN KHẨU ĐĂK HÀ${RESET}`,
			width,
		),
		divider,
		row(
			twoCol(
				`Trạng Thái : ${BOLD}${GREEN}ONLINE${RESET} ${DIM}(Port: ${port})${RESET}`,
				`Môi Trường : ${BOLD}${env}${RESET}`,
				width,
			),
			width,
		),
		row(twoCol(`Thời Gian  : ${now}`, `Uptime     : ${uptime}`, width), width),
		row(
			twoCol(
				`Tài Nguyên : RAM: ${ramMB} MB (RSS)`,
				`Heap Used  : ${heapMB} MB`,
				width,
			),
			width,
		),
		divider,
		row(`  ${BOLD}DỮ LIỆU CƠ SỞ (QLHK):${RESET}`, width),
		row(
			twoCol(
				`- Thôn / Làng  : ${BOLD}${lastStats.villages}${RESET} thôn`,
				`- Hộ gia đình  : ${BOLD}${lastStats.households.toLocaleString("vi-VN")}${RESET} hộ`,
				width,
			),
			width,
		),
		row(
			twoCol(
				`- Nhân khẩu    : ${BOLD}${lastStats.citizens.toLocaleString("vi-VN")}${RESET} người`,
				`- Lượt yêu cầu : ${BOLD}${totalRequests.toLocaleString("vi-VN")}${RESET} requests`,
				width,
			),
			width,
		),
		divider,
		row(`  ${BOLD}NHẬT KÝ YÊU CẦU GẦN NHẤT:${RESET}`, width),
	];

	if (recentLogs.length === 0) {
		lines.push(row(`  ${DIM}(Chưa có yêu cầu nào)${RESET}`, width));
	} else {
		// Thanh tiêu đề phụ cho các cột log
		const colTime = "[Giờ]".padEnd(10);
		const colMethod = "Method".padEnd(6);
		const colUrl = "Endpoint / URL".padEnd(urlMaxLen);
		const colStatus = "Mã".padStart(3);
		const colDur = "Độ trễ".padStart(7);
		const colIp = "Client IP".padEnd(15);
		lines.push(
			row(
				`  ${DIM}${colTime} ${colMethod} ${colUrl} ${colStatus} ${colDur}  ${colIp}${RESET}`,
				width,
			),
		);

		for (const log of recentLogs) {
			const methodCol = METHOD_COLORS[log.method] || RESET;
			const statusCol = getStatusColor(log.status);

			const cleanUrl =
				log.url.length > urlMaxLen
					? log.url.slice(0, Math.max(0, urlMaxLen - 3)) + "..."
					: log.url;
			const paddedUrl = cleanUrl.padEnd(urlMaxLen);

			const methodStr = (
				log.method.length > 6 ? log.method.slice(0, 6) : log.method
			).padEnd(6);
			const statusStr = String(log.status).slice(0, 3).padStart(3);
			const durRaw = `${log.duration}ms`;
			const durStr = (durRaw.length > 7 ? durRaw.slice(0, 7) : durRaw).padStart(
				7,
			);
			const ipRaw = log.ip.startsWith("::ffff:") ? log.ip.substring(7) : log.ip;
			const ipStr = (
				ipRaw.length > 15 ? ipRaw.slice(0, 12) + "..." : ipRaw
			).padEnd(15);
			const timeStr = `[${log.timestamp}]`.slice(0, 10).padEnd(10);

			const logLine = `  ${timeStr} ${methodCol}${BOLD}${methodStr}${RESET} ${paddedUrl} ${statusCol}${statusStr}${RESET} ${durStr}  ${DIM}${ipStr}${RESET}`;
			lines.push(row(logLine, width));
		}
	}

	lines.push(bottomBorder);

	// Xuất ra terminal chuẩn TTY không giật hình
	if (process.stdout.isTTY) {
		process.stdout.write("\x1b[H" + lines.join("\n") + "\n\x1b[J");
	}
}

/**
 * Ghi nhận một request và hiển thị dashboard thời gian thực
 */
export function recordRequestLog(log: {
	method: string;
	url: string;
	status: number;
	duration: number;
	ip: string;
}): void {
	totalRequests++;
	const timestamp = getFormattedTime();
	recentLogs.unshift({
		timestamp,
		...log,
	});

	if (recentLogs.length > 6) {
		recentLogs.pop();
	}

	if (process.stdout.isTTY && process.env.NODE_ENV !== "test") {
		renderDashboard();
	}
}

/**
 * Khởi chạy chu kỳ cập nhật Terminal Dashboard định kỳ 15s
 */
export function startDashboard(): void {
	if (process.env.NODE_ENV === "test") return;

	// Lắng nghe sự kiện co giãn cửa sổ terminal để vẽ lại ngay lập tức
	if (process.stdout.isTTY && !isResizeListenerAttached) {
		isResizeListenerAttached = true;
		process.stdout.on("resize", () => {
			if (process.env.NODE_ENV !== "test") {
				renderDashboard();
			}
		});
	}

	// Lần đầu tải stats và render
	refreshStats().then(() => {
		if (process.stdout.isTTY) {
			console.clear();
			renderDashboard();
		}
	});

	if (!statsTimer) {
		statsTimer = setInterval(async () => {
			await refreshStats();
			if (process.stdout.isTTY && process.env.NODE_ENV !== "test") {
				renderDashboard();
			}
		}, 15000);
		statsTimer.unref();
	}
}
