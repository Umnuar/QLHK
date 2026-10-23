import { ArrowLeft, History, Loader2, Save, User, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/AppContext";
import type { Village } from "@/types";
import { CustomSelect } from "@/components/common/CustomSelect";

export const ETHNIC_GROUPS = [
	"Kinh",
	"Xơ Đăng",
	"Gia Rai",
	"Giẻ Triêng",
	"Ba Na",
	"Cor",
	"Cơ Ho",
	"Dao",
	"Dìu",
	"Ê Đê",
	"Giơ Lâng",
	"Ha Lăng",
	"Hoa",
	"Hrê",
	"Khác",
];

export const isMaskedCccd = (val?: string | null): boolean => {
	if (!val) return false;
	return /[\u2022\u25cf*]/.test(String(val));
};

export interface ProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: any) => Promise<boolean | void>;
	initialData?: any;
	isNew?: boolean;
	activeTab: "chuctho" | "htxh";
	villages: Village[];
	defaultVillageId?: string;
	calculationYear: number;
	auditLogs?: any[];
	isLoadingLogs?: boolean;
	loadAuditLogs?: (profileId: string | number) => void;
}

export type ProfileDrawerProps = ProfileModalProps;

const inputClasses =
	"w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500/20 dark:disabled:bg-slate-800/40";

export const ProfileModal: React.FC<ProfileModalProps> = ({
	isOpen,
	onClose,
	onSave,
	initialData,
	isNew = false,
	activeTab,
	villages,
	defaultVillageId = "",
	calculationYear,
	auditLogs = [],
	isLoadingLogs = false,
	loadAuditLogs,
}) => {
	const { user } = useApp();
	const isVillageOfficer = user?.role === "user";
	const isHtxhEdit = activeTab === "htxh" && !isNew;

	const [currentTab, setCurrentTab] = useState<"info" | "history">("info");
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState<any>({});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const previousActiveElement = useRef<HTMLElement | null>(null);
	const modalRef = useRef<HTMLDivElement | null>(null);
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const lastLoadedProfileKeyRef = useRef<string | null>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const loadAuditLogsRef = useRef(loadAuditLogs);
	loadAuditLogsRef.current = loadAuditLogs;

	const profileKey = isOpen
		? isNew
			? "__new__"
			: String(initialData?.id || initialData?._id || "__edit__")
		: null;

	useEffect(() => {
		if (!isOpen) {
			lastLoadedProfileKeyRef.current = null;
			return;
		}

		if (lastLoadedProfileKeyRef.current === profileKey) {
			return;
		}
		lastLoadedProfileKeyRef.current = profileKey;

		setCurrentTab("info");
		setFormErrors({});

		if (initialData && !isNew) {
			const safeCccd =
				typeof initialData.cccd === "string" && initialData.cccd.includes(":")
					? ""
					: initialData.cccd || "";
			setFormData({
				...initialData,
				cccd: safeCccd,
				name:
					initialData.name ||
					initialData.full_name ||
					initialData.fullName ||
					"",
				village_id:
					isVillageOfficer && user?.village_id
						? user.village_id
						: initialData.village_id ||
							initialData.villageId ||
							defaultVillageId,
				received: Boolean(initialData.received),
			});
			if (initialData.id && loadAuditLogsRef.current) {
				loadAuditLogsRef.current(initialData.id);
			}
		} else {
			setFormData({
				name: "",
				dob: "",
				gender: "Nam",
				cccd: "",
				ethnicity: "Kinh",
				residence: "",
				currentAddress: "",
				village_id:
					isVillageOfficer && user?.village_id
						? user.village_id
						: defaultVillageId,
				received: false,
				notes: "",
				calculation_year: calculationYear,

				age75plus: "",
				age70to74poor: "",
				bao_tro: "",
				huu_tri: "",
				huu_tuat_bao_hiem: "",
				nguoi_co_cong: "",
			});
		}
	}, [
		isOpen,
		profileKey,
		initialData,
		isNew,
		defaultVillageId,
		calculationYear,
		isVillageOfficer,
		user?.village_id,
	]);

	useEffect(() => {
		if (isOpen) {
			previousActiveElement.current = document.activeElement as HTMLElement | null;
			const focusTimer = setTimeout(() => {
				nameInputRef.current?.focus();
			}, 50);

			const handleGlobalKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					e.preventDefault();
					onCloseRef.current();
				}
			};
			window.addEventListener("keydown", handleGlobalKeyDown);

			return () => {
				clearTimeout(focusTimer);
				window.removeEventListener("keydown", handleGlobalKeyDown);
				if (
					previousActiveElement.current &&
					typeof previousActiveElement.current.focus === "function"
				) {
					previousActiveElement.current.focus();
				}
			};
		}
	}, [isOpen]);

	const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
			return;
		}

		if (e.key === "Tab" && modalRef.current) {
			const focusableElements = Array.from(
				modalRef.current.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			).filter(
				(el) =>
					el.offsetParent !== null ||
					el.offsetWidth > 0 ||
					el.offsetHeight > 0,
			);

			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (e.shiftKey) {
				if (
					document.activeElement === firstElement ||
					!modalRef.current.contains(document.activeElement)
				) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				if (
					document.activeElement === lastElement ||
					!modalRef.current.contains(document.activeElement)
				) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		}
	};

	if (!isOpen) return null;

	const calculateCurrentAge = (): number | null => {
		if (!formData.dob) return null;
		const str = String(formData.dob).trim();
		let birthYear: number | null = null;
		if (str.includes("/")) {
			const parts = str.split("/");
			if (parts.length === 3) birthYear = parseInt(parts[2], 10);
		} else if (/^\d{4}$/.test(str)) {
			birthYear = parseInt(str, 10);
		}
		if (birthYear && !isNaN(birthYear)) {
			return calculationYear - birthYear;
		}
		return null;
	};

	const calculatedAge = calculateCurrentAge();

	const getAgeMilestoneBadge = (age: number | null) => {
		if (age === null || age <= 0) return null;
		if (age === 60) return "Tròn 60 tuổi";
		if (age === 65) return "Tròn 65 tuổi";
		if (age === 70) return "Tròn 70 tuổi";
		if (age === 75) return "Tròn 75 tuổi";
		if (age === 80) return "Tròn 80 tuổi";
		if (age === 85) return "Tròn 85 tuổi";
		if (age === 90) return "Tròn 90 tuổi";
		if (age === 95) return "Tròn 95 tuổi";
		if (age === 100) return "Tròn 100 tuổi";
		if (age > 100) return `Trên 100 tuổi (${age} tuổi)`;
		return `${age} tuổi`;
	};

	const validate = () => {
		if (isHtxhEdit) return true;
		const errors: Record<string, string> = {};
		if (!formData.name || !formData.name.trim()) {
			errors.name = "Họ và tên không được để trống";
		}
		if (!formData.dob || !formData.dob.trim()) {
			errors.dob = "Năm sinh không được để trống (YYYY hoặc DD/MM/YYYY)";
		} else if (!/^(\d{4}|\d{2}\/\d{2}\/\d{4})$/.test(formData.dob.trim())) {
			errors.dob = "Định dạng phải là YYYY hoặc DD/MM/YYYY";
		}
		if (formData.cccd && formData.cccd.trim()) {
			const cleanCccd = formData.cccd.trim();
			if (!isMaskedCccd(cleanCccd) && !/^\d{12}$/.test(cleanCccd)) {
				errors.cccd = "CCCD phải gồm đúng 12 chữ số";
			}
		}
		if (
			!isVillageOfficer &&
			(!formData.village_id || !String(formData.village_id).trim())
		) {
			errors.village_id = "Vui lòng chọn thôn/bản phụ trách";
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		setIsSaving(true);
		try {
			if (isHtxhEdit) {
				const htxhPayload: any = {
					age75plus: formData.age75plus ? "x" : "",
					age70to74poor: formData.age70to74poor ? "x" : "",
					bao_tro: formData.bao_tro ? "x" : "",
					huu_tri: formData.huu_tri ? "x" : "",
					huu_tuat_bao_hiem: formData.huu_tuat_bao_hiem ? "x" : "",
					nguoi_co_cong: formData.nguoi_co_cong ? "x" : "",
					current_address:
						formData.currentAddress || formData.current_address || "",
					notes: formData.notes || "",
					received: Boolean(formData.received),
					calculation_year: calculationYear,
				};
				const saveResult = await onSave(htxhPayload);
				if (saveResult === false) {
					return;
				}
				onClose();
				return;
			}
			const payload: any = { ...formData };
			if (isVillageOfficer && user?.village_id) {
				payload.village_id = user.village_id;
			}
			if (!payload.village_id || String(payload.village_id).trim() === "") {
				delete payload.village_id;
			}
			payload.current_address =
				payload.current_address || payload.currentAddress || "";
			delete payload.currentAddress;

			if (
				!isNew &&
				(isMaskedCccd(payload.cccd) || payload.cccd === initialData?.cccd)
			) {
				delete payload.cccd;
			}
			if (activeTab === "chuctho") {
				delete payload.age75plus;
				delete payload.age70to74poor;
				delete payload.bao_tro;
				delete payload.huu_tri;
				delete payload.huu_tuat_bao_hiem;
				delete payload.nguoi_co_cong;
				if (calculatedAge !== null) {
					payload.age60 = calculatedAge === 60 ? "x" : "";
					payload.age65 = calculatedAge === 65 ? "x" : "";
					payload.age70 = calculatedAge === 70 ? "x" : "";
					payload.age75 = calculatedAge === 75 ? "x" : "";
					payload.age80 = calculatedAge === 80 ? "x" : "";
					payload.age85 = calculatedAge === 85 ? "x" : "";
					payload.age90 = calculatedAge === 90 ? "x" : "";
					payload.age95 = calculatedAge === 95 ? "x" : "";
					payload.age100 = calculatedAge === 100 ? "x" : "";
					payload.age_over_100 = calculatedAge > 100 ? "x" : "";
				}
			} else {
				delete payload.age60;
				delete payload.age65;
				delete payload.age70;
				delete payload.age75;
				delete payload.age80;
				delete payload.age85;
				delete payload.age90;
				delete payload.age95;
				delete payload.age100;
				delete payload.age_over_100;
			}
			payload.calculation_year = calculationYear;

			const saveResult = await onSave(payload);
			if (saveResult === false) {
				return;
			}
			onClose();
		} catch (err) {
			console.error("Lỗi khi lưu hồ sơ:", err);
		} finally {
			setIsSaving(false);
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={modalRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="profile-modal-title"
				tabIndex={-1}
				onKeyDown={handleContainerKeyDown}
				className="w-full max-w-3xl h-auto max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-150 animate-in zoom-in-95 duration-150 relative outline-hidden"
				onClick={(e) => e.stopPropagation()}
			>

				<div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/70">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
							<User
								className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
						</div>
						<div>
							<h3
								id="profile-modal-title"
								className="text-base font-black text-slate-900 dark:text-white tracking-tight"
							>
								{isNew
									? `Thêm mới hồ sơ ${activeTab === "chuctho" ? "chúc thọ" : "hưu trí xã hội"}`
									: `Chỉnh sửa hồ sơ ${activeTab === "chuctho" ? "chúc thọ" : "hưu trí xã hội"}`}
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
								<span>Năm tính toán:</span>
								<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
									{calculationYear}
								</strong>
								{calculatedAge !== null && (
									<span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
										{getAgeMilestoneBadge(calculatedAge)}
									</span>
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{!isNew && (
							<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
								<button
									type="button"
									onClick={() => setCurrentTab("info")}
									className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
										currentTab === "info"
											? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
											: "text-slate-500 dark:text-slate-400 hover:text-slate-900"
									}`}
								>
									Thông tin
								</button>
								<button
									type="button"
									onClick={() => setCurrentTab("history")}
									className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
										currentTab === "history"
											? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
											: "text-slate-500 dark:text-slate-400 hover:text-slate-900"
									}`}
								>
									<History className="w-3.5 h-3.5" strokeWidth={1.5} />
									<span>Lịch sử</span>
								</button>
							</div>
						)}

						<button
							type="button"
							onClick={onClose}
							aria-label="Đóng cửa sổ"
							title="Đóng cửa sổ (Escape)"
							className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X className="w-5 h-5" strokeWidth={1.5} />
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
					{currentTab === "info" ? (
						<form
							id="profile-modal-form"
							onSubmit={handleSave}
							className="space-y-4"
						>
							{isHtxhEdit && (
								<div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold">
									Thông tin nhân khẩu được liên kết từ Quản lý Hộ khẩu (QLHK). Chỉ được chỉnh sửa nơi ở hiện nay, ghi chú và các diện hưởng HTXH.
								</div>
							)}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

								<div>
									<label
										htmlFor="modal-input-name"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Họ và Tên <span className="text-rose-500">*</span>
									</label>
									<input
										id="modal-input-name"
										ref={nameInputRef}
										type="text"
										disabled={isHtxhEdit}
										value={formData.name || ""}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Nguyễn Văn A"
										className={inputClasses}
									/>
									{formErrors.name && (
										<p className="mt-1 text-xs text-rose-500 font-semibold">
											{formErrors.name}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="modal-input-dob"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Năm sinh (hoặc Ngày sinh){" "}
										<span className="text-rose-500">*</span>
									</label>
									<input
										id="modal-input-dob"
										type="text"
										disabled={isHtxhEdit}
										value={formData.dob || ""}
										onChange={(e) =>
											setFormData({ ...formData, dob: e.target.value })
										}
										placeholder="YYYY (vd: 1954) hoặc DD/MM/YYYY"
										className={inputClasses}
									/>
									{formErrors.dob && (
										<p className="mt-1 text-xs text-rose-500 font-semibold">
											{formErrors.dob}
										</p>
									)}
								</div>

								<div>
									<CustomSelect
										label="Giới tính"
										disabled={isHtxhEdit}
										value={formData.gender || "Nam"}
										onChange={(val) =>
											setFormData({ ...formData, gender: val })
										}
										options={["Nam", "Nữ"]}
									/>
								</div>

								<div>
									<label
										htmlFor="modal-input-cccd"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Số CCCD (12 chữ số)
									</label>
									<input
										id="modal-input-cccd"
										type="text"
										disabled={isHtxhEdit}
										value={formData.cccd || ""}
										maxLength={12}
										onChange={(e) =>
											setFormData({ ...formData, cccd: e.target.value.replace(/\D/g, "") })
										}
										placeholder="0600..."
										className={`${inputClasses} font-mono`}
									/>
									{formErrors.cccd && (
										<p className="mt-1 text-xs text-rose-500 font-semibold">
											{formErrors.cccd}
										</p>
									)}
								</div>

								<div>
									<CustomSelect
										label="Dân tộc"
										disabled={isHtxhEdit}
										value={formData.ethnicity || "Kinh"}
										onChange={(val) =>
											setFormData({ ...formData, ethnicity: val })
										}
										options={ETHNIC_GROUPS}
										searchable
									/>
								</div>

								<div>
									{isVillageOfficer ? (
										<div>
											<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
												Thôn quản lý
											</label>
											<div className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-300 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
												<span>
													{villages.find(
														(v) =>
															v.id ===
															(formData.village_id || user?.village_id),
													)?.name || "Thôn phụ trách"}
												</span>
												<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
													Cố định
												</span>
											</div>
										</div>
									) : (
										<div>
											<CustomSelect
												label="Thuộc Thôn"
												disabled={isHtxhEdit}
												value={formData.village_id || ""}
												onChange={(val) =>
													setFormData({ ...formData, village_id: val })
												}
												options={villages.map((v) => ({
													value: v.id,
													label: v.name,
												}))}
												placeholder="-- Chọn thôn --"
												required
											/>
											{formErrors.village_id && (
												<p className="mt-1 text-xs text-rose-500 font-semibold">
													{formErrors.village_id}
												</p>
											)}
										</div>
									)}
								</div>

								<div>
									<label
										htmlFor="modal-input-residence"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Nơi thường trú (Hộ khẩu)
									</label>
									<input
										id="modal-input-residence"
										type="text"
										disabled={isHtxhEdit}
										value={formData.residence || ""}
										onChange={(e) =>
											setFormData({ ...formData, residence: e.target.value })
										}
										placeholder="Thôn 1, Xã Đăk Hà..."
										className={inputClasses}
									/>
								</div>

								<div>
									<label
										htmlFor="modal-input-current-address"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Nơi ở hiện nay
									</label>
									<input
										id="modal-input-current-address"
										type="text"
										value={
											formData.currentAddress || formData.current_address || ""
										}
										onChange={(e) =>
											setFormData({
												...formData,
												currentAddress: e.target.value,
												current_address: e.target.value,
											})
										}
										placeholder="Thôn 1, Xã Đăk Hà..."
										className={inputClasses}
									/>
								</div>

								<div>
									<CustomSelect
										label="Trạng thái nhận quà"
										value={formData.received ? "1" : "0"}
										onChange={(val) =>
											setFormData({ ...formData, received: val === "1" })
										}
										options={[
											{ value: "0", label: "Chưa nhận quà" },
											{ value: "1", label: "Đã nhận quà" },
										]}
									/>
								</div>

								<div>
									<label
										htmlFor="modal-input-notes"
										className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
									>
										Ghi chú
									</label>
									<input
										id="modal-input-notes"
										type="text"
										value={formData.notes || ""}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="Ghi chú thêm..."
										className={inputClasses}
									/>
								</div>
							</div>

							{activeTab === "htxh" && (
								<div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
										Phân loại diện hưởng Hưu Trí Xã Hội:
									</label>
									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
										{[
											{ key: "age75plus", label: "Đủ 75 tuổi trở lên" },
											{
												key: "age70to74poor",
												label: "70-74 tuổi nghèo/cận nghèo",
											},
											{ key: "bao_tro", label: "Đang hưởng Bảo trợ" },
											{ key: "huu_tri", label: "Đang hưởng Hưu trí" },
											{
												key: "huu_tuat_bao_hiem",
												label: "Hưu tuất / Bảo hiểm",
											},
											{ key: "nguoi_co_cong", label: "Người có công" },
										].map((item) => (
											<label
												key={item.key}
												className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
											>
												<input
													type="checkbox"
													checked={Boolean(formData[item.key])}
													onChange={(e) =>
														setFormData({
															...formData,
															[item.key]: e.target.checked ? "x" : "",
														})
													}
													className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
												/>
												<span>{item.label}</span>
											</label>
										))}
									</div>
								</div>
							)}
						</form>
					) : (
						<div className="space-y-3">
							{isLoadingLogs ? (
								<div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
									<Loader2
										className="w-6 h-6 animate-spin text-emerald-600 mb-2"
										strokeWidth={1.5}
									/>
									<span>Đang tải lịch sử hồ sơ...</span>
								</div>
							) : auditLogs.length === 0 ? (
								<div className="py-12 text-center text-slate-400 text-xs italic">
									Chưa có lịch sử thay đổi nào được ghi nhận cho hồ sơ này.
								</div>
							) : (
								<div className="space-y-2">
									{auditLogs.map((log: any, idx: number) => (
										<div
											key={idx}
											className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1"
										>
											<div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
												<span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
													{log.action || "Thay đổi"}
												</span>
												<span>
													{log.created_at
														? new Date(log.created_at).toLocaleString("vi-VN")
														: ""}
												</span>
											</div>
											<p className="text-slate-700 dark:text-slate-300">
												{log.note || log.description || "Cập nhật dữ liệu"}
											</p>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-950">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
					>
						<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
						<span>Hủy</span>
					</button>

					{currentTab === "info" && (
						<button
							type="submit"
							form="profile-modal-form"
							disabled={isSaving}
							className="min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
						>
							{isSaving ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
									<span>Đang lưu...</span>
								</>
							) : (
								<>
									<Save className="w-4 h-4" strokeWidth={1.5} />
									<span>Lưu thay đổi</span>
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};

export const ProfileDrawer = ProfileModal;
export default ProfileModal;
