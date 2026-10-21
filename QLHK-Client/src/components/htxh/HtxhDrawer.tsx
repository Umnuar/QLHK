import React from "react";
import { X, CheckCircle2, Clock, MapPin, User, Calendar, CreditCard, Shield, HeartHandshake } from "lucide-react";
import type { PolicyProfile } from "../../types/policy";

export interface HtxhDrawerProps {
	isOpen: boolean; onClose: () => void;
	profile: PolicyProfile | null; villageName?: string;
	onToggleReceived?: (profile: PolicyProfile) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
	age75plus: "Đủ 75 tuổi trở lên",
	age70to74poor: "Từ 70-74 tuổi hộ nghèo/cận nghèo",
	baoTro: "Đang hưởng Bảo trợ xã hội",
	huuTri: "Đang hưởng Hưu trí",
	huuTuatBaoHiem: "Đang hưởng Hưu, Tuất Bảo hiểm",
	nguoiCoCong: "Đang hưởng Người có công",
};

export const HtxhDrawer: React.FC<HtxhDrawerProps> = ({
	isOpen, onClose, profile, villageName, onToggleReceived,
}) => {
	if (!isOpen || !profile) return null;

	const activeCategories = Object.entries(CATEGORY_NAMES)
		.filter(([key]) => !!profile[key] || profile.category === key)
		.map(([, label]) => label);

	return (
		<div className="fixed inset-0 z-50 overflow-hidden">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
				<div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
					<div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{profile.name}</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400">Hồ sơ đối tượng hỗ trợ xã hội</p>
						</div>
						<button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
						<div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
							<div className="flex justify-between items-center text-xs">
								<span className="text-slate-500">Trạng thái nhận quà:</span>
								{profile.received ? (
									<span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Đã nhận</span>
								) : (
									<span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Clock className="w-3.5 h-3.5" /> Chưa nhận</span>
								)}
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
								<Calendar className="w-4 h-4 text-slate-400 shrink-0" />
								<div><div className="text-xs text-slate-400">Năm/Ngày sinh</div><div>{profile.dob || "---"}</div></div>
							</div>
							<div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
								<User className="w-4 h-4 text-slate-400 shrink-0" />
								<div><div className="text-xs text-slate-400">Giới tính</div><div>{profile.gender || "---"}</div></div>
							</div>
							<div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
								<CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
								<div><div className="text-xs text-slate-400">Số CCCD</div><div className="font-mono">{profile.cccd || "---"}</div></div>
							</div>
							<div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
								<Shield className="w-4 h-4 text-slate-400 shrink-0" />
								<div><div className="text-xs text-slate-400">Dân tộc</div><div>{profile.ethnicity || "Kinh"}</div></div>
							</div>
							<div className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
								<MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
								<div>
									<div className="text-xs text-slate-400">Thôn / Thường trú</div>
									<div>{profile.village_name || villageName || "---"}</div>
									<div className="text-xs text-slate-500">{profile.residence || profile.currentAddress || ""}</div>
								</div>
							</div>
							<div className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
								<HeartHandshake className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
								<div>
									<div className="text-xs text-slate-400 mb-1">Diện bảo trợ xã hội</div>
									<div className="flex flex-wrap gap-1">
										{activeCategories.length > 0 ? (
											activeCategories.map((c) => (
												<span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
													{c}
												</span>
											))
										) : (
											<span className="text-xs text-slate-500">Chưa xác định diện trợ cấp</span>
										)}
									</div>
								</div>
							</div>
						</div>

						{profile.notes && (
							<div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
								<span className="font-semibold text-slate-400 block mb-1">Ghi chú:</span> {profile.notes}
							</div>
						)}
					</div>

					<div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
						{onToggleReceived && (
							<button onClick={() => onToggleReceived(profile)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${profile.received ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60" : "bg-emerald-600 text-white"}`}>
								{profile.received ? "Đánh dấu chưa nhận" : "Đánh dấu đã nhận quà"}
							</button>
						)}
						<button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Đóng</button>
					</div>
				</div>
			</div>
		</div>
	);
};
