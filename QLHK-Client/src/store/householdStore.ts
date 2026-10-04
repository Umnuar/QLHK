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

export function useHouseholdStore() {
	// Lấy dữ liệu từ localStorage hoặc dùng INITIAL_HOUSEHOLDS
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
	const [loading, setLoading] = useState<boolean>(false);

	// Tìm kiếm & phân trang
	const [search, setSearch] = useState<string>("");
	const [page, setPage] = useState<number>(1);
	const [limit, setLimit] = useState<number>(10);

	// Lưu lại mỗi khi households thay đổi
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

	// Reset page khi search thay đổi
	useEffect(() => {
		setPage(1);
	}, [search]);

	// Kiểm tra kết nối Backend
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

	// Danh sách các hộ đang hoạt động (không ở trong thùng rác)
	const activeHouseholds = useMemo(() => {
		return households.filter((h) => !h.is_deleted);
	}, [households]);

	// Danh sách các hộ trong Thùng rác
	const trashHouseholds = useMemo(() => {
		return households.filter((h) => h.is_deleted);
	}, [households]);

	// Lọc theo tìm kiếm không dấu
	const searchedHouseholds = useMemo(() => {
		if (!search.trim()) return activeHouseholds;
		const query = normalizeUnaccented(search.toLowerCase());
		return activeHouseholds.filter((h) => {
			const headMatch = normalizeUnaccented(h.head_name.toLowerCase()).includes(
				query,
			);
			const codeMatch = (h.code || "").toLowerCase().includes(query);
			const bookMatch = (h.book_number || "").toLowerCase().includes(query);
			const memberMatch = h.members.some((m) =>
				normalizeUnaccented(m.full_name.toLowerCase()).includes(query),
			);
			return headMatch || codeMatch || bookMatch || memberMatch;
		});
	}, [activeHouseholds, search]);

	// Phân trang
	const total = searchedHouseholds.length;
	const totalPages = Math.ceil(total / limit) || 1;
	const paginatedHouseholds = useMemo(() => {
		const start = (page - 1) * limit;
		return searchedHouseholds.slice(start, start + limit);
	}, [searchedHouseholds, page, limit]);

	// Thống kê 4 KPI
	const kpiStats = useMemo<KpiStats>(() => {
		let totalMembers = 0;
		let maleCount = 0;
		let femaleCount = 0;
		let minorityCount = 0;

		activeHouseholds.forEach((h) => {
			h.members.forEach((m) => {
				totalMembers++;
				if (m.gender === "Nam") maleCount++;
				if (m.gender === "Nữ") femaleCount++;
				if (m.ethnicity !== "Kinh") minorityCount++;
			});
		});

		const malePercentage =
			totalMembers > 0 ? Math.round((maleCount / totalMembers) * 1000) / 10 : 0;
		const femalePercentage =
			totalMembers > 0
				? Math.round((femaleCount / totalMembers) * 1000) / 10
				: 0;
		const minorityPercentage =
			totalMembers > 0
				? Math.round((minorityCount / totalMembers) * 1000) / 10
				: 0;

		return {
			totalHouseholds: activeHouseholds.length,
			totalMembers,
			maleCount,
			femaleCount,
			malePercentage,
			femalePercentage,
			minorityCount,
			minorityPercentage,
		};
	}, [activeHouseholds]);

	// Thống kê cơ cấu 14 Dân tộc
	const ethnicStats = useMemo<EthnicDistribution[]>(() => {
		const counts: Record<string, number> = {};
		ETHNIC_GROUPS.forEach((g) => {
			counts[g] = 0;
		});

		let total = 0;
		activeHouseholds.forEach((h) => {
			h.members.forEach((m) => {
				total++;
				const eth = m.ethnicity || "Kinh";
				counts[eth] = (counts[eth] || 0) + 1;
			});
		});

		return ETHNIC_GROUPS.map((name) => {
			const count = counts[name] || 0;
			const percentage =
				total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
			return {
				name,
				count,
				percentage,
				isMinority: name !== "Kinh",
			};
		}).sort((a, b) => b.count - a.count);
	}, [activeHouseholds]);

	// Thống kê phân bổ theo Thôn
	const villageStats = useMemo<VillageStatRow[]>(() => {
		return VILLAGES.map((v) => {
			const vHouseholds = activeHouseholds.filter((h) => h.village_id === v.id);
			let members_count = 0;
			let male_count = 0;
			let female_count = 0;
			let minority_count = 0;

			vHouseholds.forEach((h) => {
				h.members.forEach((m) => {
					members_count++;
					if (m.gender === "Nam") male_count++;
					if (m.gender === "Nữ") female_count++;
					if (m.ethnicity !== "Kinh") minority_count++;
				});
			});

			const minority_percentage =
				members_count > 0
					? Math.round((minority_count / members_count) * 1000) / 10
					: 0;

			return {
				village_id: v.id,
				village_name: v.name,
				households_count: vHouseholds.length,
				members_count,
				male_count,
				female_count,
				minority_count,
				minority_percentage,
			};
		});
	}, [activeHouseholds]);

	// Thêm hộ mới
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
			const age = calculateAge(dobRaw, 2026);
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
				birth_year: 2026 - age,
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

	// Sửa thông tin hộ
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

	// Xóa mềm vào Thùng rác
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

	// Khôi phục từ Thùng rác
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

	// Xóa vĩnh viễn
	const hardDeleteHousehold = useCallback(async (id: string) => {
		setHouseholds((prev) => prev.filter((h) => h.id !== id));
		try {
			await householdApi.hardDelete(id);
		} catch (e) {
			console.warn("[householdStore] Lỗi sync hard delete qua API:", e);
		}
	}, []);

	// Dọn sạch thùng rác
	const emptyTrash = useCallback(() => {
		setHouseholds((prev) => prev.filter((h) => !h.is_deleted));
	}, []);

	// Thêm hoặc Cập nhật Nhân khẩu
	const saveMember = useCallback(
		(householdId: string, memberData: Partial<Person>) => {
			setHouseholds((prev) =>
				prev.map((h) => {
					if (h.id !== householdId) return h;

					const fullName = memberData.full_name || "";
					const { lastName, firstName } = splitFullName(fullName);
					const dobRaw = memberData.dob_raw || "1990";
					const age = calculateAge(dobRaw, 2026);
					const cccd = memberData.cccd || "";
					const ethnicity = memberData.ethnicity || "Kinh";
					const isHead =
						memberData.relationship === "Chủ hộ" || !!memberData.is_head;

					let updatedMembers = [...h.members];

					if (memberData.id) {
						// Edit existing member
						updatedMembers = updatedMembers.map((m) => {
							if (m.id !== memberData.id) {
								// Nếu nhân khẩu này được gán làm Chủ hộ thì bỏ cờ Chủ hộ của người cũ
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
								birth_year: 2026 - age,
								age,
								cccd,
								cccd_masked: maskCccd(cccd, false),
								ethnicity,
								is_minority: ethnicity !== "Kinh",
								is_head: isHead,
							} as Person;
						});
					} else {
						// Add new member
						const newId =
							"mem-" +
							Date.now() +
							"-" +
							Math.random().toString(36).substring(2, 6);
						if (isHead) {
							// Gỡ chủ hộ cũ nếu thêm chủ hộ mới
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
							birth_year: 2026 - age,
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

					// Cập nhật tên chủ hộ của Sổ hộ khẩu nếu cần
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

	// Xóa nhân khẩu
	const deleteMember = useCallback((householdId: string, memberId: string) => {
		setHouseholds((prev) =>
			prev.map((h) => {
				if (h.id !== householdId) return h;
				const updatedMembers = h.members.filter((m) => m.id !== memberId);
				return {
					...h,
					members: updatedMembers,
					members_count: updatedMembers.length,
					updated_at: new Date().toISOString(),
				};
			}),
		);
	}, []);

	// Lưu hàng loạt từ Import Excel
	const importHouseholdsFromExcel = useCallback(
		(importedHouseholds: Household[]) => {
			setHouseholds((prev) => [...importedHouseholds, ...prev]);
		},
		[],
	);

	// Xóa hàng loạt
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

	// Khôi phục dữ liệu gốc
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
		// Search & Pagination
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
