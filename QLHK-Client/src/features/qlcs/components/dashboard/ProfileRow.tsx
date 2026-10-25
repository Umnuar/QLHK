import clsx from "@/utils/clsx";
import {
	Activity,
	CheckCircle2,
	Circle,
	Edit3,
	Eye,
	EyeOff,
	Loader2,
	MessageSquare,
	Trash2,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/AppContext";
import { TABLE_STYLES } from "@/components/common/tableStyles";
import type { HtxhProfile, Profile, TabType } from "@/types";
import { calculateAge } from "@/utils/date";

export type TableProfile = (Profile | HtxhProfile) & Record<string, unknown>;

interface ProfileRowProps {
	profile: TableProfile;
	idx: number;
	activeTab: TabType;
	currentPage: number;
	itemsPerPage: number;
	isSelected: boolean;
	onToggleSelect: (id: string) => void;
	onEdit: (profile: TableProfile) => void;
	onDelete: (profile: TableProfile) => void;
	handleToggleReceived: (id: string, newStatus: boolean) => void;
	openPolicyPopover: string | null;
	setOpenPolicyPopover: (id: string | null) => void;
	isDarkMode: boolean;
	panelClass: string;
	softTextClass: string;
	isFirstOfGroup?: boolean;
}

export const ProfileRow = React.memo(function ProfileRow({
	profile,
	idx,
	activeTab,
	currentPage,
	itemsPerPage,
	isSelected,
	onToggleSelect,
	onEdit,
	onDelete,
	handleToggleReceived,
	openPolicyPopover,
	setOpenPolicyPopover,
	isDarkMode,
	panelClass,
	softTextClass,
	isFirstOfGroup = false,
}: ProfileRowProps) {
	const { villages } = useApp();
	const [showCccd, setShowCccd] = useState(false);
	const [isTogglingGift, setIsTogglingGift] = useState(false);

	const villageName = useMemo(() => {
		const vid = profile.village_id || profile.villageId;
		if (!vid) return null;
		return villages.find((v) => v.id === vid)?.name || null;
	}, [profile.village_id, profile.villageId, villages]);

	const milestone = useMemo(() => {
		const m: string[] = [];
		if (activeTab === "chuctho") {
			if (profile.age60) m.push("60");
			if (profile.age65) m.push("65");
			if (profile.age70) m.push("70");
			if (profile.age75) m.push("75");
			if (profile.age80) m.push("80");
			if (profile.age85) m.push("85");
			if (profile.age90) m.push("90");
			if (profile.age95) m.push("95");
			if (profile.age100) m.push("100");
			if (profile.ageOver100 || profile.age_over_100) m.push(">100");
		}
		return m;
	}, [
		activeTab,
		profile.age60,
		profile.age65,
		profile.age70,
		profile.age75,
		profile.age80,
		profile.age85,
		profile.age90,
		profile.age95,
		profile.age100,
		profile.ageOver100,
		profile.age_over_100,
	]);

	const milestoneText = useMemo(() => {
		if (activeTab === "chuctho") {
			const targetYear =
				Number(profile.calculation_year || profile.calculationYear) ||
				new Date().getFullYear();
			const age = profile.dob ? calculateAge(profile.dob, targetYear) : 0;
			const m = milestone[0];

			if (age >= 100) {
				return age > 100 ? `Trên 100 tuổi (${age} tuổi)` : "Tròn 100 tuổi";
			}
			if (age > 0) {
				const isRound = [60, 65, 70, 75, 80, 85, 90, 95].includes(age);
				if (isRound) {
					return `Tròn ${age} tuổi`;
				}
				if (m) {
					return `${age} tuổi (Mốc ${m})`;
				}
				return `${age} tuổi`;
			}
			if (milestone.length > 0) {
				if (milestone.includes(">100")) return "Trên 100 tuổi";
				return `Tròn ${milestone.join(", ")} tuổi`;
			}
			return "—";
		}
		if (milestone.length > 0) {
			if (milestone.includes(">100") && milestone.length === 1)
				return "Trên 100 tuổi";
			return `Tròn ${milestone.join(", ").replace(">100", "Trên 100")} tuổi`;
		}
		return "—";
	}, [
		activeTab,
		milestone,
		profile.calculation_year,
		profile.calculationYear,
		profile.dob,
	]);

	const maskCccd = (cccdStr?: string | number | null) => {
		if (!cccdStr) return "—";
		const clean = String(cccdStr).trim();
		if (!clean || clean === "—" || clean === "0" || clean.includes(":")) return "—";
		if (clean.length <= 4) return clean;
		return `••••${clean.slice(-4)}`;
	};

	const classificationLabel = useMemo(() => {
		if (activeTab === "chuctho") {
			return milestoneText !== "—" ? milestoneText : "Chúc thọ";
		}
		if (profile.age75plus) return "Đủ 75 tuổi+";
		if (profile.age70to74poor) return "70-74 nghèo";
		if (profile.baoTro || profile.bao_tro) return "Bảo trợ XH";
		if (profile.huuTri || profile.huu_tri) return "Hưu trí";
		if (profile.huuTuatBaoHiem || profile.huu_tuat_bao_hiem) return "Hưu, Tuất";
		if (profile.nguoiCoCong || profile.nguoi_co_cong) return "Người có công";
		return "HTXH";
	}, [activeTab, milestoneText, profile]);

	const handleGiftToggle = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isTogglingGift) return;

		setIsTogglingGift(true);
		try {
			await Promise.resolve(
				handleToggleReceived(String(profile.id), !profile.received),
			);
		} finally {
			setIsTogglingGift(false);
		}
	};

	const rowBgClass = isSelected
		? TABLE_STYLES.rowSelected
		: TABLE_STYLES.rowBase;

	const stickyBgClass = isSelected
		? TABLE_STYLES.stickyBgSelected
		: TABLE_STYLES.stickyBgBase;

	const hasValidCccd =
		Boolean(profile.cccd) &&
		String(profile.cccd).trim() !== "" &&
		String(profile.cccd).trim() !== "—" &&
		String(profile.cccd).trim() !== "0" &&
		!String(profile.cccd).includes(":");

	return (
		<tr
			onClick={() => {
				if (activeTab !== "chuctho") {
					onEdit(profile);
				}
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (activeTab !== "chuctho") {
						onEdit(profile);
					}
				}
			}}
			tabIndex={activeTab === "chuctho" ? -1 : 0}
			className={clsx(
				"group transition-colors text-[13px] outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500",
				activeTab !== "chuctho" ? "cursor-pointer" : "cursor-default",
				isFirstOfGroup &&
					"border-t-2 border-emerald-500/30 dark:border-emerald-500/50",
				rowBgClass,
			)}
			title={activeTab === "chuctho" ? undefined : "Bấm để xem và chỉnh sửa thông tin chi tiết hồ sơ"}
		>

			<td
				onClick={(e) => e.stopPropagation()}
				className={clsx(
					TABLE_STYLES.stickyLeftCheckbox,
					"border-l-[3px] border-l-transparent",
					stickyBgClass,
				)}
			>
				<input
					type="checkbox"
					checked={isSelected}
					onChange={() => onToggleSelect(String(profile.id))}
					className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
					title="Chọn hồ sơ này"
				/>
			</td>

			<td
				className={clsx(
					TABLE_STYLES.stickyLeftStt,
					stickyBgClass,
				)}
			>
				{(currentPage - 1) * itemsPerPage + idx + 1}
			</td>

			<td
				className={clsx(
					TABLE_STYLES.stickyLeftName,
					stickyBgClass,
				)}
			>
				<div className="flex flex-col justify-center py-0.5">
					<div className="flex items-center gap-2">
						<span className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate">
							{profile.name}
						</span>

						{profile.notes && (
							<div
								title={profile.notes}
								className="text-amber-500 dark:text-amber-400 cursor-help shrink-0"
							>
								<MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
							</div>
						)}
					</div>
				</div>
			</td>

			<td className="w-28 py-3 px-2 text-center border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
				<span
					className={clsx(
						"inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border truncate max-w-[110px]",
						activeTab === "chuctho"
							? "bg-slate-100 text-slate-700 border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
							: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800",
					)}
					title={classificationLabel}
				>
					{classificationLabel}
				</span>
			</td>

			<td className="w-16 py-3 px-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
				{profile.gender || "—"}
			</td>

			<td className="w-24 py-3 px-2 text-center tabular-nums text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
				{profile.dob || "—"}
			</td>

			<td className="w-32 py-3 px-2 text-center border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
				{hasValidCccd ? (
					<div className="inline-flex items-center justify-center gap-1.5 tabular-nums text-xs text-slate-700 dark:text-slate-300">
						<span>{showCccd ? String(profile.cccd) : maskCccd(profile.cccd)}</span>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setShowCccd(!showCccd);
							}}
							title={showCccd ? "Ẩn số CCCD" : "Xem đầy đủ số CCCD"}
							aria-label={showCccd ? "Ẩn số CCCD" : "Xem đầy đủ số CCCD"}
							className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
						>
							{showCccd ? (
								<EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />
							) : (
								<Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
							)}
						</button>
					</div>
				) : (
					<span className="tabular-nums text-xs font-normal text-slate-400 dark:text-slate-500">
						—
					</span>
				)}
			</td>

			<td className="py-2.5 px-3 text-left border-b border-slate-100 dark:border-slate-800/80 align-middle">
				<div className="flex items-start gap-1.5">
					{villageName ? (
						<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50/70 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70 shrink-0 mt-0.5">
							{villageName}
						</span>
					) : null}
					<span
						className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed break-words"
						title={String(
							profile.residence ||
								profile.currentAddress ||
								profile.current_address ||
								"—",
						)}
					>
						{String(
							profile.residence ||
								profile.currentAddress ||
								profile.current_address ||
								"—",
						)}
					</span>
				</div>
			</td>

			{activeTab === "chuctho" ? (
				<td className="w-28 py-3 px-2 text-center text-xs text-slate-700 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
					{milestoneText}
				</td>
			) : (
				<>
					<td className="py-3 px-2 text-center border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
						{profile.age75plus ? (
							<span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold">
								CÓ
							</span>
						) : (
							<span className="text-slate-300 dark:text-slate-600">-</span>
						)}
					</td>
					<td className="py-3 px-2 text-center border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
						{profile.age70to74poor ? (
							<span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold">
								CÓ
							</span>
						) : (
							<span className="text-slate-300 dark:text-slate-600">-</span>
						)}
					</td>
					<td className="py-3 px-3 text-center relative border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
						{(() => {
							const policies = [];
							if (profile.baoTro || profile.bao_tro)
								policies.push("Bảo trợ xã hội");
							if (profile.huuTri || profile.huu_tri) policies.push("Hưu trí");
							if (profile.huuTuatBaoHiem || profile.huu_tuat_bao_hiem)
								policies.push("Hưu, Tuất Bảo hiểm");
							if (profile.nguoiCoCong || profile.nguoi_co_cong)
								policies.push("Người có công");

							if (policies.length === 0) {
								return (
									<span className="text-slate-300 dark:text-slate-600">-</span>
								);
							}

							return (
								<>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setOpenPolicyPopover(
												openPolicyPopover === String(profile.id)
													? null
													: String(profile.id),
											);
										}}
										className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition-colors shadow-xs inline-flex items-center cursor-pointer whitespace-nowrap"
									>
										{policies.length} CHÍNH SÁCH
									</button>

									{openPolicyPopover === String(profile.id) &&
										createPortal(
											<div
												role="dialog"
												aria-modal="true"
												tabIndex={-1}
												onKeyDown={(e) => {
													if (e.key === "Escape") setOpenPolicyPopover(null);
												}}
												className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,23,42,0.45)] dark:bg-[rgba(0,0,0,0.6)] animate-in fade-in"
											>
												<button
													type="button"
													aria-label="Đóng popover chính sách"
													className="fixed inset-0 w-full h-full cursor-default bg-transparent -z-10"
													onClick={() => setOpenPolicyPopover(null)}
												/>
												<div
													className={clsx(
														"rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border relative z-10",
														panelClass,
													)}
												>
													<div
														className={clsx(
															"px-6 py-4 border-b flex justify-between items-center",
															isDarkMode
																? "border-slate-800 bg-slate-800/30"
																: "border-slate-100 bg-slate-50",
														)}
													>
														<div className="flex items-center gap-2.5">
															<div className="bg-blue-100 dark:bg-blue-950/80 p-2 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
																<Activity
																	className="w-4 h-4"
																	strokeWidth={1.5}
																/>
															</div>
															<div>
																<h4 className="text-sm font-black tracking-tight uppercase">
																	CHI TIẾT CHÍNH SÁCH
																</h4>
																<p
																	className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${softTextClass}`}
																>
																	{profile.name}
																</p>
															</div>
														</div>
														<button
															type="button"
															onClick={() => setOpenPolicyPopover(null)}
															className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
														>
															<X className="w-4 h-4" strokeWidth={1.5} />
														</button>
													</div>
													<div className="p-5 space-y-2">
														{policies.map((pName) => (
															<div
																key={pName}
																className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2"
															>
																<CheckCircle2
																	className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
																	strokeWidth={1.5}
																/>
																<span>{pName}</span>
															</div>
														))}
													</div>
												</div>
											</div>,
											document.body,
										)}
								</>
							);
						})()}
					</td>
				</>
			)}

			<td className="w-28 py-1 px-2 text-center border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
				<button
					type="button"
					disabled={isTogglingGift}
					onClick={handleGiftToggle}
					aria-label={profile.received ? "Đã nhận quà" : "Chưa nhận quà"}
					aria-live="polite"
					title={
						isTogglingGift
							? "Đang cập nhật..."
							: profile.received
								? profile.received_at || profile.receivedDate
									? `Đã nhận ngày ${profile.received_at || profile.receivedDate}`
									: "Đã nhận quà"
								: "Chưa nhận quà"
					}
					className={clsx(
						"inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95",
						isTogglingGift && "opacity-60 cursor-not-allowed",
						profile.received
							? "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 dark:hover:bg-emerald-900/60 dark:hover:text-emerald-200 dark:hover:border-emerald-700"
							: "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200",
					)}
				>
					{isTogglingGift ? (
						<>
							<Loader2
								className="w-3.5 h-3.5 animate-spin text-slate-400"
								strokeWidth={2}
							/>
							<span>Đang lưu...</span>
						</>
					) : profile.received ? (
						<>
							<CheckCircle2
								className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
								strokeWidth={2}
							/>
							<span>Đã nhận</span>
						</>
					) : (
						<>
							<Circle
								className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"
								strokeWidth={1.75}
							/>
							<span>Chưa nhận</span>
						</>
					)}
				</button>
			</td>

			<td
				onClick={(e) => e.stopPropagation()}
				className={clsx(
					TABLE_STYLES.stickyRightAction,
					stickyBgClass,
				)}
			>
				<div className="flex items-center justify-center gap-1">
					{activeTab !== "chuctho" && (
						<button
							type="button"
							onClick={() => onEdit(profile)}
							aria-label={`Sửa hồ sơ ${profile.name}`}
							title="Xem & sửa thông tin hồ sơ"
							className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors cursor-pointer select-none"
						>
							<Edit3 strokeWidth={1.75} className="w-4 h-4" />
						</button>
					)}
					{activeTab !== "chuctho" && activeTab !== "htxh" && (
						<button
							type="button"
							onClick={() => onDelete(profile)}
							aria-label={`Xóa hồ sơ ${profile.name}`}
							title="Chuyển vào Thùng rác"
							className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-300 transition-colors cursor-pointer select-none"
						>
							<Trash2 strokeWidth={1.75} className="w-4 h-4" />
						</button>
					)}
				</div>
			</td>
		</tr>
	);
});

export default ProfileRow;
