import {
	ArrowRight,
	BarChart3,
	Check,
	Edit3,
	Globe,
	Home,
	MapPin,
	Plus,
	Search,
	Trash2,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../AppContext";
import {
	type AnalyticsOverviewData,
	analyticsApi,
	type VillageAnalyticsRow,
} from "../api/analyticsApi";
import { authApi } from "../api/authApi";
import { villageApi } from "../api/villageApi";
import { getCache, setCache } from "../db/indexedDB";
import { useModal } from "../hooks/useModal";
import { type User, Village } from "../types";
import { normalizeUnaccented } from "../utils/vietnamese";

let cachedStatsTime = 0;
let cachedUsersTime = 0;

export const VillagesPage: React.FC = () => {
	const {
		villages,
		setSelectedVillageId,
		setActiveTab,
		user,
		refreshVillages,
	} = useApp();
	const { showModal } = useModal();
	const isAdmin = user?.role === "admin";

	const [searchTerm, setSearchTerm] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [newName, setNewName] = useState("");
	const [newCode, setNewCode] = useState("");
	const [userList, setUserList] = useState<User[]>([]);

	// Số liệu thống kê động thời gian thực từ CSDL Backend kèm Offline Cache
	const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
	const [villageStats, setVillageStats] = useState<
		Record<string, VillageAnalyticsRow>
	>({});

	const fetchVillageStats = useCallback(
		async (force = false) => {
			if (!force && Date.now() - cachedStatsTime < 30000 && overview) {
				return;
			}
			try {
				const [overviewData, byVillageData] = await Promise.all([
					analyticsApi.getOverview(),
					analyticsApi.getByVillage(),
				]);

				if (overviewData) {
					setOverview(overviewData);
					await setCache("villages_overview", overviewData);
				}

				if (Array.isArray(byVillageData)) {
					const statsMap: Record<string, VillageAnalyticsRow> = {};
					byVillageData.forEach((row) => {
						if (row.village_id) statsMap[row.village_id] = row;
						if (row.village_code) statsMap[row.village_code] = row;
						if (row.village_name) {
							statsMap[row.village_name] = row;
							statsMap[row.village_name.toLowerCase().trim()] = row;
							statsMap[
								normalizeUnaccented(row.village_name.toLowerCase().trim())
							] = row;
						}
					});
					setVillageStats(statsMap);
					await setCache("villages_breakdown", byVillageData);
				}
				cachedStatsTime = Date.now();
			} catch (err) {
				console.warn(
					"[VillagesPage] Lỗi tải số liệu thống kê thời gian thực, chuyển sang nạp từ Offline Cache:",
					err,
				);
				try {
					const cachedOverview =
						await getCache<AnalyticsOverviewData>("villages_overview");
					const cachedBreakdown =
						await getCache<VillageAnalyticsRow[]>("villages_breakdown");

					if (cachedOverview) {
						setOverview(cachedOverview);
					}
					if (Array.isArray(cachedBreakdown)) {
						const statsMap: Record<string, VillageAnalyticsRow> = {};
						cachedBreakdown.forEach((row) => {
							if (row.village_id) statsMap[row.village_id] = row;
							if (row.village_code) statsMap[row.village_code] = row;
							if (row.village_name) {
								statsMap[row.village_name] = row;
								statsMap[row.village_name.toLowerCase().trim()] = row;
								statsMap[
									normalizeUnaccented(row.village_name.toLowerCase().trim())
								] = row;
							}
						});
						setVillageStats(statsMap);
					}
				} catch (cacheErr) {
					console.error("[VillagesPage] Lỗi đọc Offline Cache:", cacheErr);
				}
			}
		},
		[overview],
	);

	const fetchUsers = useCallback(
		async (force = false) => {
			if (
				!force &&
				Date.now() - cachedUsersTime < 30000 &&
				userList.length > 0
			) {
				return;
			}
			try {
				const users = await authApi.getUsers();
				setUserList(users);
				cachedUsersTime = Date.now();
			} catch (err) {
				console.warn("[VillagesPage] Lỗi tải danh sách cán bộ:", err);
			}
		},
		[userList.length],
	);

	useEffect(() => {
		fetchVillageStats();
		fetchUsers();
	}, [fetchVillageStats, fetchUsers]);

	useEffect(() => {
		const handleReconnected = () => {
			fetchVillageStats(true);
			fetchUsers(true);
		};
		window.addEventListener("server:reconnected", handleReconnected);
		return () =>
			window.removeEventListener("server:reconnected", handleReconnected);
	}, [fetchVillageStats, fetchUsers]);

	const filteredVillages = villages.filter((v) =>
		v.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleVillageClick = (id: string) => {
		setSelectedVillageId(id);
		setActiveTab("analytics");
	};

	const handleUpdate = async (id: string) => {
		if (!editName.trim()) return;
		try {
			await villageApi.update(id, editName.trim());
			cachedStatsTime = 0;
			await refreshVillages();
			await fetchVillageStats(true);
			setEditingId(null);
			showModal({
				title: "Thành công",
				message: "Cập nhật tên thôn thành công",
				type: "success",
			});
		} catch (err: any) {
			console.error("Lỗi cập nhật tên thôn:", err);
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error ||
					err.message ||
					"Không thể cập nhật tên thôn",
				type: "danger",
			});
		}
	};

	const handleDelete = (id: string, name: string) => {
		const vStat =
			villageStats[id] ||
			villageStats[name] ||
			villageStats[name.toLowerCase().trim()] ||
			villageStats[normalizeUnaccented(name.toLowerCase().trim())];
		const count = vStat?.household_count ?? 0;

		const confirmMessage =
			count > 0
				? `Thôn này hiện đang có ${count} hộ gia đình. Việc xóa thôn sẽ xóa/ảnh hưởng toàn bộ các hộ dân này. Bạn có chắc chắn muốn xóa không?`
				: `Bạn có chắc muốn xóa "${name}" không?\nThao tác này không thể hoàn tác.`;

		showModal({
			title:
				count > 0 ? "Cảnh báo nguy hiểm khi xóa thôn" : "Xác nhận xóa thôn",
			message: confirmMessage,
			type: "danger",
			confirmText: "Xác nhận xóa",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await villageApi.delete(id);
					cachedStatsTime = 0;
					await refreshVillages();
					await fetchVillageStats(true);
					setTimeout(() => {
						showModal({
							title: "Thành công",
							message: "Đã xóa thôn thành công",
							type: "success",
						});
					}, 250);
				} catch (err: any) {
					console.error("Lỗi xóa thôn:", err);
					setTimeout(() => {
						showModal({
							title: "Lỗi",
							message:
								err.response?.data?.error ||
								err.message ||
								"Không thể xóa thôn",
							type: "danger",
						});
					}, 250);
				}
			},
		});
	};

	const handleCreate = async () => {
		if (!newName.trim()) return;
		try {
			await villageApi.create(newName.trim(), newCode.trim() || undefined);
			cachedStatsTime = 0;
			await refreshVillages();
			await fetchVillageStats(true);
			setIsAdding(false);
			setNewName("");
			setNewCode("");
			showModal({
				title: "Thành công",
				message: "Thêm thôn mới thành công",
				type: "success",
			});
		} catch (err: any) {
			console.error("Lỗi thêm thôn mới:", err);
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error || err.message || "Không thể tạo thôn mới",
				type: "danger",
			});
		}
	};

	const totalHouseholds = overview?.totalHouseholds ?? 0;
	const totalCitizens = overview?.totalCitizens ?? 0;
	const avgSize = overview?.averageHouseholdSize ?? 0;
	const maleCount = overview?.gender?.male?.count ?? 0;
	const malePct = overview?.gender?.male?.percentage ?? 0;
	const femaleCount = overview?.gender?.female?.count ?? 0;
	const femalePct = overview?.gender?.female?.percentage ?? 0;

	// Tính số lượng và tỷ lệ DTTS (các dân tộc khác Kinh)
	const dttsCount = overview?.ethnicities
		? overview.ethnicities
				.filter((e) => e.name.toLowerCase().trim() !== "kinh")
				.reduce((sum, e) => sum + e.count, 0)
		: 0;
	const dttsPercentage =
		totalCitizens > 0 ? ((dttsCount / totalCitizens) * 100).toFixed(1) : "0.0";

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			{/* Banner Tổng Quan Toàn Xã (Gradient Emerald Đậm) */}
			<div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
				<div className="flex items-center gap-4 relative z-10">
					<div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-xs">
						<BarChart3 className="w-7 h-7 text-white" strokeWidth={1.5} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[11px] font-bold uppercase tracking-wider">
								UBND Xã Đăk Hà
							</span>
							<span className="text-xs text-emerald-200">
								Địa Bàn {villages.length} Thôn
							</span>
						</div>
						<h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
							Tổng Quan Dân Cư & Hộ Gia Đình Toàn Xã
						</h2>
						<p className="text-xs text-emerald-100/90 font-medium mt-0.5">
							Tổng số:{" "}
							<strong className="font-bold text-white">
								{totalHouseholds}
							</strong>{" "}
							hộ gia đình •{" "}
							<strong className="font-bold text-white">{totalCitizens}</strong>{" "}
							nhân khẩu (Bình quân:{" "}
							<strong className="font-bold text-white">{avgSize}</strong>{" "}
							người/hộ)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
					<button
						type="button"
						onClick={() => {
							setSelectedVillageId("");
							setActiveTab("analytics");
						}}
						className="h-10 px-4 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
					>
						<span>Xem Báo Cáo Thống Kê</span>
						<ArrowRight className="w-4 h-4" strokeWidth={1.5} />
					</button>
				</div>
			</div>

			{/* 4 Thẻ KPI Phụ */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* KPI 1: Số Thôn */}
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Địa Bàn Quản Lý
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
							{villages.length} Thôn
						</div>
						<span className="text-[11px] text-slate-400 font-medium mt-0.5">
							Toàn địa bàn Xã Đăk Hà
						</span>
					</div>
					<MapPin
						className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
						strokeWidth={1.5}
					/>
				</div>

				{/* KPI 2: Tổng Hộ Dân */}
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Tổng Hộ Gia Đình
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
							{totalHouseholds} Hộ
						</div>
						<span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
							Bình quân: {avgSize} người/hộ
						</span>
					</div>
					<Home
						className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
						strokeWidth={1.5}
					/>
				</div>

				{/* KPI 3: Tổng Nhân Khẩu */}
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Tổng Nhân Khẩu
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
							{totalCitizens} Người
						</div>
						<span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
							Nam: {maleCount} ({malePct}%) • Nữ: {femaleCount} ({femalePct}%)
						</span>
					</div>
					<Users
						className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
						strokeWidth={1.5}
					/>
				</div>

				{/* KPI 4: Tỷ Lệ DTTS */}
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Dân Tộc Thiểu Số
						</span>
						<div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
							{dttsPercentage}%
						</div>
						<span className="text-[11px] text-slate-400 font-medium mt-0.5">
							{dttsCount} / {totalCitizens} nhân khẩu
						</span>
					</div>
					<Globe
						className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
						strokeWidth={1.5}
					/>
				</div>
			</div>

			{/* Header Panel */}
			<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
						<MapPin className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
						<span>Danh Sách Thôn Xã Đăk Hà</span>
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						Bấm vào thẻ thôn để chuyển nhanh đến bảng thống kê của thôn đó
					</p>
				</div>

				<div className="flex items-center gap-3 w-full sm:w-auto">
					<div className="w-full sm:w-auto flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
						<Search
							className="w-4 h-4 text-slate-400 ml-2 shrink-0"
							strokeWidth={1.5}
						/>
						<input
							type="text"
							placeholder="Tìm kiếm thôn..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full sm:w-56 px-2 py-1.5 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={() => setSearchTerm("")}
								className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1 cursor-pointer"
							>
								<X strokeWidth={1.5} className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{isAdmin && (
						<button
							type="button"
							onClick={() => setIsAdding(true)}
							className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
						>
							<Plus className="w-4 h-4" strokeWidth={1.5} />
							<span>Thêm Thôn</span>
						</button>
					)}
				</div>
			</div>

			{/* Form thêm thôn mới nếu mở */}
			{isAdding && (
				<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-emerald-500 shadow-lg space-y-4 animate-in fade-in">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-bold text-slate-900 dark:text-white">
							Thêm Thôn Mới Vào Xã Đăk Hà
						</h3>
						<button
							onClick={() => setIsAdding(false)}
							className="p-1 text-slate-400 hover:text-slate-600"
						>
							<X strokeWidth={1.5} className="w-4 h-4" />
						</button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-bold text-slate-500 mb-1">
								Tên Thôn *
							</label>
							<input
								type="text"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="Vd: Thôn 6"
								className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
							/>
						</div>
						<div>
							<label className="block text-xs font-bold text-slate-500 mb-1">
								Mã Viết Tắt
							</label>
							<input
								type="text"
								value={newCode}
								onChange={(e) => setNewCode(e.target.value)}
								placeholder="Vd: TH6"
								className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<button
							onClick={() => setIsAdding(false)}
							className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
						>
							Hủy
						</button>
						<button
							onClick={handleCreate}
							className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
						>
							Lưu Thôn Mới
						</button>
					</div>
				</div>
			)}

			{/* Grid Danh Sách Thôn */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{filteredVillages.map((village) => {
					const isEditing = editingId === village.id;
					const vStat =
						villageStats[village.id] ||
						villageStats[village.short_code] ||
						villageStats[village.name] ||
						villageStats[village.name.toLowerCase().trim()] ||
						villageStats[
							normalizeUnaccented(village.name.toLowerCase().trim())
						];

					const householdCount = vStat?.household_count ?? 0;
					const citizenCount = vStat?.citizen_count ?? 0;
					const minorityCount = vStat?.dtts_count ?? 0;

					if (isEditing) {
						return (
							<div
								key={village.id}
								onClick={(e) => e.stopPropagation()}
								className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 flex flex-col justify-between min-h-[160px]"
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
											Đổi tên thôn
										</span>
									</div>
									<input
										autoFocus
										type="text"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleUpdate(village.id);
											if (e.key === "Escape") setEditingId(null);
										}}
										placeholder="Nhập tên thôn mới..."
										className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
									/>
								</div>

								<div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
									<button
										type="button"
										onClick={() => setEditingId(null)}
										className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
									>
										<X strokeWidth={1.5} className="w-3.5 h-3.5" />
										<span>Hủy</span>
									</button>
									<button
										type="button"
										onClick={() => handleUpdate(village.id)}
										disabled={!editName.trim()}
										className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
									>
										<Check strokeWidth={1.5} className="w-3.5 h-3.5" />
										<span>Lưu</span>
									</button>
								</div>
							</div>
						);
					}

					const assignedOfficer =
						userList.find(
							(u) => u.village_id === village.id && u.role === "user",
						) || userList.find((u) => u.village_id === village.id);

					return (
						<div
							key={village.id}
							role="button"
							tabIndex={0}
							aria-label={`Thôn ${village.name}, ${householdCount} hộ gia đình, ${citizenCount} nhân khẩu`}
							onClick={() => handleVillageClick(village.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleVillageClick(village.id);
								}
							}}
							className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 min-h-[160px] flex flex-col justify-between"
						>
							<div>
								<div className="flex items-center justify-between gap-2 mb-3">
									<div className="flex items-center gap-2 min-w-0">
										<MapPin
											className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
											strokeWidth={1.5}
										/>
										<h4 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight truncate">
											{village.name}
										</h4>
									</div>

									{isAdmin && (
										<div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
											<button
												type="button"
												title="Đổi tên thôn"
												onClick={(e) => {
													e.stopPropagation();
													setEditingId(village.id);
													setEditName(village.name);
												}}
												className="p-1 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors cursor-pointer"
											>
												<Edit3 strokeWidth={1.5} className="w-3.5 h-3.5" />
											</button>
											<button
												type="button"
												title="Xóa thôn"
												onClick={(e) => {
													e.stopPropagation();
													handleDelete(village.id, village.name);
												}}
												className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
											>
												<Trash2 strokeWidth={1.5} className="w-3.5 h-3.5" />
											</button>
										</div>
									)}
								</div>

								{/* Cán bộ phụ trách / Trưởng thôn */}
								<div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
									<span className="text-slate-400">•</span>
									<span>Trưởng thôn:</span>
									<span
										className={
											assignedOfficer
												? "font-bold text-slate-700 dark:text-slate-200 truncate"
												: "italic text-slate-400"
										}
									>
										{assignedOfficer?.full_name ||
											assignedOfficer?.username ||
											"Chưa phân công"}
									</span>
								</div>
							</div>

							{/* Thống kê nhanh trong thẻ */}
							<div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-3">
								<div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
									<span>{householdCount} Hộ</span>
								</div>
								<div className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
									{citizenCount} Nhân khẩu
									{minorityCount > 0 && (
										<span className="ml-1 text-amber-600 font-bold">
											({minorityCount} DTTS)
										</span>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
