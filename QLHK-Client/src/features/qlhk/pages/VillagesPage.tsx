import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/AppContext";
import {
	type AnalyticsOverviewData,
	analyticsApi,
	type VillageAnalyticsRow,
} from "@/api/analyticsApi";
import { authApi } from "@/api/authApi";
import { villageApi } from "@/api/villageApi";
import { getCache, setCache } from "@/db/indexedDB";
import { useModal } from "@/hooks/useModal";
import { ModernVillageTable } from "@/features/qlhk/components/villages";
import type { User } from "@/types";
import { normalizeUnaccented } from "@/utils/vietnamese";

let cachedStatsTime = 0;
let cachedUsersTime = 0;

export const VillagesPage: React.FC = () => {
	const {
		villages,
		setVillages,
		removeVillage,
		setSelectedVillageId,
		setActiveTab,
		user,
		refreshVillages,
	} = useApp();
	const { showModal } = useModal();
	const isAdmin = user?.role === "admin";

	const visibleVillages = isAdmin
		? villages
		: villages.filter((v) => v.id === user?.village_id);

	const [userList, setUserList] = useState<User[]>([]);
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

	const handleDelete = (id: string, name: string) => {
		if (!isAdmin) return;

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
				await removeVillage(id);
				setVillages((prev) => prev.filter((v) => v.id !== id && v.name !== name));

				try {
					await villageApi.delete(id);
				} catch (err: any) {
					if (err.response?.status === 404) {
						console.warn(
							`[VillagesPage] Thôn "${name}" (${id}) không tồn tại trên CSDL, đã dọn sạch khỏi giao diện.`,
						);
					} else {
						console.error("Lỗi xóa thôn:", err);
						await refreshVillages(true);
						await fetchVillageStats(true);
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
						return;
					}
				}

				cachedStatsTime = 0;
				await refreshVillages(true);
				await fetchVillageStats(true);
				setTimeout(() => {
					showModal({
						title: "Thành công",
						message: `Đã xóa thôn "${name}" thành công`,
						type: "success",
					});
				}, 250);
			},
		});
	};

	const handleCreateModern = async (name: string, code?: string, officerId?: string) => {
		if (!isAdmin) return;
		const created = await villageApi.create(name, code);
		if (officerId) {
			try {
				await authApi.updateUser(officerId, { village_id: created.id });
				await fetchUsers(true);
			} catch (uErr) {
				console.warn("Lỗi phân công cán bộ:", uErr);
			}
		}
		cachedStatsTime = 0;
		await refreshVillages(true);
		await fetchVillageStats(true);
		showModal({
			title: "Thành công",
			message: `Đã thêm thôn "${name}" thành công`,
			type: "success",
		});
	};

	const handleUpdateModern = async (id: string, name: string, code?: string, officerId?: string) => {
		if (!isAdmin) return;
		await villageApi.update(id, name, code);
		if (officerId !== undefined) {
			const currentOfficer = userList.find((u) => u.village_id === id);
			if (currentOfficer && currentOfficer.id !== officerId) {
				try {
					await authApi.updateUser(currentOfficer.id, { village_id: null });
				} catch {}
			}
			if (officerId) {
				try {
					await authApi.updateUser(officerId, { village_id: id });
				} catch (uErr) {
					console.warn("Lỗi phân công cán bộ:", uErr);
				}
			}
			await fetchUsers(true);
		}
		cachedStatsTime = 0;
		await refreshVillages(true);
		await fetchVillageStats(true);
		showModal({
			title: "Thành công",
			message: "Cập nhật thông tin thôn thành công",
			type: "success",
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			<ModernVillageTable
				villages={visibleVillages}
				villageStats={villageStats}
				overview={overview}
				userList={userList}
				isAdmin={isAdmin}
				onSelectVillage={(id, dest) => {
					if (!isAdmin && user?.village_id && id && id !== user.village_id) {
						return;
					}
					setSelectedVillageId(id);
					setActiveTab(dest);
				}}
				onCreateVillage={handleCreateModern}
				onUpdateVillage={handleUpdateModern}
				onDeleteVillage={handleDelete}
				onRefresh={async () => {
					cachedStatsTime = 0;
					cachedUsersTime = 0;
					await refreshVillages(true);
					await fetchVillageStats(true);
					await fetchUsers(true);
				}}
			/>
		</div>
	);
};
