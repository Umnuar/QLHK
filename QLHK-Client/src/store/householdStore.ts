import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { householdApi } from "../api/householdApi";
import { ETHNIC_GROUPS, VILLAGES } from "../data/constants";
import { INITIAL_HOUSEHOLDS } from "../data/seedData";
import type {
	EthnicDistribution,
	Household,
	KpiStats,
	Person,
	RelationshipType,
	VillageStatRow,
} from "../types";
import { maskCccd } from "../utils/cccd";
import { calculateAge, formatDobDisplay } from "../utils/date";
import { normalizeUnaccented, splitFullName } from "../utils/vietnamese";

const STORAGE_KEY = "qlhk_households_v1";
const ADMIN_MODE_KEY = "qlhk_admin_mode";
const CURRENT_CALCULATION_YEAR = new Date().getFullYear();

export function useHouseholdStore() {
	const [households, setHouseholds] = useState<Household[]>(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				return JSON.parse(saved);
			}
		} catch (e) {
			console.error("Lỗi đọc localStorage:", e);
		}
		return INITIAL_HOUSEHOLDS;
	});

	const [isAdmin, setIsAdmin] = useState<boolean>(() => {
		return localStorage.getItem(ADMIN_MODE_KEY) === "true";
	});

	const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
	const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);
	const [loading] = useState<boolean>(false);

	const [search, setSearch] = useState<string>("");
	const [page, setPage] = useState<number>(1);
	const [limit, setLimit] = useState<number>(10);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(households));
		} catch (e) {
			console.error("Lỗi ghi localStorage:", e);
		}
	}, [households]);

	useEffect(() => {
		localStorage.setItem(ADMIN_MODE_KEY, String(isAdmin));
	}, [isAdmin]);

	useEffect(() => {
		setPage(1);
	}, [search]);

	const checkBackend = useCallback(async () => {
		setIsCheckingBackend(true);
		try {
			const res = await apiClient.get("/health");
			if (res.status === 200) {
				setIsBackendOnline(true);
			} else {
				setIsBackendOnline(false);
			}
		} catch {
			setIsBackendOnline(false);
		} finally {
			setIsCheckingBackend(false);
		}
	}, []);

	useEffect(() => {
		checkBackend();
	}, [checkBackend]);

	const activeHouseholds = useMemo(() => {
		return households.filter((h) => !h.is_deleted);
	}, [households]);

	const trashHouseholds = useMemo(() => {
		return households.filter((h) => h.is_deleted);
	}, [households]);

	const searchedHouseholds = useMemo(() => {
		if (!search.trim()) return activeHouseholds;
		const query = normalizeUnaccented(search.toLowerCase());
		return activeHouseholds.filter((h) => {
			const head = h.members.find((m) => m.is_head);
			const headUnaccented =
				head?.name_unaccented ||
				(h as any).head_name_unaccented ||
				normalizeUnaccented(h.head_name);
			const headMatch = headUnaccented.includes(query);
			const codeMatch = (h.code || "").toLowerCase().includes(query);
			const bookMatch = (h.book_number || "").toLowerCase().includes(query);
			const memberMatch = h.members.some((m) =>
				(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query),
			);
			return headMatch || codeMatch || bookMatch || memberMatch;
		});
	}, [activeHouseholds, search]);

	const total = searchedHouseholds.length;
	const totalPages = Math.ceil(total / limit) || 1;
	const paginatedHouseholds = useMemo(() => {
		const start = (page - 1) * limit;
		return searchedHouseholds.slice(start, start + limit);
	}, [searchedHouseholds, page, limit]);

	const aggregatedStats = useMemo(() => {
		let totalMembers = 0, maleCount = 0, femaleCount = 0, minorityCount = 0;
		const ethnicCounts: Record<string, number> = Object.fromEntries(ETHNIC_GROUPS.map((g) => [g, 0]));
		const statsMap = new Map<string, {
			households_count: number; members_count: number; male_count: number; female_count: number; minority_count: number;
		}>(VILLAGES.map((v) => [v.id, {
			households_count: 0, members_count: 0, male_count: 0, female_count: 0, minority_count: 0,
		}]));

		for (const h of activeHouseholds) {
			const villageAcc = statsMap.get(h.village_id);
			if (villageAcc) villageAcc.households_count++;
			for (const m of h.members) {
				totalMembers++;
				const isMale = m.gender === "Nam";
				const isFemale = m.gender === "Nữ";
				const isMinority = m.ethnicity !== "Kinh";
				if (isMale) maleCount++;
				if (isFemale) femaleCount++;
				if (isMinority) minorityCount++;

				const eth = m.ethnicity || "Kinh";
				ethnicCounts[eth] = (ethnicCounts[eth] || 0) + 1;

				if (villageAcc) {
					villageAcc.members_count++;
					if (isMale) villageAcc.male_count++;
					if (isFemale) villageAcc.female_count++;
					if (isMinority) villageAcc.minority_count++;
				}
			}
		}

		const calcPct = (cnt: number, tot: number) => tot > 0 ? Math.round((cnt / tot) * 1000) / 10 : 0;

		const computedKpiStats: KpiStats = {
			totalHouseholds: activeHouseholds.length,
			totalMembers,
			maleCount,
			femaleCount,
			malePercentage: calcPct(maleCount, totalMembers),
			femalePercentage: calcPct(femaleCount, totalMembers),
			minorityCount,
			minorityPercentage: calcPct(minorityCount, totalMembers),
		};

		const computedEthnicStats: EthnicDistribution[] = ETHNIC_GROUPS.map((name) => ({
			name,
			count: ethnicCounts[name] || 0,
			percentage: calcPct(ethnicCounts[name] || 0, totalMembers),
			isMinority: name !== "Kinh",
		})).sort((a, b) => b.count - a.count);

		const computedVillageStats: VillageStatRow[] = VILLAGES.map((v) => {
			const acc = statsMap.get(v.id) || {
				households_count: 0, members_count: 0, male_count: 0, female_count: 0, minority_count: 0,
			};
			return {
				village_id: v.id,
				village_name: v.name,
				households_count: acc.households_count,
				members_count: acc.members_count,
				male_count: acc.male_count,
				female_count: acc.female_count,
				minority_count: acc.minority_count,
				minority_percentage: calcPct(acc.minority_count, acc.members_count),
			};
		});

		return {
			kpiStats: computedKpiStats,
			ethnicStats: computedEthnicStats,
			villageStats: computedVillageStats,
		};
	}, [activeHouseholds]);

	const { kpiStats, ethnicStats, villageStats } = aggregatedStats;

	const addHousehold = useCallback((newH: any) => {
		const village =
			VILLAGES.find((v) => v.id === newH.village_id) || VILLAGES[0];
		const hhId =
			newH.id ||
			"hh-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
		const code =
			newH.code ||
			newH.book_number ||
			`HK-${village.short_code}-${Math.floor(100 + Math.random() * 900)}`;
		const bookNumber = newH.book_number || code;

		const members: Person[] = newH.members || [];
		if (
			members.length === 0 &&
			newH.initialMember &&
			newH.initialMember.full_name
		) {
			const fullName = newH.initialMember.full_name;
			const { lastName, firstName } = splitFullName(fullName);
			const dobRaw = newH.initialMember.dob_raw || "1990";
			const age = calculateAge(dobRaw, CURRENT_CALCULATION_YEAR);
			const cccd = newH.initialMember.cccd || "";
			const ethnicity = newH.initialMember.ethnicity || "Kinh";

			members.push({
				id: "mem-" + Date.now(),
				household_id: hhId,
				stt: 1,
				full_name: fullName,
				last_name: lastName,
				first_name: firstName,
				name_unaccented: normalizeUnaccented(fullName),
				relationship: "Chủ hộ",
				is_head: true,
				gender: newH.initialMember.gender || "Nam",
				dob: dobRaw,
				dob_raw: dobRaw,
				dob_formatted: formatDobDisplay(dobRaw),
				birth_year: CURRENT_CALCULATION_YEAR - age,
				age,
				cccd,
				cccd_last4: cccd ? cccd.slice(-4) : "",
				cccd_masked: maskCccd(cccd, false),
				ethnicity,
				is_minority: ethnicity !== "Kinh",
				religion: newH.initialMember.religion || "Không",
				occupation: newH.initialMember.occupation || "",
				notes: newH.initialMember.notes || "",
			});
		}

		const created: Household = {
			id: hhId,
			code,
			book_number: bookNumber,
			village_id: village.id,
			village_name: village.name,
			head_name: newH.head_name || members[0]?.full_name || "Chưa rõ",
			head_cccd: newH.head_cccd || members[0]?.cccd || "",
			address: newH.address || "Xã Đăk Hà",
			status: newH.status || "Thường trú",
			members_count: members.length,
			members,
			is_deleted: false,
			deleted_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			notes: newH.notes || "",
		};

		setHouseholds((prev) => [created, ...prev]);
		return created;
	}, []);

	const updateHousehold = useCallback(
		(id: string, updates: Partial<Household>) => {
			setHouseholds((prev) =>
				prev.map((h) => {
					if (h.id !== id) return h;
					return {
						...h,
						...updates,
						updated_at: new Date().toISOString(),
					};
				}),
			);
		},
		[],
	);

	const softDeleteHousehold = useCallback((id: string) => {
		setHouseholds((prev) =>
			prev.map((h) => {
				if (h.id !== id) return h;
				return {
					...h,
					is_deleted: true,
					deleted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
			}),
		);
	}, []);

	const restoreHousehold = useCallback(async (id: string) => {
		setHouseholds((prev) =>
			prev.map((h) => {
				if (h.id !== id) return h;
				return {
					...h,
					is_deleted: false,
					deleted_at: null,
					updated_at: new Date().toISOString(),
				};
			}),
		);
		try {
			await householdApi.restore(id);
		} catch (e) {
			console.warn("[householdStore] Lỗi sync restore qua API:", e);
		}
	}, []);

	const hardDeleteHousehold = useCallback(async (id: string) => {
		setHouseholds((prev) => prev.filter((h) => h.id !== id));
		try {
			await householdApi.hardDelete(id);
		} catch (e) {
			console.warn("[householdStore] Lỗi sync hard delete qua API:", e);
		}
	}, []);

	const emptyTrash = useCallback(() => {
		setHouseholds((prev) => prev.filter((h) => !h.is_deleted));
	}, []);

	const saveMember = useCallback(
		(householdId: string, memberData: Partial<Person>) => {
			setHouseholds((prev) =>
				prev.map((h) => {
					if (h.id !== householdId) return h;

					const fullName = memberData.full_name || "";
					const { lastName, firstName } = splitFullName(fullName);
					const dobRaw = memberData.dob_raw || "1990";
					const age = calculateAge(dobRaw, CURRENT_CALCULATION_YEAR);
					const cccd = memberData.cccd || "";
					const ethnicity = memberData.ethnicity || "Kinh";
					const isHead =
						memberData.relationship === "Chủ hộ" || !!memberData.is_head;

					let updatedMembers = [...h.members];

					if (memberData.id) {
						updatedMembers = updatedMembers.map((m) => {
							if (m.id !== memberData.id) {
								if (isHead && m.is_head) {
									return {
										...m,
										is_head: false,
										relationship: "Khác" as RelationshipType,
									};
								}
								return m;
							}
							return {
								...m,
								...memberData,
								full_name: fullName,
								last_name: lastName,
								first_name: firstName,
								name_unaccented: normalizeUnaccented(fullName),
								dob_raw: dobRaw,
								dob_formatted: formatDobDisplay(dobRaw),
								birth_year: CURRENT_CALCULATION_YEAR - age,
								age,
								cccd,
								cccd_masked: maskCccd(cccd, false),
								ethnicity,
								is_minority: ethnicity !== "Kinh",
								is_head: isHead,
							} as Person;
						});
					} else {
						const newId =
							"mem-" +
							Date.now() +
							"-" +
							Math.random().toString(36).substring(2, 6);
						if (isHead) {
							updatedMembers = updatedMembers.map((m) =>
								m.is_head
									? {
											...m,
											is_head: false,
											relationship: "Khác" as RelationshipType,
										}
									: m,
							);
						}

						const newPerson: Person = {
							id: newId,
							household_id: householdId,
							stt: updatedMembers.length + 1,
							full_name: fullName,
							last_name: lastName,
							first_name: firstName,
							name_unaccented: normalizeUnaccented(fullName),
							relationship: (memberData.relationship ||
								"Con đẻ") as RelationshipType,
							is_head: isHead,
							gender: memberData.gender || "Nam",
							dob_raw: dobRaw,
							dob_formatted: formatDobDisplay(dobRaw),
							birth_year: CURRENT_CALCULATION_YEAR - age,
							age,
							cccd,
							cccd_masked: maskCccd(cccd, false),
							ethnicity,
							is_minority: ethnicity !== "Kinh",
							religion: memberData.religion || "Không",
							occupation: memberData.occupation || "",
							address: memberData.address || h.address,
							phone: memberData.phone || "",
							notes: memberData.notes || "",
						};
						updatedMembers.push(newPerson);
					}

					const currentHead = updatedMembers.find((m) => m.is_head);
					const headName = currentHead ? currentHead.full_name : h.head_name;
					const headCccd = currentHead ? currentHead.cccd : h.head_cccd;

					return {
						...h,
						head_name: headName,
						head_cccd: headCccd,
						members: updatedMembers,
						members_count: updatedMembers.length,
						updated_at: new Date().toISOString(),
					};
				}),
			);
		},
		[],
	);

	const deleteMember = useCallback((householdId: string, memberId: string) => {
		setHouseholds((prev) =>
			prev.map((h) => {
				if (h.id !== householdId) return h;
				let updatedMembers = h.members.filter((m) => m.id !== memberId);
				const hasHead = updatedMembers.some((m) => m.is_head);
				let headName = h.head_name;
				let headCccd = h.head_cccd;

				if (!hasHead) {
					if (updatedMembers.length > 0) {
						updatedMembers = updatedMembers.map((m, idx) =>
							idx === 0
								? { ...m, is_head: true, relationship: "Chủ hộ" }
								: m,
						);
						headName = updatedMembers[0].full_name;
						headCccd = updatedMembers[0].cccd || "";
					} else {
						headName = "Chưa xác định";
						headCccd = "";
					}
				} else {
					const currentHead = updatedMembers.find((m) => m.is_head);
					if (currentHead) {
						headName = currentHead.full_name;
						headCccd = currentHead.cccd || "";
					}
				}

				return {
					...h,
					head_name: headName,
					head_cccd: headCccd,
					members: updatedMembers,
					members_count: updatedMembers.length,
					updated_at: new Date().toISOString(),
				};
			}),
		);
	}, []);

	const importHouseholdsFromExcel = useCallback(
		(importedHouseholds: Household[]) => {
			setHouseholds((prev) => [...importedHouseholds, ...prev]);
		},
		[],
	);

	const batchDeleteHouseholds = useCallback((ids: string[]) => {
		setHouseholds((prev) =>
			prev.map((h) => {
				if (!ids.includes(h.id)) return h;
				return {
					...h,
					is_deleted: true,
					deleted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
			}),
		);
	}, []);

	const resetToInitialData = useCallback(() => {
		setHouseholds(INITIAL_HOUSEHOLDS);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HOUSEHOLDS));
	}, []);

	return {
		households,
		setHouseholds,
		activeHouseholds,
		trashHouseholds,
		deletedHouseholds: trashHouseholds,
		kpiStats,
		ethnicStats,
		villageStats,
		isAdmin,
		setIsAdmin,
		isBackendOnline,
		isCheckingBackend,
		checkBackend,
		addHousehold,
		updateHousehold,
		softDeleteHousehold,
		deleteHousehold: softDeleteHousehold,
		batchDeleteHouseholds,
		restoreHousehold,
		hardDeleteHousehold,
		emptyTrash,
		saveMember,
		deleteMember,
		importHouseholdsFromExcel,
		resetToInitialData,
		search,
		setSearch,
		page,
		setPage,
		limit,
		setLimit,
		loading,
		total,
		totalPages,
		paginatedHouseholds,
	};
}
