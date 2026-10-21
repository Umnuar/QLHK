import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { ChucThoModal } from "../components/chuctho/ChucThoModal";
import type { PolicyProfile } from "../types/policy";

const MILESTONES = ["all", "60", "65", "70", "75", "80", "85", "90", "95", "100", ">100"];

export const ChucThoPage: React.FC = () => {
	const { selectedVillageId, user } = useApp();
	const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
	const [search, setSearch] = useState("");
	const [milestone, setMilestone] = useState("all");
	const [modalOpen, setModalOpen] = useState(false);
	const [editingProfile, setEditingProfile] = useState<PolicyProfile | null>(null);

	const loadData = async () => {
		const res = await policyApi.getChuctho({
			search: search || undefined,
			milestone: milestone !== "all" ? milestone : undefined,
			villageId: user?.village_id || selectedVillageId || undefined,
		});
		setProfiles(res?.data || []);
	};

	useEffect(() => {
		loadData();
	}, [search, milestone, selectedVillageId, user?.village_id]);

	const handleToggle = async (profile: PolicyProfile) => {
		await policyApi.toggleReceived("chuctho", profile.id, !profile.received);
		setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, received: !p.received } : p)));
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-xl font-black text-slate-800 dark:text-white">Danh Sách Chúc Thọ</h1>
				<button onClick={() => { setEditingProfile(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
					<Plus className="w-4 h-4" /> Thêm người mừng thọ
				</button>
			</div>
			<div className="relative">
				<Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
				<input type="text" placeholder="Tìm kiếm theo họ tên, CCCD..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm dark:bg-slate-800" />
			</div>
			<div className="flex flex-wrap gap-1.5">
				{MILESTONES.map((m) => (
					<button key={m} onClick={() => setMilestone(m)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${milestone === m ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
						{m === "all" ? "Tất cả" : `${m} tuổi`}
					</button>
				))}
			</div>
			<div className="overflow-x-auto border rounded-2xl dark:border-slate-800">
				<table className="w-full text-sm text-left">
					<thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
						<tr><th className="p-3">Họ và tên</th><th className="p-3">Năm sinh</th><th className="p-3">CCCD</th><th className="p-3">Đã nhận</th><th className="p-3">Thao tác</th></tr>
					</thead>
					<tbody>
						{profiles.map((p) => (
							<tr key={p.id} className="border-t dark:border-slate-800">
								<td className="p-3 font-medium">{p.name}</td>
								<td className="p-3">{p.dob}</td>
								<td className="p-3">{p.cccd}</td>
								<td className="p-3"><input type="checkbox" checked={!!p.received} onChange={() => handleToggle(p)} className="rounded text-emerald-600" /></td>
								<td className="p-3"><button onClick={() => { setEditingProfile(p); setModalOpen(true); }} className="text-emerald-600 hover:underline">Sửa</button></td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<ChucThoModal isOpen={modalOpen} profile={editingProfile} onClose={() => setModalOpen(false)} onSaved={loadData} />
		</div>
	);
};

export default ChucThoPage;
