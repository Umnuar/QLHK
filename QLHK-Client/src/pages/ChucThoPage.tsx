import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { ChucThoFilterBar } from "../components/chuctho/ChucThoFilterBar";
import { ChucThoTable } from "../components/chuctho/ChucThoTable";
import { ChucThoDrawer } from "../components/chuctho/ChucThoDrawer";
import { ChucThoModal } from "../components/chuctho/ChucThoModal";
import { TablePagination } from "../components/common/TablePagination";
import type { PolicyProfile } from "../types/policy";

export const ChucThoPage: React.FC = () => {
	const { selectedVillageId, setSelectedVillageId, villages, user } = useApp();
	const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [search, setSearch] = useState("");
	const [milestone, setMilestone] = useState("all");
	const [received, setReceived] = useState("all");
	const [gender, setGender] = useState("");
	const [calcYear, setCalcYear] = useState(new Date().getFullYear());
	const [modalOpen, setModalOpen] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedProfile, setSelectedProfile] = useState<PolicyProfile | null>(null);
	const [editingProfile, setEditingProfile] = useState<PolicyProfile | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

	const villageMap = useMemo(() => {
		const map: Record<string, string> = {};
		villages.forEach((v) => { map[v.id] = v.name; });
		return map;
	}, [villages]);

	const loadData = useCallback(async () => {
		const res = await policyApi.getChuctho({
			search: search || undefined,
			milestone: milestone !== "all" ? milestone : undefined,
			received: received === "all" ? undefined : received === "received",
			villageId: user?.village_id || selectedVillageId || undefined,
			calculationYear: calcYear,
			page,
			limit,
		});
		setProfiles(res?.data || []);
		setTotal(res?.total || 0);
	}, [search, milestone, received, selectedVillageId, user?.village_id, calcYear, page, limit]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleToggleReceived = async (profile: PolicyProfile) => {
		setUpdatingIds((prev) => ({ ...prev, [profile.id]: true }));
		try {
			await policyApi.toggleReceived("chuctho", profile.id, !profile.received);
			setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, received: !p.received } : p)));
			if (selectedProfile?.id === profile.id) {
				setSelectedProfile((prev) => (prev ? { ...prev, received: !prev.received } : null));
			}
		} finally {
			setUpdatingIds((prev) => ({ ...prev, [profile.id]: false }));
		}
	};

	const handleBulkReceived = async (status: boolean) => {
		for (const id of selectedIds) {
			await policyApi.toggleReceived("chuctho", id, status);
		}
		setSelectedIds([]);
		loadData();
	};

	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
	};

	const handleSelectAll = () => {
		setSelectedIds((prev) => (prev.length === profiles.length ? [] : profiles.map((p) => p.id)));
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex flex-wrap justify-between items-center gap-3">
				<div>
					<h1 className="text-xl font-black text-slate-800 dark:text-white">Danh Sách Chúc Thọ</h1>
					<p className="text-xs text-slate-500 dark:text-slate-400">Quản lý người cao tuổi mừng thọ tại địa phương</p>
				</div>
				<div className="flex items-center gap-2">
					<button onClick={loadData} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300" title="Tải lại">
						<RefreshCw className="w-4 h-4" />
					</button>
					<button onClick={() => { setEditingProfile(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
						<Plus className="w-4 h-4" /> Thêm người mừng thọ
					</button>
				</div>
			</div>

			<ChucThoFilterBar
				search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
				milestone={milestone} onMilestoneChange={(m) => { setMilestone(m); setPage(1); }}
				received={received} onReceivedChange={(r) => { setReceived(r); setPage(1); }}
				gender={gender} onGenderChange={(g) => { setGender(g); setPage(1); }}
				selectedVillageId={selectedVillageId} onVillageChange={(v) => { setSelectedVillageId(v); setPage(1); }}
				villages={villages} showVillageFilter={user?.role === "admin"}
				selectedCount={selectedIds.length} onBulkReceived={handleBulkReceived}
				onDeselectAll={() => setSelectedIds([])}
				calculationYear={calcYear} onYearChange={setCalcYear}
			/>

			<ChucThoTable
				profiles={profiles} selectedIds={selectedIds}
				onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll}
				onToggleReceived={handleToggleReceived}
				onViewDetail={(p) => { setSelectedProfile(p); setDrawerOpen(true); }}
				onEdit={(p) => { setEditingProfile(p); setModalOpen(true); }}
				updatingIds={updatingIds} villageMap={villageMap}
			/>

			{total > limit && (
				<TablePagination
					itemCount={profiles.length}
					total={total}
					page={page}
					limit={limit}
					totalPages={Math.ceil(total / limit)}
					onPageChange={setPage}
					onLimitChange={(l: number) => { setLimit(l); setPage(1); }}
				/>
			)}

			<ChucThoDrawer
				isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
				profile={selectedProfile}
				villageName={selectedProfile?.village_id ? villageMap[selectedProfile.village_id] : undefined}
				onToggleReceived={handleToggleReceived}
			/>

			<ChucThoModal
				isOpen={modalOpen} profile={editingProfile}
				onClose={() => setModalOpen(false)} onSaved={loadData}
				villages={villages} defaultVillageId={selectedVillageId}
			/>
		</div>
	);
};

export default ChucThoPage;
