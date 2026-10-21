import React, { useState } from "react";
import { Eye, EyeOff, Edit2, Trash2, Loader2 } from "lucide-react";
import type { PolicyProfile } from "@/types/policy";

export interface ChucThoTableProps {
	profiles: PolicyProfile[]; selectedIds: string[];
	onToggleSelect: (id: string) => void; onSelectAll: () => void;
	onToggleReceived: (profile: PolicyProfile) => Promise<void> | void;
	onViewDetail: (profile: PolicyProfile) => void; onEdit: (profile: PolicyProfile) => void;
	onDelete?: (id: string) => void; updatingIds?: Record<string, boolean>;
	villageMap?: Record<string, string>;
}

const getMilestoneBadge = (profile: PolicyProfile) => {
	const m = profile.milestone || "";
	const color = m.includes("100") ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200"
		: m === "90" || m === "95" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200"
		: m === "80" || m === "85" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200"
		: m === "70" || m === "75" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200"
		: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200";
	return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>{m ? `${m} tuổi` : "Chúc thọ"}</span>;
};

export const ChucThoTable: React.FC<ChucThoTableProps> = ({
	profiles, selectedIds, onToggleSelect, onSelectAll, onToggleReceived,
	onViewDetail, onEdit, onDelete, updatingIds = {}, villageMap = {},
}) => {
	const [visibleCccd, setVisibleCccd] = useState<Record<string, boolean>>({});
	const toggleCccd = (id: string) => setVisibleCccd((p) => ({ ...p, [id]: !p[id] }));
	const allSelected = profiles.length > 0 && selectedIds.length === profiles.length;

	return (
		<div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
			<table className="w-full text-sm text-left">
				<thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
					<tr>
						<th className="p-3 w-10 text-center"><input type="checkbox" checked={allSelected} onChange={onSelectAll} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
						<th className="p-3 w-12 text-center">STT</th>
						<th className="p-3">Họ và tên</th>
						<th className="p-3">Ngày/Năm sinh</th>
						<th className="p-3">Giới tính</th>
						<th className="p-3">CCCD</th>
						<th className="p-3">Thôn/Xóm</th>
						<th className="p-3">Mốc tuổi</th>
						<th className="p-3 text-center">Đã nhận quà</th>
						<th className="p-3 text-right">Thao tác</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
					{profiles.length === 0 ? (
						<tr><td colSpan={10} className="p-8 text-center text-slate-400">Không có dữ liệu người mừng thọ nào.</td></tr>
					) : (
						profiles.map((p, idx) => {
							const isSelected = selectedIds.includes(p.id);
							const cccdVisible = !!visibleCccd[p.id];
							const maskedCccd = p.cccd ? (cccdVisible ? p.cccd : p.cccd.length > 6 ? `${p.cccd.slice(0, 3)}******${p.cccd.slice(-3)}` : "******") : "---";
							return (
								<tr key={p.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}>
									<td className="p-3 text-center"><input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(p.id)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
									<td className="p-3 text-center text-slate-400 text-xs">{p.stt ?? idx + 1}</td>
									<td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
										<button onClick={() => onViewDetail(p)} className="text-left hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">{p.name}</button>
									</td>
									<td className="p-3 text-slate-600 dark:text-slate-300">{p.dob || "---"}</td>
									<td className="p-3 text-slate-600 dark:text-slate-300">{p.gender || "---"}</td>
									<td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
										<div className="flex items-center gap-1.5">
											<span>{maskedCccd}</span>
											{p.cccd && (
												<button type="button" onClick={() => toggleCccd(p.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
													{cccdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
												</button>
											)}
										</div>
									</td>
									<td className="p-3 text-slate-600 dark:text-slate-300 text-xs">{p.village_name || (p.village_id ? villageMap[p.village_id] : "") || "---"}</td>
									<td className="p-3">{getMilestoneBadge(p)}</td>
									<td className="p-3 text-center">
										{updatingIds[p.id] ? (
											<Loader2 className="w-4 h-4 text-emerald-600 animate-spin mx-auto" />
										) : (
											<input type="checkbox" checked={!!p.received} onChange={() => onToggleReceived(p)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
										)}
									</td>
									<td className="p-3 text-right">
										<div className="flex items-center justify-end gap-1">
											<button onClick={() => onEdit(p)} className="p-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Chỉnh sửa"><Edit2 className="w-4 h-4" /></button>
											{onDelete && <button onClick={() => onDelete(p.id)} className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Xóa"><Trash2 className="w-4 h-4" /></button>}
										</div>
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
};
