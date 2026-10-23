import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Person } from "../types";
import { normalizeUnaccented } from "./vietnamese";

export interface OfflineCitizenItem {
	id: string;
	household_id?: string | null;
	household_number?: string | null;
	full_name: string;
	relationship?: string | null;
	dob?: string | null;
	gender?: string | null;
	cccd?: string | null;
	phone?: string | null;
	village_name?: string | null;
	address?: string | null;
}

export function mapPersonToOfflineCitizen(
	person: Person,
	householdMeta?: { code?: string; village_name?: string; address?: string },
): OfflineCitizenItem {
	return {
		id: person.id,
		household_id: person.household_id || null,
		household_number: householdMeta?.code || null,
		full_name: person.full_name,
		relationship: person.relationship || null,
		dob: person.dob_formatted || person.dob_raw || person.dob || null,
		gender: person.gender || null,
		cccd: person.cccd || null,
		phone: person.phone || null,
		village_name: householdMeta?.village_name || null,
		address: person.address || householdMeta?.address || null,
	};
}

export function searchCitizensBrowserFallback(
	query: string,
	items: OfflineCitizenItem[],
): OfflineCitizenItem[] {
	const cleanQuery = query.trim().toLowerCase();
	if (!cleanQuery) return items;
	const unaccentedQuery = normalizeUnaccented(cleanQuery);

	return items.filter((item) => {
		const nameLower = (item.full_name || "").toLowerCase();
		if (nameLower.includes(cleanQuery)) return true;
		if (normalizeUnaccented(nameLower).includes(unaccentedQuery)) return true;

		if (item.cccd && item.cccd.includes(cleanQuery)) return true;
		if (item.phone && item.phone.includes(cleanQuery)) return true;
		if (
			item.household_number &&
			item.household_number.toLowerCase().includes(cleanQuery)
		) {
			return true;
		}

		if (item.village_name) {
			const vLower = item.village_name.toLowerCase();
			if (
				vLower.includes(cleanQuery) ||
				normalizeUnaccented(vLower).includes(unaccentedQuery)
			) {
				return true;
			}
		}

		if (item.address) {
			const aLower = item.address.toLowerCase();
			if (
				aLower.includes(cleanQuery) ||
				normalizeUnaccented(aLower).includes(unaccentedQuery)
			) {
				return true;
			}
		}

		return false;
	});
}

export async function searchCitizensOffline(
	query: string,
	items: OfflineCitizenItem[],
): Promise<OfflineCitizenItem[]> {
	const cleanQuery = query.trim();
	if (!cleanQuery) return items;

	if (typeof window !== "undefined" && isTauri()) {
		try {
			return await invoke<OfflineCitizenItem[]>("search_citizens_offline", {
				query: cleanQuery,
				items,
			});
		} catch (err) {
			console.warn("Tauri search_citizens_offline fallback:", err);
			return searchCitizensBrowserFallback(cleanQuery, items);
		}
	}

	return searchCitizensBrowserFallback(cleanQuery, items);
}
