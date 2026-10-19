import { prisma } from "../config/prisma";

export type TimeSource = "internet" | "database" | "machine";

export interface SystemTimeInfo {
	isoTime: string;
	timestamp: number;
	source: TimeSource;
	sourceLabel: string;
	calculationYear: number;
	lastSyncedAt: string;
}

let cachedOffset = 0;
let currentSource: TimeSource = "machine";
let currentSourceLabel = "Đồng hồ máy chủ";
let lastSyncedAt: string = new Date().toISOString();
let syncInterval: NodeJS.Timeout | null = null;

const SOURCE_LABELS: Record<TimeSource, string> = {
	internet: "Đồng bộ Internet qua NTP chuẩn",
	database: "Thời gian Cơ sở dữ liệu PostgreSQL (Mất Internet)",
	machine: "Đồng hồ máy chủ",
};

async function syncFromInternet(): Promise<{ offset: number; timestamp: number } | null> {
	const endpoints = ["https://time.google.com", "https://1.1.1.1"];
	for (const url of endpoints) {
		try {
			const start = Date.now();
			const res = await fetch(url, {
				method: "HEAD",
				signal: AbortSignal.timeout(2000),
			});
			const dateHeader = res.headers.get("date");
			if (dateHeader) {
				const latency = (Date.now() - start) / 2;
				const networkTime = new Date(dateHeader).getTime() + latency;
				if (!isNaN(networkTime)) {
					return {
						offset: Math.round(networkTime - Date.now()),
						timestamp: networkTime,
					};
				}
			}
		} catch {
		}
	}
	return null;
}

async function syncFromDatabase(): Promise<{ offset: number; timestamp: number } | null> {
	try {
		const rows = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
		if (rows && rows[0]?.now) {
			const dbTime = new Date(rows[0].now).getTime();
			if (!isNaN(dbTime)) {
				return {
					offset: Math.round(dbTime - Date.now()),
					timestamp: dbTime,
				};
			}
		}
	} catch {
	}
	return null;
}

export async function syncSystemTime(): Promise<SystemTimeInfo> {
	const internetSync = await syncFromInternet();
	if (internetSync) {
		cachedOffset = internetSync.offset;
		currentSource = "internet";
		currentSourceLabel = SOURCE_LABELS.internet;
		lastSyncedAt = new Date().toISOString();
		return getSystemTime();
	}

	const dbSync = await syncFromDatabase();
	if (dbSync) {
		cachedOffset = dbSync.offset;
		currentSource = "database";
		currentSourceLabel = SOURCE_LABELS.database;
		lastSyncedAt = new Date().toISOString();
		return getSystemTime();
	}

	cachedOffset = 0;
	currentSource = "machine";
	currentSourceLabel = SOURCE_LABELS.machine;
	lastSyncedAt = new Date().toISOString();
	return getSystemTime();
}

export function getSystemTime(): SystemTimeInfo {
	const currentEffectiveMs = Date.now() + cachedOffset;
	const effectiveDate = new Date(currentEffectiveMs);

	return {
		isoTime: effectiveDate.toISOString(),
		timestamp: currentEffectiveMs,
		source: currentSource,
		sourceLabel: currentSourceLabel,
		calculationYear: effectiveDate.getFullYear(),
		lastSyncedAt: lastSyncedAt,
	};
}

export function startAutoTimeSync(): void {
	if (syncInterval) return;

	syncSystemTime().catch((err) => {
		console.warn("[SystemTimeService] Đồng bộ khởi động thất bại:", err);
	});

	syncInterval = setInterval(() => {
		syncSystemTime().catch((err) => {
			console.warn("[SystemTimeService] Đồng bộ định kỳ thất bại:", err);
		});
	}, 15 * 60 * 1000);

	if (syncInterval.unref) {
		syncInterval.unref();
	}
}

export function stopAutoTimeSync(): void {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
	}
}
