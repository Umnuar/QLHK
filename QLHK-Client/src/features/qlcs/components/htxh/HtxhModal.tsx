import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PolicyProfile } from "@/types/policy";
import type { Village } from "@/types";

export interface HtxhModalProps {
	isOpen: boolean; onClose: () => void;
	profile?: PolicyProfile | null; onSaved: () => void;
	villages?: Village[]; defaultVillageId?: string;
}

const ETHNICITIES = ["Kinh", "Xơ Đăng", "Gia Rai", "Giẻ Triêng", "Ba Na", "H Rê", "Hoa", "Khác"];
const CATEGORY_FIELDS = [
	{ key: "age75plus", label: "Từ 75 tuổi trở lên" }, { key: "age70to74poor", label: "70-74 tuổi hộ nghèo/cận nghèo" },
	{ key: "baoTro", label: "Đang hưởng Bảo trợ xã hội" }, { key: "huuTri", label: "Đang hưởng Hưu trí" },
	{ key: "huuTuatBaoHiem", label: "Hưu tuất / Bảo hiểm" }, { key: "nguoiCoCong", label: "Người có công" },
] as const;

export const HtxhModal: React.FC<HtxhModalProps> = ({
	isOpen, onClose, profile, onSaved, villages = [], defaultVillageId = "",
}) => {
	const [formData, setFormData] = useState({
		name: "", dob: "", gender: "Nam", cccd: "", ethnicity: "Kinh",
		village_id: defaultVillageId, residence: "", currentAddress: "",
		age75plus: false, age70to74poor: false, baoTro: false,
		huuTri: false, huuTuatBaoHiem: false, nguoiCoCong: false, received: false, notes: "",
	});

	useEffect(() => {
		if (profile) {
			setFormData({
				name: profile.name || "", dob: profile.dob || "", gender: profile.gender || "Nam",
				cccd: profile.cccd || "", ethnicity: profile.ethnicity || "Kinh",
				village_id: profile.village_id || defaultVillageId,
				residence: profile.residence || "", currentAddress: profile.currentAddress || "",
				age75plus: !!profile.age75plus, age70to74poor: !!profile.age70to74poor,
				baoTro: !!profile.baoTro, huuTri: !!profile.huuTri,
				huuTuatBaoHiem: !!profile.huuTuatBaoHiem, nguoiCoCong: !!profile.nguoiCoCong,
				received: !!profile.received, notes: profile.notes || "",
			});
		} else {
			setFormData({
				name: "", dob: "", gender: "Nam", cccd: "", ethnicity: "Kinh",
				village_id: defaultVillageId, residence: "", currentAddress: "",
				age75plus: false, age70to74poor: false, baoTro: false,
				huuTri: false, huuTuatBaoHiem: false, nguoiCoCong: false, received: false, notes: "",
			});
		}
	}, [profile, isOpen, defaultVillageId]);

	if (!isOpen) return null;
	const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSaved(); onClose(); };

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
			<div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-base font-bold text-slate-800 dark:text-white">{profile ? "Chỉnh sửa hồ sơ Hỗ Trợ Xã Hội" : "Thêm đối tượng hỗ trợ mới"}</h3>
					<button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"><X className="w-5 h-5" /></button>
				</div>
				<form onSubmit={handleSubmit} className="space-y-3 text-sm">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Họ và tên *</label><input type="text" required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" placeholder="Nguyễn Thị B" /></div>
						<div className="grid grid-cols-2 gap-2">
							<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Năm sinh *</label><input type="text" required value={formData.dob} onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" placeholder="1945" /></div>
							<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Giới tính</label><select value={formData.gender} onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm"><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Số CCCD</label><input type="text" value={formData.cccd} onChange={(e) => setFormData((p) => ({ ...p, cccd: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm font-mono" placeholder="12 chữ số" /></div>
						<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dân tộc</label><select value={formData.ethnicity} onChange={(e) => setFormData((p) => ({ ...p, ethnicity: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm">{ETHNICITIES.map((eth) => <option key={eth} value={eth}>{eth}</option>)}</select></div>
					</div>
					{villages.length > 0 && <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Thôn/Xóm</label><select value={formData.village_id} onChange={(e) => setFormData((p) => ({ ...p, village_id: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm"><option value="">Chọn thôn/xóm</option>{villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nơi thường trú</label><input type="text" value={formData.residence} onChange={(e) => setFormData((p) => ({ ...p, residence: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" placeholder="Thôn 2, Xã Đăk Hà" /></div>
						<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nơi ở hiện nay</label><input type="text" value={formData.currentAddress} onChange={(e) => setFormData((p) => ({ ...p, currentAddress: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" placeholder="Thôn 2, Xã Đăk Hà" /></div>
					</div>
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Diện bảo trợ xã hội đang hưởng</label>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
							{CATEGORY_FIELDS.map(({ key, label }) => (
								<label key={key} className="flex items-center gap-2 cursor-pointer text-xs">
									<input type="checkbox" checked={!!formData[key as keyof typeof formData]} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.checked }))} className="rounded text-emerald-600 focus:ring-emerald-500" />
									<span className="text-slate-700 dark:text-slate-300">{label}</span>
								</label>
							))}
						</div>
					</div>
					<div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ghi chú</label><input type="text" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" placeholder="Ghi chú thêm..." /></div>
					<label className="flex items-center gap-2 cursor-pointer pt-1">
						<input type="checkbox" checked={formData.received} onChange={(e) => setFormData((p) => ({ ...p, received: e.target.checked }))} className="rounded text-emerald-600 focus:ring-emerald-500" />
						<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đã trao nhận quà trợ cấp</span>
					</label>
					<div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
						<button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">Hủy</button>
						<button type="submit" className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer">Lưu thông tin</button>
					</div>
				</form>
			</div>
		</div>
	);
};
