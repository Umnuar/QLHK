import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { HtxhFilterBar } from "../components/htxh/HtxhFilterBar";
import { HtxhTable } from "../components/htxh/HtxhTable";
import { HtxhDrawer } from "../components/htxh/HtxhDrawer";
import { HtxhModal } from "../components/htxh/HtxhModal";
import { TablePagination } from "../components/common/TablePagination";
import type { PolicyProfile } from "../types/policy";

export const HtxhPage: React.FC = () => {
	const { selectedVillageId, setSelectedVillageId, villages, user } = useApp();
	const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
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
		const res = await policyApi.getHtxh({
			search: search || undefined,
			category: category !== "all" ? category : undefined,
			received: received === "all" ? undefined : received === "received",
			villageId: user?.village_id || selectedVillageId || undefined,
			calculationYear: calcYear,
			page,
			limit,
		});
		setProfiles(res?.data || []);
		setTotal(res?.total || 0);
	}, [search, category, received, selectedVillageId, user?.village_id, calcYear, page, limit]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleToggleReceived = async (profile: PolicyProfile) => {
		setUpdatingIds((prev) => ({ ...prev, [profile.id]: true }));
		try {
			await policyApi.toggleReceived("htxh", profile.id, !profile.received);
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
			await policyApi.toggleReceived("htxh", id, status);
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
					<h1 className="text-xl font-black text-slate-800 dark:text-white">Danh Sách Hỗ Trợ Xã Hội</h1>
					<p className="text-xs text-slate-500 dark:text-slate-400">Quản lý các diện trợ cấp, bảo trợ xã hội và người có công</p>
				</div>
				<div className="flex items-center gap-2">
					<button onClick={loadData} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300" title="Tải lại">
						<RefreshCw className="w-4 h-4" />
					</button>
					<button onClick={() => { setEditingProfile(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
						<Plus className="w-4 h-4" /> Thêm người nhận hỗ trợ
					</button>
				</div>
			</div>

			<HtxhFilterBar
				search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
				category={category} onCategoryChange={(c) => { setCategory(c); setPage(1); }}
				received={received} onReceivedChange={(r) => { setReceived(r); setPage(1); }}
				gender={gender} onGenderChange={(g) => { setGender(g); setPage(1); }}
				selectedVillageId={selectedVillageId} onVillageChange={(v) => { setSelectedVillageId(v); setPage(1); }}
				villages={villages} showVillageFilter={user?.role === "admin"}
				selectedCount={selectedIds.length} onBulkReceived={handleBulkReceived}
				onDeselectAll={() => setSelectedIds([])}
				calculationYear={calcYear} onYearChange={setCalcYear}
			/>

			<HtxhTable
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

			<HtxhDrawer
				isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
				profile={selectedProfile}
				villageName={selectedProfile?.village_id ? villageMap[selectedProfile.village_id] : undefined}
				onToggleReceived={handleToggleReceived}
			/>

			<HtxhModal
				isOpen={modalOpen} profile={editingProfile}
				onClose={() => setModalOpen(false)} onSaved={loadData}
				villages={villages} defaultVillageId={selectedVillageId}
			/>
		</div>
	);
};

export default HtxhPage;
