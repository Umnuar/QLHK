import {
	Award,
	Download,
	HeartHandshake,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/AppContext";
import { htxhApi } from "@/api/htxh";
import { profilesApi } from "@/api/profiles";
import { settingsApi } from "@/api/settings";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/components/common/Toast";
import { MainTable } from "../components/dashboard/MainTable";
import { ProfileFilterBar } from "../components/dashboard/ProfileFilterBar";
import { useFilters } from "@/hooks/useFilters";
import { useImportExport } from "@/hooks/useImportExport";
import { useProfiles } from "@/hooks/useProfiles";
import { ExportModal } from "../components/dashboard/ExportModal";
import { ProfileModal } from "../components/dashboard/ProfileModal";
import type { TabType } from "@/types";

interface DashboardProps {
	isGlobal?: boolean;
	tabOverride?: TabType;
}

const EMPTY_AGE_FILTERS: string[] = [];

export default function Dashboard({ isGlobal, tabOverride }: DashboardProps) {
	const {
		activeTab: contextTab,
		selectedVillageId,
		setSelectedVillageId,
		villages,
		isDarkMode,
		user,
	} = useApp();
	const { showAlert, showConfirm } = useModal();
	const { showToast } = useToast();
	const toastError = useCallback((message: string) => showToast({ message, type: "error" }), [showToast]);

	const selectedVillage = villages.find((v) => v.id === selectedVillageId);
	const selectedVillageName = selectedVillage ? selectedVillage.name : "";

	const activeTab: TabType =
		tabOverride || (contextTab === "htxh" ? "htxh" : "chuctho");

	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [isNewProfile, setIsNewProfile] = useState(false);
	const [activeProfileData, setActiveProfileData] = useState<any>(null);

	const [globalCalculationYear, setGlobalCalculationYear] = useState(
		new Date().getFullYear(),
	);

	useEffect(() => {
		settingsApi
			.getSettings()
			.then((res: any) => {
				const year =
					res?.data?.globalCalculationYear ||
					localStorage.getItem("globalCalculationYear");
				if (year) setGlobalCalculationYear(parseInt(year, 10));
			})
			.catch(() => {
				const saved = localStorage.getItem("globalCalculationYear");
				if (saved) setGlobalCalculationYear(parseInt(saved, 10));
			});
	}, []);

	const handleGlobalYearChange = async (year: number) => {
		setGlobalCalculationYear(year);
		try {
			await settingsApi.updateSettings({ globalCalculationYear: String(year) });
			if (activeTab === "chuctho") {
				await profilesApi.recalculate(year);
			} else {
				await htxhApi.recalculate(year);
			}
		} catch (e) {
			console.error("Failed to recalculate year:", e);
		}
		loadProfiles();
	};

	const panelClass = isDarkMode
		? "bg-slate-900 border-slate-800 text-slate-100"
		: "bg-white border-slate-200 text-slate-900";
	const softTextClass = isDarkMode ? "text-slate-400" : "text-slate-600";

	const filters = useFilters(activeTab);

	const [ageMilestoneFilter, setAgeMilestoneFilter] = useState<string>("");

	useEffect(() => {
		if (activeTab) {
			setAgeMilestoneFilter("");
		}
	}, [activeTab]);

	const effectiveVillageId = isGlobal ? "" : selectedVillageId || "";

	const profileFilters = useMemo(
		() => ({
			debouncedSearch: filters.debouncedSearch,
			dateFilter: filters.debouncedDateFilter,
			statusFilter: filters.statusFilter,
			ageFilters: ageMilestoneFilter ? [ageMilestoneFilter] : EMPTY_AGE_FILTERS,
			villageFilters: filters.villageFilters,
			genderFilter: filters.genderFilter,
			ethnicityFilter: filters.ethnicityFilter,
			residenceFilter: filters.residenceFilter,
			sortKey: filters.sortConfig.key,
			sortDirection: filters.sortConfig.direction,
			currentPage: filters.currentPage,
			itemsPerPage: filters.itemsPerPage,
			setCurrentPage: filters.setCurrentPage,
			setItemsPerPage: filters.setItemsPerPage,
		}),
		[
			filters.debouncedSearch,
			filters.debouncedDateFilter,
			filters.statusFilter,
			ageMilestoneFilter,
			filters.villageFilters,
			filters.genderFilter,
			filters.ethnicityFilter,
			filters.residenceFilter,
			filters.sortConfig.key,
			filters.sortConfig.direction,
			filters.currentPage,
			filters.itemsPerPage,
			filters.setCurrentPage,
			filters.setItemsPerPage,
		],
	);

	const {
		pageData,
		total,
		loadProfiles,
		isBulkUpdating,
		auditLogs,
		isLoadingLogs,
		loadAuditLogs,
		handleToggleReceived,
		handleBulkToggleReceived,
		handleBulkDelete,
		executeDelete,
		handleSave,
	} = useProfiles(
		effectiveVillageId,
		isGlobal,
		user,
		activeTab,
		profileFilters,
		globalCalculationYear,
	);

	const {
		isExportModalOpen,
		setIsExportModalOpen,
		isExporting,
		executeExport,
	} = useImportExport(
		effectiveVillageId,
		activeTab,
		user,
		async () => {
			await loadProfiles();
		},
		isGlobal,
		villages as any,
		{
			search: filters.debouncedSearch,
			statusFilter: filters.statusFilter,
			ageFilters: ageMilestoneFilter ? [ageMilestoneFilter] : [],
			villageFilters: filters.villageFilters as any,
			genderFilter: filters.genderFilter,
			ethnicityFilter: filters.ethnicityFilter,
			residenceFilter: filters.residenceFilter,
			sortKey: filters.sortConfig.key,
			sortDirection: filters.sortConfig.direction,
		},
		globalCalculationYear,
	);

	const totalPages = Math.ceil(total / filters.itemsPerPage) || 1;

	useEffect(() => {
		loadProfiles();
	}, [loadProfiles]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === "n") {
				e.preventDefault();
				setIsNewProfile(true);
				setActiveProfileData(null);
				setIsProfileModalOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleOpenAddProfile = () => {
		setIsNewProfile(true);
		setActiveProfileData(null);
		setIsProfileModalOpen(true);
	};

	const handleOpenEditProfile = (profile: any) => {
		setIsNewProfile(false);
		setActiveProfileData(profile);
		setIsProfileModalOpen(true);
	};

	const handleCloseProfileModal = useCallback(() => {
		setIsProfileModalOpen(false);
	}, []);

	const handleDeleteProfile = async (profile: any) => {
		const confirmed = await showConfirm(
			"Xác nhận xóa hồ sơ",
			`Bạn có chắc chắn muốn chuyển hồ sơ của "${profile.name}" vào Thùng rác không? Dữ liệu có thể khôi phục lại bất kỳ lúc nào từ Thùng rác.`,
			"warning",
		);
		if (confirmed) {
			const success = await executeDelete(String(profile.id));
			if (success) {
				showAlert(
					"Thành công",
					`Đã chuyển hồ sơ của "${profile.name}" vào Thùng rác.`,
					"success",
				);
			}
		}
	};

	const handleBulkDeleteWithConfirm = async () => {
		if (filters.selectedIds.size === 0) return;
		const count = filters.selectedIds.size;
		const confirmed = await showConfirm(
			"Xác nhận xóa hàng loạt",
			`Bạn có chắc chắn muốn chuyển ${count} hồ sơ đã chọn vào Thùng rác không? Dữ liệu có thể khôi phục lại bất kỳ lúc nào từ Thùng rác.`,
			"warning",
		);
		if (confirmed) {
			await handleBulkDelete(filters.selectedIds, filters.setSelectedIds);
			showAlert(
				"Thành công",
				`Đã chuyển ${count} hồ sơ vào Thùng rác thành công.`,
				"success",
			);
		}
	};

	const handleToggleReceivedWithUndo = useCallback(
		async (id: string | number, newStatus: boolean) => {
			const targetProfile = pageData.find((p) => String(p.id) === String(id));
			const prevStatus = targetProfile
				? Boolean(targetProfile.received)
				: !newStatus;

			const success = await handleToggleReceived(id, newStatus);
			if (success !== false) {
				const name = targetProfile?.name;
				const message = newStatus
					? name
						? `Đã đánh dấu đã nhận quà: ${name}`
						: "Đã đánh dấu đã nhận quà"
					: name
						? `Đã đánh dấu chưa nhận quà: ${name}`
						: "Đã đánh dấu chưa nhận quà";

				showToast({
					message,
					type: "success",
					duration: 5000,
					actionKey: `gift-${id}`,
					onUndo: async () => {
						await handleToggleReceived(id, prevStatus);
					},
				});
			} else {
				toastError("Không thể cập nhật trạng thái quà. Vui lòng thử lại.");
			}
		},
		[pageData, handleToggleReceived, showToast, toastError],
	);

	const handleBulkToggleReceivedWithUndo = useCallback(
		async (status: boolean) => {
			if (filters.selectedIds.size === 0) return;
			const count = filters.selectedIds.size;
			const selectedList = Array.from(filters.selectedIds);
			const prevMap = new Map<string, boolean>();
			for (const id of selectedList) {
				const found = pageData.find((p) => String(p.id) === String(id));
				if (found) {
					prevMap.set(String(id), Boolean(found.received));
				}
			}

			const success = await handleBulkToggleReceived(
				status,
				filters.selectedIds,
				filters.setSelectedIds,
			);

			if (success !== false) {
				showToast({
					message: status
						? `Đã đánh dấu ${count} người đã nhận quà`
						: `Đã đánh dấu ${count} người chưa nhận quà`,
					type: "success",
					duration: 5000,
					actionKey: "bulk-gift",
					onUndo: async () => {
						const updates: Promise<any>[] = [];
						for (const [id, prev] of prevMap.entries()) {
							updates.push(handleToggleReceived(id, prev));
						}
						await Promise.all(updates);
					},
				});
			} else {
				toastError("Không thể cập nhật trạng thái hàng loạt. Vui lòng thử lại.");
			}
		},
		[
			filters.selectedIds,
			filters.setSelectedIds,
			pageData,
			handleBulkToggleReceived,
			handleToggleReceived,
			showToast,
			toastError,
		],
	);

	const handleSaveProfileFromModal = async (
		formData: any,
	): Promise<boolean> => {
		const success = await handleSave(
			formData,
			isNewProfile ? null : formData.id,
		);
		if (success) {
			setIsProfileModalOpen(false);
			showAlert({
				title: "Thành công",
				message: isNewProfile
					? "Thêm mới hồ sơ thành công."
					: "Cập nhật thông tin hồ sơ thành công.",
				type: "success",
			});
		}
		return Boolean(success);
	};

	return (
		<div className="space-y-4 animate-in fade-in pt-1.5 pb-10 select-none">

			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							{selectedVillageName || "Toàn xã Đăk Hà"}
						</span>

						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							{activeTab === "chuctho" ? (
								<Award
									className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
									strokeWidth={1.5}
								/>
							) : (
								<HeartHandshake
									className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
									strokeWidth={1.5}
								/>
							)}
							<span>
								{activeTab === "chuctho" ? "Hồ Sơ Chúc Thọ" : "Hưu Trí Xã Hội"}
							</span>
							<span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
								{total !== undefined ? `${total} hồ sơ` : `${pageData.length} hồ sơ`}
							</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Theo dõi, rà soát và thực hiện chế độ chính sách cho người cao tuổi
						xã Đăk Hà • Năm tính toán:{" "}
						<span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
							{globalCalculationYear}
						</span>
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={() => setIsExportModalOpen(true)}
						disabled={isExporting}
						className="h-10 flex items-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
					>
						<Download className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
						<span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
					</button>

					<button
						type="button"
						onClick={handleOpenAddProfile}
						className="h-10 flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
					>
						<Plus className="w-4 h-4" strokeWidth={1.5} />
						<span>Thêm Hồ Sơ</span>
					</button>
				</div>
			</div>

			<ProfileFilterBar
				activeTab={activeTab}
				search={filters.search}
				setSearch={filters.setSearch}
				dateFilter={filters.dateFilter}
				onDateChange={filters.setDateFilter}
				loading={isLoadingLogs || isBulkUpdating}
				onRefresh={loadProfiles}
				selectedVillageId={effectiveVillageId}
				onVillageChange={(vid) => {
					setSelectedVillageId(vid);
					filters.setCurrentPage(1);
				}}
				villages={villages}
				statusFilter={filters.statusFilter}
				onStatusChange={(st) => {
					filters.setStatusFilter(st);
					filters.setCurrentPage(1);
				}}
				ageMilestoneFilter={ageMilestoneFilter}
				onAgeMilestoneChange={(m) => {
					setAgeMilestoneFilter(m);
					filters.setCurrentPage(1);
				}}
				globalCalculationYear={globalCalculationYear}
				onYearChange={handleGlobalYearChange}
				genderFilter={filters.genderFilter}
				setGenderFilter={filters.setGenderFilter}
				ethnicityFilter={filters.ethnicityFilter}
				setEthnicityFilter={filters.setEthnicityFilter}
				residenceFilter={filters.residenceFilter}
				setResidenceFilter={filters.setResidenceFilter}
				onClearAllFilters={() => {
					filters.resetFilters();
					setAgeMilestoneFilter("");
				}}
				showVillageFilter={Boolean(isGlobal && !selectedVillageId)}
				selectedCount={filters.selectedIds.size}
				onBulkDelete={handleBulkDeleteWithConfirm}
				onBulkToggleReceived={handleBulkToggleReceivedWithUndo}
				onDeselectAll={() => filters.setSelectedIds(new Set())}
				isBulkUpdating={isBulkUpdating}
			/>

			<MainTable
				paginatedProfiles={pageData}
				activeTab={activeTab}
				currentPage={filters.currentPage}
				itemsPerPage={filters.itemsPerPage}
				total={total}
				totalPages={totalPages}
				onPageChange={filters.setCurrentPage}
				onLimitChange={(newLimit) => {
					filters.setItemsPerPage(newLimit);
					filters.setCurrentPage(1);
				}}
				selectedIds={filters.selectedIds}
				setSelectedIds={filters.setSelectedIds}
				onEditProfile={handleOpenEditProfile}
				onDeleteProfile={handleDeleteProfile}
				handleToggleReceived={handleToggleReceivedWithUndo}
				sortConfig={filters.sortConfig}
				handleSort={filters.handleSort}
				isDarkMode={isDarkMode}
				panelClass={panelClass}
				softTextClass={softTextClass}
				calculationYear={globalCalculationYear}
			/>

			<ProfileModal
				isOpen={isProfileModalOpen}
				onClose={handleCloseProfileModal}
				onSave={handleSaveProfileFromModal}
				initialData={activeProfileData}
				isNew={isNewProfile}
				activeTab={activeTab}
				villages={villages}
				defaultVillageId={effectiveVillageId}
				calculationYear={globalCalculationYear}
				auditLogs={auditLogs}
				isLoadingLogs={isLoadingLogs}
				loadAuditLogs={loadAuditLogs}
			/>

			<ExportModal
				isExportModalOpen={isExportModalOpen}
				setIsExportModalOpen={setIsExportModalOpen}
				isDarkMode={isDarkMode}
				panelClass={panelClass}
				softTextClass={softTextClass}
				totalFiltered={total}
				isGlobal={isGlobal}
				executeExport={executeExport}
				isExporting={isExporting}
				villages={villages}
				selectedIds={filters.selectedIds}
				activeTab={activeTab}
				villageName={selectedVillageName}
				filters={{
					search: filters.debouncedSearch,
					statusFilter: filters.statusFilter,
					ageFilters: ageMilestoneFilter ? [ageMilestoneFilter] : [],
					villageFilters: filters.villageFilters,
				}}
			/>
		</div>
	);
}
