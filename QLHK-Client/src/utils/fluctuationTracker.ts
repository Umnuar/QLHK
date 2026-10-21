export interface FluctuationRecord {
	value: number;
	diff: number;
	timestamp: string | null;
}

export type FluctuationSnapshot = Record<string, FluctuationRecord>;

export interface FluctuationResult {
	diff: number;
	timestamp: string | null;
}

export function formatVietnameseDateTime(date: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());
	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1);
	const year = date.getFullYear();

	return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

export function getFluctuationStorageKey(
	villageId: string | undefined | null,
	year: number,
): string {
	const cleanVillage = villageId ? String(villageId).trim() : "all";
	return `qlcs_fluctuation_${cleanVillage}_${year}`;
}

export function loadFluctuationSnapshot(
	villageId: string | undefined | null,
	year: number,
): FluctuationSnapshot | null {
	try {
		const key = getFluctuationStorageKey(villageId, year);
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (e) {
		console.warn("Error loading fluctuation snapshot:", e);
		return null;
	}
}

export function saveFluctuationSnapshot(
	villageId: string | undefined | null,
	year: number,
	snapshot: FluctuationSnapshot,
): void {
	try {
		const key = getFluctuationStorageKey(villageId, year);
		localStorage.setItem(key, JSON.stringify(snapshot));
	} catch (e) {
		console.warn("Error saving fluctuation snapshot:", e);
	}
}

export function clearFluctuationSnapshot(
	villageId: string | undefined | null,
	year: number,
): void {
	try {
		const key = getFluctuationStorageKey(villageId, year);
		localStorage.removeItem(key);
	} catch (e) {
		console.warn("Error clearing fluctuation snapshot:", e);
	}
}

export function processFluctuations(
	currentMetrics: Record<string, number>,
	savedSnapshot: FluctuationSnapshot | null,
	now: Date = new Date(),
): {
	updatedSnapshot: FluctuationSnapshot;
	trends: Record<string, FluctuationResult>;
} {
	const updatedSnapshot: FluctuationSnapshot = {};
	const trends: Record<string, FluctuationResult> = {};

	const isInitialRun = !savedSnapshot || Object.keys(savedSnapshot).length === 0;
	const formattedNow = formatVietnameseDateTime(now);

	for (const [key, rawValue] of Object.entries(currentMetrics)) {
		const newVal = typeof rawValue === "number" && !isNaN(rawValue) ? rawValue : 0;

		if (isInitialRun) {
			updatedSnapshot[key] = {
				value: newVal,
				diff: 0,
				timestamp: null,
			};
			trends[key] = {
				diff: 0,
				timestamp: null,
			};
		} else {
			const prevRecord = savedSnapshot[key];

			if (!prevRecord) {
				updatedSnapshot[key] = {
					value: newVal,
					diff: 0,
					timestamp: null,
				};
				trends[key] = {
					diff: 0,
					timestamp: null,
				};
			} else if (newVal !== prevRecord.value) {
				const diff = newVal - prevRecord.value;
				updatedSnapshot[key] = {
					value: newVal,
					diff,
					timestamp: formattedNow,
				};
				trends[key] = {
					diff,
					timestamp: formattedNow,
				};
			} else {
				updatedSnapshot[key] = {
					value: newVal,
					diff: prevRecord.diff,
					timestamp: prevRecord.timestamp,
				};
				trends[key] = {
					diff: prevRecord.diff,
					timestamp: prevRecord.timestamp,
				};
			}
		}
	}

	return { updatedSnapshot, trends };
}
