import {
	HOUSEHOLD_SYSTEM_FIELDS,
	type HouseholdSystemField,
} from "./householdExcelFields";
import { normalizeColumnKey } from "./policyExcelTypes";

export function suggestHouseholdColumnMapping(
	headers: string[],
): Record<string, string> {
	const suggested: Record<string, string> = {};
	const usedHeaders = new Set<string>();

	const sortedFields = [...HOUSEHOLD_SYSTEM_FIELDS].sort((a, b) => {
		if (a.required && !b.required) return -1;
		if (!a.required && b.required) return 1;
		return 0;
	});

	for (const field of sortedFields) {
		let bestHeader: string | null = null;
		let highestScore = 0;

		for (const header of headers) {
			if (usedHeaders.has(header)) continue;
			const normHeader = normalizeColumnKey(header);
			if (!normHeader) continue;

			for (const alias of field.aliases) {
				const normAlias = normalizeColumnKey(alias);
				if (!normAlias) continue;

				if (normHeader === normAlias) {
					if (highestScore < 100) {
						highestScore = 100;
						bestHeader = header;
					}
				} else if (
					normHeader.startsWith(`${normAlias} `) ||
					normHeader.endsWith(` ${normAlias}`)
				) {
					if (highestScore < 80) {
						highestScore = 80;
						bestHeader = header;
					}
				} else if (normAlias.length >= 3 && normHeader.includes(normAlias)) {
					if (highestScore < 50) {
						highestScore = 50;
						bestHeader = header;
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
