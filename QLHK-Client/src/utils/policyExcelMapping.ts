import { SYSTEM_FIELDS } from "./policyExcelFields";
import { normalizeColumnKey } from "./policyExcelTypes";

export function suggestColumnMapping(
	headers: string[],
	type: "chuctho" | "htxh",
): Record<string, string> {
	const suggested: Record<string, string> = {};
	const usedHeaders = new Set<string>();

	const activeFields = SYSTEM_FIELDS.filter((f) => {
		if (f.category === "chuctho" && type !== "chuctho") return false;
		if (f.category === "htxh" && type !== "htxh") return false;
		return true;
	});

	const sortedFields = [...activeFields].sort((a, b) => {
		if (a.required && !b.required) return -1;
		if (!a.required && b.required) return 1;
		return 0;
	});

	for (const field of sortedFields) {
		let bestHeader: string | null = null;
		let highestScore = 0;

		for (const h of headers) {
			if (usedHeaders.has(h)) continue;
			const normH = normalizeColumnKey(h);
			if (!normH) continue;

			for (const alias of field.aliases) {
				const normAlias = normalizeColumnKey(alias);
				if (!normAlias) continue;

				if (normH === normAlias) {
					if (highestScore < 100) {
						highestScore = 100;
						bestHeader = h;
					}
				} else if (normH.startsWith(`${normAlias} `) || normH.endsWith(` ${normAlias}`)) {
					if (highestScore < 80) {
						highestScore = 80;
						bestHeader = h;
					}
				} else if (normH.includes(normAlias)) {
					if (highestScore < 50) {
						highestScore = 50;
						bestHeader = h;
					}
				}
			}
		}

		if (bestHeader && highestScore >= 50) {
			suggested[field.key] = bestHeader;
			usedHeaders.add(bestHeader);
		}
	}

	return suggested;
}
