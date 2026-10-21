import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { HtxhModal } from "../components/htxh/HtxhModal";
import type { PolicyProfile } from "../types/policy";

const CATEGORIES = [
	{ id: "all", label: "Tất cả" },
	{ id: "age75plus", label: "Đủ 75 tuổi trở lên" },
	{ id: "age70to74poor", label: "70-74 nghèo/cận nghèo" },
	{ id: "baoTro", label: "Bảo trợ xã hội" },
	{ id: "huuTri", label: "Hưu trí" },
	{ id: "huuTuatBaoHiem", label: "Hưu, Tuất BH" },
	{ id: "nguoiCoCong", label: "Người có công" },
];

export const HtxhPage: React.FC = () => {
	const { selectedVillageId, user } = useApp();
	const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [modalOpen, setModalOpen] = useState(false);
	const [editingProfile, setEditingProfile] = useState<PolicyProfile | null>(null);

	const loadData = async () => {
		const res = await policyApi.getHtxh({
			search: search || undefined,
			category: category !== "all" ? category : undefined,
			villageId: user?.village_id || selectedVillageId || undefined,
		});
		setProfiles(res?.data || []);
	};

	useEffect(() => {
		loadData();
	}, [search, category, selectedVillageId, user?.village_id]);

	const handleToggle = async (profile: PolicyProfile) => {
		await policyApi.toggleReceived("htxh", profile.id, !profile.received);
		setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, received: !p.received } : p)));
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-xl font-black text-slate-800 dark:text-white">Danh Sách Hỗ Trợ Xã Hội</h1>
				<button onClick={() => { setEditingProfile(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
					<Plus className="w-4 h-4" /> Thêm người nhận hỗ trợ
				</button>
			</div>
			<div className="relative">
				<Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
				<input type="text" placeholder="Tìm kiếm theo họ tên, CCCD..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm dark:bg-slate-800" />
			</div>
			<div className="flex flex-wrap gap-1.5">
				{CATEGORIES.map((c) => (
					<button key={c.id} onClick={() => setCategory(c.id)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${category === c.id ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
						{c.label}
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
			<HtxhModal isOpen={modalOpen} profile={editingProfile} onClose={() => setModalOpen(false)} onSaved={loadData} />
		</div>
	);
};

export default HtxhPage;
