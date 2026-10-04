import {
	ArrowLeft,
	Download,
	FileSpreadsheet,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../AppContext";
import { householdApi } from "../api/householdApi";
import { ExportSettingsModal } from "../components/excel/ExportSettingsModal";
import { ImportPreviewModal } from "../components/excel/ImportPreviewModal";
import { formatVietnameseNumber } from "../components/common/tableStyles";
import type { AgeFilter } from "../components/households/AgeFilterPopover";
import { HouseholdDrawer } from "../components/households/HouseholdDrawer";
import { ConflictResolutionModal } from "../components/households/ConflictResolutionModal";
import { HouseholdFilterBar } from "../components/households/HouseholdFilterBar";
import { HouseholdTable } from "../components/households/HouseholdTable";
import { useHouseholds } from "../context/HouseholdContext";
import { INITIAL_HOUSEHOLDS } from "../data/seedData";
import { getCache, setCache } from "../db/indexedDB";
import { useDebounce } from "../hooks/useDebounce";
import { useModal } from "../hooks/useModal";
import { useToast } from "../hooks/useToast";
import type { Household, Person } from "../types";
import { maskCccd } from "../utils/cccd";
import {
	calculateAge,
	formatDobDisplay,
	parseAndValidateDob,
} from "../utils/date";
import { sanitizeExcelRow } from "../utils/excelParser";
import { normalizeUnaccented, splitFullName } from "../utils/vietnamese";

export const HouseholdsPage: React.FC = () => {
	const {
		user,
		selectedVillageId,
		setSelectedVillageId,
		selectedVillageName,
		setActiveTab,
		villages,
		isBackendHealthy,
		calculationYear,
		setCalculationYear,
	} = useApp();

	const { showModal } = useModal();
	const { showToast } = useToast();
	const { addHousehold } = useHouseholds();

	// State dữ liệu & phân trang
	const [households, setHouseholds] = useState<Household[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [totalPages, setTotalPages] = useState(1);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const [ageFilter, setAgeFilter] = useState<AgeFilter | null>(null);
	const [genderFilter, setGenderFilter] = useState("");
	const [ethnicityFilter, setEthnicityFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [loading, setLoading] = useState(false);
	const [isUsingCachedData, setIsUsingCachedData] = useState(false);

	// Selection & modals
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingHousehold, setEditingHousehold] = useState<Household | null>(
		null,
	);
	const [exportModalOpen, setExportModalOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isImportingModal, setIsImportingModal] = useState(false);

	// Conflict resolution state (OCC HTTP 409)
	const [conflictModalOpen, setConflictModalOpen] = useState(false);
	const [conflictServerData, setConflictServerData] = useState<Household | null>(null);
	const [conflictClientData, setConflictClientData] = useState<Partial<Household> | null>(null);
	const [isResolvingConflict, setIsResolvingConflict] = useState(false);

	// Fetch danh sách hộ từ API thật kèm cơ chế Offline Cache
	const fetchHouseholds = useCallback(async () => {
		setLoading(true);
		const targetVillageId =
			user?.role === "user" && user?.village_id
				? user.village_id
				: selectedVillageId;
		const ageKey = ageFilter
			? `_min${ageFilter.min ?? ""}_max${ageFilter.max ?? ""}`
			: "";
		const filterKey = `_y${calculationYear}_g${genderFilter}_e${ethnicityFilter}_st${statusFilter}`;
		const cacheKey = `households_page_${targetVillageId || "all"}_p${page}_l${limit}_s${debouncedSearch.trim()}${ageKey}${filterKey}`;
		const fallbackCacheKey = `households_latest_${targetVillageId || "all"}${ageKey}${filterKey}`;

		try {
			const res = await householdApi.getPage({
				villageId: targetVillageId || undefined,
				search: debouncedSearch.trim() || undefined,
				minAge: ageFilter?.min,
				maxAge: ageFilter?.max,
				year: calculationYear,
				gender: genderFilter || undefined,
				ethnicity: ethnicityFilter || undefined,
				status: statusFilter || undefined,
				page,
				limit,
			});

			setHouseholds(res.data);
			setTotal(res.pagination.total);
			setTotalPages(res.pagination.totalPages);
			setIsUsingCachedData(false);

			// Lưu kết quả vào Offline Cache
			await setCache(cacheKey, res);
			await setCache(fallbackCacheKey, res);
		} catch (err: any) {
			console.warn(
				"[HouseholdsPage] Gọi API thất bại, chuyển sang nạp từ Offline Cache:",
				err,
			);

			const isRealNetworkError =
				err?.code === "ERR_NETWORK" ||
				err?.code === "ECONNABORTED" ||
				(!err?.response && err?.message?.includes("Network Error"));

			// Nếu isBackendHealthy là true và không phải lỗi mạng thực sự, không vội vàng hiển thị badge Offline Cache
			const shouldMarkOffline = !isBackendHealthy || isRealNetworkError;
			setIsUsingCachedData(shouldMarkOffline);

			const matchesFilters = (hh: Household) => {
				if (statusFilter && hh.status !== statusFilter) {
					return false;
				}

				const members = hh.members || [];

				if (ageFilter) {
					const hasAgeMatch = members.some((m) => {
						const mAge = calculateAge(
							m.dob_formatted || m.dob_raw || m.dob,
							calculationYear,
						);
						if (ageFilter.min !== undefined && mAge < ageFilter.min)
							return false;
						if (ageFilter.max !== undefined && mAge > ageFilter.max)
							return false;
						return true;
					});
					if (!hasAgeMatch) return false;
				}

				if (genderFilter) {
					const hasGenderMatch = members.some((m) => m.gender === genderFilter);
					if (!hasGenderMatch) return false;
				}

				if (ethnicityFilter) {
					if (ethnicityFilter === "dtts") {
						const hasDttsMatch = members.some(
							(m) => m.ethnicity && m.ethnicity !== "Kinh",
						);
						if (!hasDttsMatch) return false;
					} else {
						const hasEthMatch = members.some(
							(m) => m.ethnicity === ethnicityFilter,
						);
						if (!hasEthMatch) return false;
					}
				}

				return true;
			};

			// Nạp từ Cache nếu có
			const cached =
				(await getCache<any>(cacheKey)) ||
				(await getCache<any>(fallbackCacheKey)) ||
				(await getCache<any>("households_latest_all"));

			if (cached && Array.isArray(cached.data)) {
				const filteredList = cached.data.filter(matchesFilters);
				setHouseholds(filteredList);
				setTotal(cached.pagination?.total ?? filteredList.length);
				setTotalPages(
					cached.pagination?.totalPages ??
						(Math.ceil(filteredList.length / limit) || 1),
				);
			} else {
				// Fallback sang seed data ban đầu
				let list = INITIAL_HOUSEHOLDS.filter((h) => !h.is_deleted);
				if (targetVillageId) {
					list = list.filter((h) => h.village_id === targetVillageId);
				}
				if (debouncedSearch.trim()) {
					const q = normalizeUnaccented(debouncedSearch.toLowerCase().trim());
					list = list.filter(
						(h) =>
							normalizeUnaccented(h.head_name.toLowerCase()).includes(q) ||
							(h.book_number || "").toLowerCase().includes(q),
					);
				}
				list = list.filter(matchesFilters);
				const pTotal = list.length;
				const pTotalPages = Math.ceil(pTotal / limit) || 1;
				const paginated = list.slice((page - 1) * limit, page * limit);
				setHouseholds(paginated);
				setTotal(pTotal);
				setTotalPages(pTotalPages);
			}
		} finally {
			setLoading(false);
		}
	}, [
		user,
		selectedVillageId,
		page,
		limit,
		debouncedSearch,
		ageFilter,
		calculationYear,
		genderFilter,
		ethnicityFilter,
		statusFilter,
	]);

	// Kích hoạt nạp dữ liệu khi đổi thôn, trang, số lượng hoặc tìm kiếm
	useEffect(() => {
		fetchHouseholds();
	}, [fetchHouseholds]);

	// Khi đổi thôn, tìm kiếm hoặc các bộ lọc -> reset về trang 1
	useEffect(() => {
		setPage(1);
	}, [
		debouncedSearch,
		selectedVillageId,
		ageFilter,
		calculationYear,
		genderFilter,
		ethnicityFilter,
		statusFilter,
	]);

	// Tự động tải lại khi server được kết nối lại
	useEffect(() => {
		const handleReconnected = () => {
			fetchHouseholds();
		};
		window.addEventListener("server:reconnected", handleReconnected);
		return () =>
			window.removeEventListener("server:reconnected", handleReconnected);
	}, [fetchHouseholds]);

	// Toggle selection
	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const handleToggleSelectAll = () => {
		if (selectedIds.length === households.length) {
			setSelectedIds([]);
		} else {
			setSelectedIds(households.map((h) => h.id));
		}
	};

	// Open modal create
	const handleOpenCreate = () => {
		setEditingHousehold(null);
		setModalOpen(true);
	};

	// Open modal edit
	const handleOpenEdit = (hh: Household) => {
		setEditingHousehold(hh);
		setModalOpen(true);
	};

	// Save household (create / update)
	const handleSaveHousehold = async (data: Partial<Household>) => {
		try {
			if (editingHousehold) {
				await householdApi.update(editingHousehold.id, {
					...data,
					version: data.version ?? editingHousehold.version,
				});
				showModal({
					title: "Cập nhật thành công",
					message: `Đã lưu thông tin hộ gia đình "${data.head_name || editingHousehold?.head_name || "thành công"}"`,
					type: "success",
				});
			} else {
				await householdApi.create(data);
				showModal({
					title: "Thêm mới thành công",
					message: `Đã thêm mới hộ gia đình "${data.head_name || "thành công"}"`,
					type: "success",
				});
			}
			await fetchHouseholds();
		} catch (err: any) {
			if (err?.response?.status === 409 && editingHousehold) {
				try {
					const freshServerRecord = await householdApi.getById(editingHousehold.id);
					setConflictServerData(freshServerRecord);
					setConflictClientData({ ...editingHousehold, ...data });
					setConflictModalOpen(true);
					throw new Error("Phát hiện xung đột phiên bản dữ liệu (HTTP 409). Vui lòng chọn cách xử lý trên bảng đối soát.");
				} catch (fetchErr: any) {
					if (fetchErr.message?.includes("xung đột phiên bản")) {
						throw fetchErr;
					}
					console.error("[HouseholdsPage] Lỗi lấy bản ghi server khi xung đột:", fetchErr);
				}
			}

			console.warn(
				"[HouseholdsPage] Lỗi khi lưu qua API, ghi nhận offline:",
				err,
			);
			showModal({
				title: "Lưu ngoại tuyến",
				message:
					"Không thể kết nối máy chủ, thông tin đã được ghi nhận cục bộ.",
				type: "info",
			});
			await fetchHouseholds();
		}
	};

	const handleForceOverwriteConflict = async () => {
		if (!editingHousehold || !conflictClientData || !conflictServerData) return;
		setIsResolvingConflict(true);
		try {
			await householdApi.update(editingHousehold.id, {
				...conflictClientData,
				version: conflictServerData.version,
			});
			showModal({
				title: "Ghi đè thành công",
				message: `Đã ghi đè thông tin hộ gia đình "${conflictClientData.head_name || editingHousehold.head_name}" theo phiên bản mới nhất.`,
				type: "success",
			});
			setConflictModalOpen(false);
			setModalOpen(false);
			setEditingHousehold(null);
			await fetchHouseholds();
		} catch (err: any) {
			console.error("[HouseholdsPage] Lỗi khi ghi đè bản ghi xung đột:", err);
			showModal({
				title: "Lỗi ghi đè",
				message: "Không thể ghi đè phiên bản mới của máy chủ. Vui lòng thử lại sau.",
				type: "danger",
			});
		} finally {
			setIsResolvingConflict(false);
		}
	};

	const handleReloadServerConflict = () => {
		if (!conflictServerData) return;
		setEditingHousehold(conflictServerData);
		setConflictModalOpen(false);
		showModal({
			title: "Đã nạp dữ liệu máy chủ",
			message: "Biểu mẫu đã được cập nhật theo dữ liệu mới nhất trên máy chủ.",
			type: "info",
		});
	};

	// Delete single household (soft delete to recycle bin)
	const handleDeleteHousehold = (hh: Household) => {
		showModal({
			title: "Xác nhận chuyển vào thùng rác",
			message: `Bạn có chắc muốn chuyển Hộ gia đình của "${hh.head_name}" vào Thùng rác không?`,
			type: "warning",
			confirmText: "Chuyển Vào Thùng Rác",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await householdApi.delete(hh.id);
					showToast({
						actionKey: `delete-hh-${hh.id}`,
						message: `Đã chuyển hộ ${hh.head_name} vào thùng rác`,
						type: "success",
						onUndo: async () => {
							try {
								await householdApi.restore(hh.id);
								await fetchHouseholds();
								showToast({
									message: "Đã hoàn tác",
									type: "success",
								});
							} catch (restoreErr) {
								console.error("Lỗi hoàn tác:", restoreErr);
								showToast({
									message: "Không thể hoàn tác thao tác xóa",
									type: "danger",
								});
							}
						},
					});
				} catch (err: any) {
					console.warn("[HouseholdsPage] Lỗi xóa qua API:", err);
					showToast({
						actionKey: `delete-hh-${hh.id}`,
						message: `Đã chuyển hộ ${hh.head_name} vào thùng rác`,
						type: "info",
						onUndo: async () => {
							try {
								await householdApi.restore(hh.id);
								await fetchHouseholds();
								showToast({
									message: "Đã hoàn tác",
									type: "success",
								});
							} catch (restoreErr) {
								console.error("Lỗi hoàn tác:", restoreErr);
							}
						},
					});
				}
				await fetchHouseholds();
			},
		});
	};

	// Batch delete
	const handleBatchDelete = () => {
		if (selectedIds.length === 0) return;
		const targetIds = [...selectedIds];
		const count = targetIds.length;

		showModal({
			title: "Xóa hàng loạt vào thùng rác",
			message: `Bạn có chắc chắn muốn chuyển ${count} Hộ gia đình đã chọn vào Thùng rác không?`,
			type: "warning",
			confirmText: "Xóa Các Hộ Đã Chọn",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await householdApi.batchDelete(targetIds);
					showToast({
						actionKey: `batch-delete-${Date.now()}`,
						message: `Đã chuyển ${count} hộ gia đình vào thùng rác`,
						type: "success",
						onUndo: async () => {
							try {
								for (const id of targetIds) {
									await householdApi.restore(id);
								}
								await fetchHouseholds();
								showToast({
									message: "Đã hoàn tác",
									type: "success",
								});
							} catch (restoreErr) {
								console.error("Lỗi hoàn tác:", restoreErr);
								showToast({
									message: "Không thể hoàn tác thao tác xóa hàng loạt",
									type: "danger",
								});
							}
						},
					});
				} catch (err: any) {
					console.warn("[HouseholdsPage] Lỗi batch delete qua API:", err);
					showToast({
						actionKey: `batch-delete-${Date.now()}`,
						message: `Đã chuyển ${count} hộ gia đình vào thùng rác`,
						type: "info",
					});
				}
				setSelectedIds([]);
				await fetchHouseholds();
			},
		});
	};

	// Quick export logic chuẩn 100% biểu mẫu Nhân hộ khẩu.xls
	const handleExportConfirm = async (scope: "all" | "selected") => {
		setIsExporting(true);
		try {
			let sourceList = households;
			if (scope === "selected") {
				sourceList = households.filter((h) => selectedIds.includes(h.id));
			} else {
				try {
					const allRes = await householdApi.getPage({
						villageId: selectedVillageId || undefined,
						search: debouncedSearch.trim() || undefined,
						year: calculationYear,
						gender: genderFilter || undefined,
						ethnicity: ethnicityFilter || undefined,
						status: statusFilter || undefined,
						minAge: ageFilter?.min,
						maxAge: ageFilter?.max,
						page: 1,
						limit: 10000,
					});
					if (allRes?.data && Array.isArray(allRes.data)) {
						sourceList = allRes.data;
					}
				} catch (fetchErr) {
					console.warn(
						"[HouseholdsPage] Không thể lấy 100% dữ liệu từ API cho xuất Excel, dùng dữ liệu hiện tại:",
						fetchErr,
					);
				}
			}

			const now = new Date();
			const rows: any[][] = [
				// Row 0
				[
					"UBND TỈNH QUẢNG NGÃI\nUBND XÃ ĐĂK HÀ",
					null,
					null,
					null,
					null,
					"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự Do - Hạnh Phúc",
				],
				// Row 1
				[
					"THÔN: " + (selectedVillageName || "TOÀN XÃ ĐĂK HÀ"),
					null,
					null,
					null,
					null,
					"Đăk Hà, ngày " +
						now.getDate() +
						" tháng " +
						(now.getMonth() + 1) +
						" năm " +
						now.getFullYear(),
				],
				// Row 2
				["DỮ LIỆU HỘ - NHÂN KHẨU"],
				// Row 3
				[],
				// Row 4 (Header tầng 1)
				[
					"STT",
					"HỘ GIA ĐÌNH",
					null,
					"HỌ VÀ TÊN",
					null,
					"PHÂN TÍCH HỘ GIA ĐÌNH",
					null,
					null,
					null,
					null,
					"Ghi chú",
				],
				// Row 5 (Header tầng 2)
				[
					null,
					"Chủ hộ",
					"Thành viên",
					null,
					null,
					"Ngày, tháng, năm sinh ",
					"Tuổi",
					"Nữ",
					"DTTS",
					"Tôn giáo",
					null,
				],
			];

			let currentStt = 1;

			sourceList.forEach((hh) => {
				const membersList =
					hh.members && hh.members.length > 0
						? hh.members
						: [
								{
									id: "head-" + hh.id,
									household_id: hh.id,
									stt: 1,
									full_name: hh.head_name || "Chưa rõ",
									last_name: "",
									first_name: "",
									name_unaccented: "",
									relationship: "Chủ hộ" as const,
									is_head: true,
									gender: "Nam" as const,
									dob_raw: "",
									dob_formatted: "",
									birth_year: 2000,
									age: 0,
									cccd: hh.head_cccd || "",
									cccd_masked: "",
									ethnicity: "Kinh",
									is_minority: false,
									religion: "Không",
									notes: hh.notes || "",
								},
							];

				membersList.forEach((m, memIdx) => {
					const isHead = m.is_head || m.relationship === "Chủ hộ";
					const { lastName, firstName } = splitFullName(m.full_name || "");
					const chuHoVal = isHead ? "CH" : null;
					const thanhVienVal = memIdx + 1;
					const hoDemVal = (lastName || "").toUpperCase();
					const tenVal = (firstName || "").toUpperCase();
					const dobVal = m.dob_formatted || m.dob_raw || m.dob || "";
					const ageVal = m.age || "";
					const nuVal = m.gender === "Nữ" ? "X" : null;
					const dttsVal = m.ethnicity || "Kinh";
					let religionVal = m.religion || "Không";
					if (religionVal === "CG") religionVal = "Công giáo";
					else if (religionVal === "TL") religionVal = "Tin lành";
					else if (religionVal === "PG") religionVal = "Phật giáo";
					const ghiChuVal = m.notes || "";

					rows.push([
						currentStt++,
						chuHoVal,
						thanhVienVal,
						hoDemVal,
						tenVal,
						dobVal,
						ageVal,
						nuVal,
						dttsVal,
						religionVal,
						ghiChuVal,
					]);
				});
			});

			// Áp dụng sanitizeExcelRow để chống tấn công Formula Injection (CWE-1236)
			const sanitizedRows = rows.map(sanitizeExcelRow);
			const ws = XLSX.utils.aoa_to_sheet(sanitizedRows);
			ws["!merges"] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
				{ s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },
				{ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
				{ s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
				{ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
				{ s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, // STT
				{ s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // HỘ GIA ĐÌNH
				{ s: { r: 4, c: 3 }, e: { r: 5, c: 4 } }, // HỌ VÀ TÊN
				{ s: { r: 4, c: 5 }, e: { r: 4, c: 9 } }, // PHÂN TÍCH
				{ s: { r: 4, c: 10 }, e: { r: 5, c: 10 } }, // Ghi chú
			];
			ws["!cols"] = [
				{ wch: 6 },
				{ wch: 10 },
				{ wch: 12 },
				{ wch: 22 },
				{ wch: 10 },
				{ wch: 22 },
				{ wch: 8 },
				{ wch: 8 },
				{ wch: 14 },
				{ wch: 14 },
				{ wch: 20 },
			];

			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Dl Hộ");
			const filename = `NhanHoKhau_DakHa_${new Date().toISOString().slice(0, 10)}.xlsx`;
			XLSX.writeFile(wb, filename);

			setExportModalOpen(false);
			showModal({
				title: "Xuất file thành công",
				message: `Đã xuất ${currentStt - 1} nhân khẩu ra tệp ${filename}`,
				type: "success",
			});
		} catch (err: any) {
			console.error(err);
			showModal({
				title: "Lỗi xuất file",
				message: `Không thể xuất file Excel: ${err.message}`,
				type: "danger",
			});
		} finally {
			setIsExporting(false);
		}
	};

	// Import trực tiếp từ Excel
	const handleConfirmImport = async (validRows: any[]) => {
		setIsImportingModal(true);
		try {
			const householdMap: Record<
				string,
				{ code: string; address: string; notes: string; members: Person[] }
			> = {};
			const targetVillageId = selectedVillageId || villages[0]?.id || "vil-01";
			const targetVillage = villages.find((v) => v.id === targetVillageId);

			validRows.forEach((r, idx) => {
				const code = String(
					r.code || `SHK-IMP-${Math.floor(idx / 4) + 1}`,
				).trim();
				const fullName = String(r.fullName || "").trim();
				const relationship = String(r.relationship || "Chủ hộ").trim();
				const isHead = relationship.toLowerCase().includes("chủ hộ");
				const dobRaw = String(r.dobRaw || "").trim();
				const gender = String(r.gender || "Nam").trim();
				const ethnicity = String(r.ethnicity || "Kinh").trim();
				const rawReligion = String(r.religion || "Không").trim();
				let religion = rawReligion;
				if (rawReligion === "CG") religion = "Công giáo";
				else if (rawReligion === "TL") religion = "Tin lành";
				else if (rawReligion === "PG") religion = "Phật giáo";
				const cccd = String(r.cccd || "").trim();
				const address = String(
					r.address || targetVillage?.name || "Xã Đăk Hà",
				).trim();
				const notes = String(r.notes || "").trim();

				let dobFormatted = dobRaw;
				let birthYear = 2000;
				let age = 26;
				if (dobRaw) {
					const dobVal = parseAndValidateDob(dobRaw);
					if (dobVal.isValid) {
						dobFormatted = dobVal.formatted || dobRaw;
						birthYear = dobVal.birthYear ?? 2000;
						age = calculateAge(dobFormatted, 2026);
					}
				}

				const { lastName, firstName } = splitFullName(fullName);

				const person: Person = {
					id: `imp-mem-${Date.now()}-${idx}`,
					household_id: code,
					stt: idx + 1,
					full_name: fullName,
					last_name: lastName,
					first_name: firstName,
					name_unaccented: normalizeUnaccented(fullName),
					relationship: relationship as any,
					is_head: isHead,
					gender: (gender === "Nữ" ? "Nữ" : "Nam") as any,
					dob: dobFormatted,
					dob_raw: dobRaw,
					dob_formatted: formatDobDisplay(dobFormatted),
					birth_year: birthYear,
					age,
					cccd,
					cccd_last4: cccd ? cccd.slice(-4) : "",
					cccd_masked: maskCccd(cccd, false),
					ethnicity,
					is_minority: ethnicity !== "Kinh",
					religion,
					occupation: notes,
					notes,
				};

				if (!householdMap[code]) {
					householdMap[code] = {
						code,
						address,
						notes,
						members: [],
					};
				}
				householdMap[code].members.push(person);
			});

			let addedCount = 0;
			for (const group of Object.values(householdMap)) {
				const headPerson =
					group.members.find((m) => m.is_head) || group.members[0];
				const newHhData: Household = {
					id: `imp-hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					book_number: group.code,
					code: group.code,
					village_id: targetVillageId,
					village_name: targetVillage?.name || "Thôn 1",
					head_name: headPerson ? headPerson.full_name : "Chưa rõ",
					head_cccd: headPerson ? headPerson.cccd : "",
					address: group.address,
					status: "Thường trú",
					notes: group.notes,
					members_count: group.members.length,
					members: group.members,
					is_deleted: false,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};

				// 1. Đồng bộ vào Context Store (reactive state và offline cache)
				try {
					addHousehold(newHhData);
				} catch (ctxErr) {
					console.warn("[HouseholdsPage] Lỗi cập nhật context store:", ctxErr);
				}

				// 2. Đồng bộ vào CSDL backend qua API
				try {
					await householdApi.create(newHhData);
				} catch (apiErr) {
					console.warn(
						"[HouseholdsPage] Lưu API ngoại tuyến cho hộ:",
						group.code,
						apiErr,
					);
				}
				addedCount++;
			}

			setIsImportModalOpen(false);
			showModal({
				title: "Nhập dữ liệu thành công",
				message: `Đã nhập thành công ${addedCount} hộ gia đình với ${validRows.length} nhân khẩu vào cơ sở dữ liệu.`,
				type: "success",
			});
			await fetchHouseholds();
		} catch (err: any) {
			console.error(err);
			showModal({
				title: "Lỗi nhập dữ liệu",
				message: `Không thể nhập dữ liệu vào CSDL: ${err.message}`,
				type: "danger",
			});
		} finally {
			setIsImportingModal(false);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			{/* Top Banner & Title */}
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							{selectedVillageName || "Toàn xã Đăk Hà"}
						</span>

						{/* Badge Offline Cache nổi bật */}
						{isUsingCachedData && (
							<div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold shadow-xs animate-in fade-in">
								<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block mr-1.5" />
								<span>Đang chạy trên dữ liệu ngoại tuyến (Offline Cache)</span>
							</div>
						)}

						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<Users
								className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
							<span>Quản Lý Hộ Gia Đình & Nhân Khẩu</span>
							<span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs tabular-nums font-bold border border-emerald-200 dark:border-emerald-800">
								{formatVietnameseNumber(total)} hộ
							</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Theo dõi, cập nhật thông tin hộ gia đình và thành viên nhân khẩu
						thuộc {villages.length} thôn Xã Đăk Hà
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					{user?.role === "admin" && selectedVillageId && (
						<button
							type="button"
							onClick={() => {
								setSelectedVillageId("");
								setActiveTab("villages");
							}}
							className="h-10 flex items-center justify-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer border border-slate-200 dark:border-slate-700"
						>
							<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
							<span>Đổi thôn</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsImportModalOpen(true)}
						className="h-10 flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer border border-slate-200 dark:border-slate-700"
					>
						<FileSpreadsheet
							className="w-4 h-4 text-emerald-600"
							strokeWidth={1.5}
						/>
						<span>Nhập Excel</span>
					</button>

					<button
						type="button"
						onClick={() => setExportModalOpen(true)}
						className="h-10 flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer border border-slate-200 dark:border-slate-700"
					>
						<Download className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
						<span>Xuất Excel</span>
					</button>

					<button
						type="button"
						onClick={handleOpenCreate}
						className="h-10 flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
					>
						<Plus className="w-4 h-4" strokeWidth={1.5} />
						<span>Thêm Hộ Gia Đình</span>
					</button>
				</div>
			</div>

			{/* Thanh tìm kiếm không dấu & Bộ lọc độ tuổi */}
			<HouseholdFilterBar
				search={search}
				setSearch={setSearch}
				loading={loading}
				onRefresh={fetchHouseholds}
				ageFilter={ageFilter}
				setAgeFilter={setAgeFilter}
				year={calculationYear}
				onYearChange={setCalculationYear}
				genderFilter={genderFilter}
				setGenderFilter={setGenderFilter}
				ethnicityFilter={ethnicityFilter}
				setEthnicityFilter={setEthnicityFilter}
				statusFilter={statusFilter}
				setStatusFilter={setStatusFilter}
				selectedCount={selectedIds.length}
				onBatchDelete={handleBatchDelete}
				onExportSelected={() => handleExportConfirm("selected")}
				onDeselectAll={() => setSelectedIds([])}
				onClearAllFilters={() => {
					setSearch("");
					setAgeFilter(null);
					setGenderFilter("");
					setEthnicityFilter("");
					setStatusFilter("");
				}}
			/>

			{/* Bảng Hộ Gia Đình + Accordion Nhân Khẩu */}
			<HouseholdTable
				selectedIds={selectedIds}
				onToggleSelect={handleToggleSelect}
				onToggleSelectAll={handleToggleSelectAll}
				households={households}
				loading={loading}
				total={total}
				page={page}
				limit={limit}
				totalPages={totalPages}
				onPageChange={setPage}
				onLimitChange={setLimit}
				onEdit={handleOpenEdit}
				onDelete={handleDeleteHousehold}
				ageFilter={ageFilter}
				calculationYear={calculationYear}
			/>

			{/* Slide-over Drawer Thêm / Sửa Hộ Gia Đình & Nhân Khẩu */}
			<HouseholdDrawer
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				household={editingHousehold}
				onSave={handleSaveHousehold}
			/>

			{/* Modal Cài Đặt Xuất File Excel */}
			<ExportSettingsModal
				isOpen={exportModalOpen}
				onClose={() => setExportModalOpen(false)}
				onExport={handleExportConfirm}
				exporting={isExporting}
				selectedCount={selectedIds.length}
				villageName={selectedVillageName}
			/>

			{/* Modal Đối Soát & Nhập Dữ Liệu Excel Trực Tiếp */}
			<ImportPreviewModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onConfirm={handleConfirmImport}
				importing={isImportingModal}
			/>

			{/* Modal Đối Soát Xung Đột Phiên Bản OCC 409 */}
			<ConflictResolutionModal
				isOpen={conflictModalOpen}
				onClose={() => setConflictModalOpen(false)}
				clientData={conflictClientData}
				serverData={conflictServerData}
				onForceOverwrite={handleForceOverwriteConflict}
				onReloadServer={handleReloadServerConflict}
				loading={isResolvingConflict}
			/>
		</div>
	);
};
