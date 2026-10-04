import {
	AlertCircle,
	Edit3,
	Eye,
	EyeOff,
	Home,
	Plus,
	Save,
	Trash2,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../AppContext";
import { VILLAGES } from "../../data/constants";
import type { Household, Person, RelationshipType } from "../../types";
import { CustomSelect } from "../common/CustomSelect";
import { CitizenModal } from "./CitizenModal";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface HouseholdDrawerProps {
	isOpen: boolean;
	household?: Household | null;
	onClose: () => void;
	onSave: (householdData: Partial<Household>) => Promise<void> | void;
}

export const HouseholdDrawer: React.FC<HouseholdDrawerProps> = ({
	isOpen,
	household,
	onClose,
	onSave,
}) => {
	const { villages, selectedVillageId, user } = useApp();
	const availableVillages =
		villages && villages.length > 0 ? villages : VILLAGES;

	const [villageId, setVillageId] = useState("");
	const [status, setStatus] = useState("Thường trú");
	const [address, setAddress] = useState("");
	const [notes, setNotes] = useState("");
	const [members, setMembers] = useState<Person[]>([]);

	// State Sub-modal Citizen
	const [isCitizenModalOpen, setIsCitizenModalOpen] = useState(false);
	const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(
		null,
	);
	const [revealedCccdIds, setRevealedCccdIds] = useState<string[]>([]);

	const toggleRevealCccd = (id: string) => {
		setRevealedCccdIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [initialSnapshot, setInitialSnapshot] = useState<string>("");
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

	useEffect(() => {
		if (isOpen) {
			let initVillageId = "";
			if (user?.role === "user" && user.village_id) {
				initVillageId = user.village_id;
			} else if (household) {
				initVillageId =
					household.village_id ||
					selectedVillageId ||
					availableVillages[0]?.id ||
					"";
			} else {
				initVillageId = selectedVillageId || availableVillages[0]?.id || "";
			}
			setVillageId(initVillageId);

			const initStatus = household?.status || "Thường trú";
			const initAddress = household ? household.address || "" : "Xã Đăk Hà";
			const initNotes = household?.notes || "";
			const initMembers = household?.members ? [...household.members] : [];

			setStatus(initStatus);
			setAddress(initAddress);
			setNotes(initNotes);
			setMembers(initMembers);

			setInitialSnapshot(
				JSON.stringify({
					villageId: initVillageId,
					status: initStatus,
					address: initAddress,
					notes: initNotes,
					membersCount: initMembers.length,
					members: initMembers.map((m) => ({
						full_name: m.full_name,
						relationship: m.relationship,
						gender: m.gender,
						dob: m.dob,
						cccd: m.cccd,
					})),
				}),
			);
			setShowDiscardConfirm(false);
			setIsCitizenModalOpen(false);
			setEditingMemberIndex(null);
			setRevealedCccdIds([]);
			setError(null);
		}
	}, [isOpen, household, selectedVillageId, availableVillages, user]);

	const isDirty =
		Boolean(initialSnapshot) &&
		initialSnapshot !==
			JSON.stringify({
				villageId,
				status,
				address,
				notes,
				membersCount: members.length,
				members: members.map((m) => ({
					full_name: m.full_name,
					relationship: m.relationship,
					gender: m.gender,
					dob: m.dob,
					cccd: m.cccd,
				})),
			});

	const handleRequestClose = () => {
		if (isDirty) {
			setShowDiscardConfirm(true);
		} else {
			onClose();
		}
	};

	const drawerRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen && !isCitizenModalOpen && !showDiscardConfirm,
		onEscape: () => {
			if (showDiscardConfirm) {
				setShowDiscardConfirm(false);
			} else {
				handleRequestClose();
			}
		},
	});

	if (!isOpen || typeof document === "undefined") return null;

	const currentVillage = availableVillages.find((v) => v.id === villageId);
	const headMember = members.find((m) => m.is_head) || members[0];
	const headDisplayName = headMember
		? headMember.full_name
		: household?.head_name || "Chưa xác định";

	const handleOpenAddMember = () => {
		(document.activeElement as HTMLElement)?.blur();
		setEditingMemberIndex(null);
		setIsCitizenModalOpen(true);
	};

	const handleOpenEditMember = (index: number) => {
		(document.activeElement as HTMLElement)?.blur();
		setEditingMemberIndex(index);
		setIsCitizenModalOpen(true);
	};

	const handleSaveCitizen = (memberData: Partial<Person>) => {
		let updatedMembers = [...members];
		const isHead = memberData.is_head || memberData.relationship === "Chủ hộ";

		if (isHead) {
			// Hủy cờ chủ hộ của các thành viên khác
			updatedMembers = updatedMembers.map((m, idx) =>
				idx === editingMemberIndex
					? m
					: {
							...m,
							is_head: false,
							relationship:
								m.relationship === "Chủ hộ"
									? ("Khác" as RelationshipType)
									: m.relationship,
						},
			);
		}

		const newPerson: Person = {
			id: memberData.id || `mem-${Date.now()}`,
			household_id: household?.id || "new-hh",
			stt:
				editingMemberIndex !== null
					? members[editingMemberIndex].stt
					: members.length + 1,
			full_name: memberData.full_name || "",
			last_name: memberData.last_name || "",
			first_name: memberData.first_name || "",
			name_unaccented: memberData.name_unaccented || "",
			relationship: memberData.relationship || (isHead ? "Chủ hộ" : "Con đẻ"),
			is_head: isHead,
			gender: memberData.gender || "Nam",
			dob: memberData.dob || "",
			dob_raw: memberData.dob_raw || "",
			dob_formatted: memberData.dob_formatted || "",
			birth_year: memberData.birth_year || 2000,
			age: memberData.age || 26,
			cccd: memberData.cccd || "",
			cccd_last4: memberData.cccd_last4 || "",
			cccd_masked: memberData.cccd_masked || "",
			ethnicity: memberData.ethnicity || "Kinh",
			is_minority: memberData.is_minority ?? memberData.ethnicity !== "Kinh",
			religion: memberData.religion || "Không",
			occupation: memberData.occupation || "",
			notes: memberData.notes || "",
		};

		if (editingMemberIndex !== null) {
			updatedMembers[editingMemberIndex] = newPerson;
		} else {
			updatedMembers.push(newPerson);
		}

		// Đánh lại STT 1..N
		updatedMembers = updatedMembers.map((m, idx) => ({ ...m, stt: idx + 1 }));

		setMembers(updatedMembers);
		setIsCitizenModalOpen(false);
		setEditingMemberIndex(null);
	};

	const handleRemoveMember = (index: number) => {
		const updated = members
			.filter((_, idx) => idx !== index)
			.map((m, idx) => ({ ...m, stt: idx + 1 }));
		setMembers(updated);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const finalBookNumber =
			household?.book_number || household?.code || `HGD-${Date.now()}`;

		const finalVillageId =
			user?.role === "user" && user.village_id ? user.village_id : villageId;
		const selectedV = availableVillages.find((v) => v.id === finalVillageId);
		const finalHeadMember = members.find((m) => m.is_head) || members[0];
		const headName = finalHeadMember
			? finalHeadMember.full_name
			: household?.head_name || "Chưa xác định";
		const headCccd = finalHeadMember
			? finalHeadMember.cccd
			: household?.head_cccd || "";

		setLoading(true);
		setError(null);
		try {
			await onSave({
				book_number: finalBookNumber,
				code: finalBookNumber,
				village_id: finalVillageId,
				village_name: selectedV?.name || "",
				head_name: headName,
				head_cccd: headCccd,
				address: address.trim(),
				status,
				notes: notes.trim(),
				members_count: members.length,
				members,
				version: household?.version,
			});
			onClose();
		} catch (err: any) {
			setError(err?.message || "Có lỗi xảy ra khi lưu hộ gia đình.");
		} finally {
			setLoading(false);
		}
	};

	const inputClasses =
		"w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500/20";

	const getStatusBadgeStyle = (st: string) => {
		switch (st) {
			case "Thường trú":
				return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
			case "Tạm trú":
				return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
			case "Tạm vắng":
				return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
			case "Chuyển đi":
				return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
			default:
				return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
		}
	};

	return createPortal(
		<>
			{/* Backdrop phủ mờ toàn màn hình & Canh giữa Modal */}
			<div
				className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
				onClick={(e) => {
					if (e.target === e.currentTarget && !isCitizenModalOpen) {
						handleRequestClose();
					}
				}}
				aria-hidden={isCitizenModalOpen}
			>
				{/* Modal Nổi Trung Tâm */}
				<div
					ref={drawerRef}
					className="w-full max-w-3xl h-[88vh] max-h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative"
					role="dialog"
					aria-modal="true"
					aria-labelledby="household-drawer-title"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Top Bar (Cố định trên cùng) */}
					<div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<h2
									id="household-drawer-title"
									className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
								>
									<Home
										className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
										strokeWidth={1.5}
									/>
									<span>
										{household
											? `Chỉnh Sửa Hộ: ${headDisplayName}`
											: "Thêm Hộ Gia Đình Mới"}
									</span>
								</h2>
							</div>

							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Chủ hộ:{" "}
									<span className="text-emerald-600 dark:text-emerald-400">
										{headDisplayName}
									</span>
								</span>
								<span className="text-slate-300 dark:text-slate-700">•</span>
								<span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
									{currentVillage?.name || "Chưa gán thôn"}
								</span>
								<span className="text-slate-300 dark:text-slate-700">•</span>
								<span
									className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(status)}`}
								>
									{status}
								</span>
							</div>
						</div>

						<button
							type="button"
							onClick={handleRequestClose}
							aria-label="Đóng ngăn kéo"
							className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X strokeWidth={1.5} className="w-5 h-5" />
						</button>
					</div>

					{/* Error Notification */}
					{error && (
						<div className="mx-6 mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
							<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
							<span>{error}</span>
						</div>
					)}

					{/* Body (Cuộn 1 luồng dọc mượt mà) */}
					<form
						id="household-drawer-form"
						onSubmit={handleSubmit}
						className="flex-1 overflow-y-auto p-6 space-y-6"
					>
						{/* KHỐI 1: Thông tin Chung Hộ Gia Đình */}
						<div className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
								<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
								<h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
									1. Thông Tin Chung Hộ Gia Đình
								</h3>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									{user?.role === "user" && user.village_id ? (
										<div>
											<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
												Thôn quản lý
											</label>
											<div className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-300 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
												<span>{currentVillage?.name || "Thôn quản lý"}</span>
												<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
													Cố định
												</span>
											</div>
										</div>
									) : (
										<CustomSelect
											value={villageId}
											onChange={(val) => setVillageId(String(val))}
											options={availableVillages.map((v) => ({
												value: v.id,
												label: v.name,
											}))}
											label="Thôn quản lý"
											required
										/>
									)}
								</div>

								<div>
									<CustomSelect
										value={status}
										onChange={(val) => setStatus(String(val))}
										options={["Thường trú", "Tạm trú", "Tạm vắng", "Chuyển đi"]}
										label="Trạng thái cư trú"
										required
									/>
								</div>

								<div>
									<label htmlFor="drawer-address" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
										Địa chỉ cư trú
									</label>
									<input
										id="drawer-address"
										type="text"
										value={address}
										onChange={(e) => setAddress(e.target.value)}
										placeholder="Thôn 1, Xã Đăk Hà..."
										className={inputClasses}
									/>
								</div>

								<div>
									<label htmlFor="drawer-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
										Ghi chú hộ gia đình
									</label>
									<input
										id="drawer-notes"
										type="text"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Hoàn cảnh gia đình, ghi chú bổ sung..."
										className={inputClasses}
									/>
								</div>
							</div>
						</div>

						{/* KHỐI 2: Danh Sách Thành Viên (Nhân Khẩu) */}
						<div className="space-y-4">
							<div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
								<div className="flex items-center gap-2">
									<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
									<h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
										2. Danh Sách Nhân Khẩu ({members.length} người)
									</h3>
								</div>
								<button
									type="button"
									onClick={handleOpenAddMember}
									className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
								>
									<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
									<span>Thêm Nhân Khẩu Mới</span>
								</button>
							</div>

							{members.length === 0 ? (
								<div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
									<Users
										className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500"
										strokeWidth={1.5}
									/>
									<div>
										<h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
											Hộ gia đình này chưa có nhân khẩu nào
										</h4>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
											Hãy bấm nút "Thêm Nhân Khẩu Mới" để đăng ký chủ hộ và các
											thành viên gia đình.
										</p>
									</div>
									<button
										type="button"
										onClick={handleOpenAddMember}
										className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
									>
										<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
										<span>Thêm Thành Viên Đầu Tiên</span>
									</button>
								</div>
							) : (
								<div className="space-y-2.5">
									{members.map((m, idx) => {
										const isHead = m.is_head || m.relationship === "Chủ hộ";
										const relationshipLabel =
											m.relationship || (isHead ? "Chủ hộ" : "Thành viên");
										const birthDisplay =
											m.dob_formatted || m.dob_raw || m.birth_year || m.dob;
										const memId = m.id || `mem-${idx}`;
										const isCccdRevealed = revealedCccdIds.includes(memId);
										const cccdFull = m.cccd ? m.cccd.trim() : "";
										const cccdLast4 =
											m.cccd_last4 || (cccdFull ? cccdFull.slice(-4) : "");
										const cccdDisplay = isCccdRevealed
											? cccdFull || (cccdLast4 ? `••••••••${cccdLast4}` : "")
											: cccdLast4
												? `••••••••${cccdLast4}`
												: cccdFull
													? `••••••••${cccdFull.slice(-4)}`
													: "";

										return (
											<div
												key={m.id || idx}
												className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
											>
												{/* Phía bên trái (Nội dung thông tin phân tầng) */}
												<div className="space-y-1.5 min-w-0 flex-1">
													{/* Hàng 1 (Nhận diện & Quan hệ) */}
													<div className="flex items-center gap-2 min-w-0">
														<span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center shrink-0">
															#{m.stt || idx + 1}
														</span>
														<span
															className={`px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 ${
																isHead
																	? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
																	: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
															}`}
														>
															{relationshipLabel}
														</span>
														<span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
															{m.full_name}
														</span>
														{m.gender && (
															<span
																className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
																	m.gender === "Nam"
																		? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
																		: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
																}`}
															>
																{m.gender}
															</span>
														)}
													</div>

													{/* Hàng 2 (Metadata chi tiết, căn lề thẳng hàng họ tên pl-7) */}
													<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-7">
														{birthDisplay && <span>{birthDisplay}</span>}
														{(cccdFull || cccdLast4) && (
															<button
																type="button"
																onClick={() => toggleRevealCccd(memId)}
																title={
																	isCccdRevealed
																		? "Bấm để ẩn số CCCD"
																		: "Bấm để xem đầy đủ 12 số CCCD"
																}
																className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
															>
																{isCccdRevealed ? (
																	<EyeOff
																		strokeWidth={1.5}
																		className="w-3.5 h-3.5 text-slate-400"
																	/>
																) : (
																	<Eye
																		strokeWidth={1.5}
																		className="w-3.5 h-3.5 text-slate-400"
																	/>
																)}
																<span>{cccdDisplay}</span>
															</button>
														)}
														<span
															className={`px-1.5 py-0.5 rounded text-[10px] ${
																m.is_minority
																	? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold"
																	: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
															}`}
														>
															{m.ethnicity || "Kinh"}
														</span>
														{m.religion && m.religion !== "Không" && (
															<span className="text-slate-600 dark:text-slate-400">
																{m.religion}
															</span>
														)}
														{m.notes && (
															<span
																className="italic text-slate-400 dark:text-slate-500 truncate max-w-[180px]"
																title={m.notes}
															>
																{m.notes}
															</span>
														)}
													</div>
												</div>

												{/* Phía bên phải (Cụm nút Thao tác cố định, không cuộn ngang, luôn luôn nhìn thấy) */}
												<div className="flex items-center gap-1 shrink-0">
													<button
														type="button"
														onClick={() => handleOpenEditMember(idx)}
														title="Sửa nhân khẩu"
														aria-label={`Sửa nhân khẩu ${m.full_name}`}
														className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all cursor-pointer"
													>
														<Edit3 strokeWidth={1.5} className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => handleRemoveMember(idx)}
														title="Xóa nhân khẩu"
														aria-label={`Xóa nhân khẩu ${m.full_name}`}
														className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
													>
														<Trash2 strokeWidth={1.5} className="w-4 h-4" />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</form>

					{/* Bottom Bar (Cố định dưới cùng) */}
					<div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
						<button
							type="button"
							onClick={handleRequestClose}
							className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
						>
							Hủy / Đóng
						</button>

						<button
							type="submit"
							form="household-drawer-form"
							disabled={loading}
							className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.99] cursor-pointer"
						>
							{loading ? (
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							) : (
								<Save strokeWidth={1.5} className="w-4 h-4" />
							)}
							<span>Lưu Thông Tin Hộ</span>
						</button>
					</div>
				</div>
			</div>

			{/* Sub-modal Chuyên biệt Nhập liệu Nhân khẩu */}
			<CitizenModal
				isOpen={isCitizenModalOpen}
				initialMember={
					editingMemberIndex !== null ? members[editingMemberIndex] : null
				}
				onClose={() => {
					setIsCitizenModalOpen(false);
					setEditingMemberIndex(null);
				}}
				onSave={handleSaveCitizen}
			/>

			{/* Hộp thoại xác nhận hủy bỏ khi dữ liệu đã thay đổi (isDirty) */}
			{showDiscardConfirm && (
				<div className="fixed inset-0 !m-0 z-[60] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150">
					<div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
								<AlertCircle className="w-5 h-5" />
							</div>
							<div>
								<h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
									Xác nhận hủy thay đổi
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Dữ liệu hộ gia đình chưa được lưu vào hệ thống
								</p>
							</div>
						</div>
						<p className="text-sm text-slate-600 dark:text-slate-300">
							Đồng chí đã chỉnh sửa thông tin hoặc danh sách nhân khẩu. Đồng chí có chắc chắn muốn hủy bỏ các thay đổi này và đóng biểu mẫu không?
						</p>
						<div className="flex items-center justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={() => setShowDiscardConfirm(false)}
								className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
							>
								Tiếp tục chỉnh sửa
							</button>
							<button
								type="button"
								onClick={() => {
									setShowDiscardConfirm(false);
									onClose();
								}}
								className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
							>
								Đồng ý hủy bỏ
							</button>
						</div>
					</div>
				</div>
			)}
		</>,
		document.body,
	);
};
