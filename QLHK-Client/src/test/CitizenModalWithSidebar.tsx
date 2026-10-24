import {
	AlertCircle,
	ArrowRight,
	Briefcase,
	Check,
	Eye,
	EyeOff,
	Sparkles,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { householdApi } from "@/api/householdApi";
import { ETHNIC_GROUPS, RELIGIONS } from "@/data/constants";
import type { Gender, Person, RelationshipType } from "@/types";
import { maskCccd, validateCccd } from "@/utils/cccd";
import {
	calculateAge,
	formatDobDisplay,
	parseAndValidateDob,
} from "@/utils/date";
import { normalizeUnaccented, splitFullName } from "@/utils/vietnamese";
import { CustomSelect } from "@/components/common/CustomSelect";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface CitizenModalWithSidebarProps {
	isOpen: boolean;
	initialMember?: Partial<Person> | null;
	existingMembers?: (Partial<Person> | Person)[];
	onClose: () => void;
	onSave: (memberData: Partial<Person>) => void;
}

export type ModalSidebarTab = "basic" | "career";

const CITIZEN_RELATIONSHIPS = [
	"Chủ hộ",
	"Thành viên",
	"Vợ",
	"Chồng",
	"Con đẻ",
	"Con nuôi",
	"Con dâu",
	"Con rể",
	"Cha",
	"Mẹ",
	"Bố",
	"Ông",
	"Bà",
	"Cháu",
	"Anh",
	"Chị",
	"Em",
	"Khác",
] as const;

function getAvatarInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "NK";
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const CitizenModalWithSidebar: React.FC<CitizenModalWithSidebarProps> = ({
	isOpen,
	initialMember,
	existingMembers,
	onClose,
	onSave,
}) => {
	const fullNameInputRef = useRef<HTMLInputElement>(null);
	const occupationInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const [activeTab, setActiveTab] = useState<ModalSidebarTab>("basic");
	const [fullName, setFullName] = useState("");
	const [relationship, setRelationship] = useState<string>("Con đẻ");
	const [isHead, setIsHead] = useState(false);
	const [gender, setGender] = useState<Gender>("Nam");
	const [dob, setDob] = useState("");
	const [cccd, setCccd] = useState("");
	const [ethnicity, setEthnicity] = useState("Kinh");
	const [religion, setReligion] = useState("Không");
	const [militaryStatus, setMilitaryStatus] = useState("");
	const [education, setEducation] = useState("");
	const [occupation, setOccupation] = useState("");
	const [nativePlace, setNativePlace] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isRevealingCccd, setIsRevealingCccd] = useState(false);

	const handleToggleRevealCccd = async () => {
		if (!initialMember?.id || initialMember.id.startsWith("mem-")) return;
		if (cccd.includes("•")) {
			try {
				setIsRevealingCccd(true);
				const plain = await householdApi.revealCitizenCCCD(initialMember.id);
				if (plain) {
					setCccd(plain);
				}
			} catch (err) {
				console.error(err);
			} finally {
				setIsRevealingCccd(false);
			}
		} else {
			setCccd(maskCccd(cccd, false));
		}
	};

	useEffect(() => {
		if (isOpen) {
			if (initialMember) {
				setFullName(initialMember.full_name || "");
				const rel = initialMember.relationship || "Con đẻ";
				setRelationship(rel);
				setIsHead(initialMember.is_head || rel === "Chủ hộ");
				setGender(initialMember.gender || "Nam");
				const rawCccd = (initialMember.cccd || "").trim();
				const isPlaceholder =
					!rawCccd ||
					rawCccd.toLowerCase().includes("chưa có") ||
					rawCccd.includes("a có") ||
					rawCccd === "—" ||
					rawCccd === "-" ||
					rawCccd === "null" ||
					rawCccd === "undefined" ||
					!/\d/.test(rawCccd);
				setCccd(isPlaceholder ? "" : rawCccd);
				setDob(initialMember.dob || "");
				setEthnicity(initialMember.ethnicity || "Kinh");
				setReligion(initialMember.religion || "Không");
				setMilitaryStatus(initialMember.military_status || (initialMember as any).nvqs || "");
				setEducation(initialMember.education || (initialMember as any).hoc_van || "");
				setOccupation(initialMember.occupation || (initialMember as any).nghe_nghiep || "");
				setNativePlace(initialMember.native_place || (initialMember as any).que_quan || "");
				setNotes(initialMember.notes || (initialMember as any).ghi_chu || "");
			} else {
				setFullName("");
				setRelationship("Con đẻ");
				setIsHead(false);
				setGender("Nam");
				setDob("");
				setCccd("");
				setEthnicity("Kinh");
				setReligion("Không");
				setMilitaryStatus("");
				setEducation("");
				setOccupation("");
				setNativePlace("");
				setNotes("");
			}
			setError(null);
			setActiveTab("basic");

			const timer = setTimeout(() => {
				fullNameInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen, initialMember]);

	useEffect(() => {
		if (activeTab === "career") {
			const timer = setTimeout(() => {
				occupationInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [activeTab]);

	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
		initialFocusRef: fullNameInputRef,
	});

	const headStatus = relationship === "Chủ hộ" || isHead;

	const handleRelationshipChange = (val: string) => {
		setRelationship(val);
		if (val === "Chủ hộ") {
			setIsHead(true);
		} else {
			setIsHead(false);
		}
	};

	const parsedDobInfo = useMemo(() => {
		const trimmedDob = dob.trim();
		if (!trimmedDob) return null;
		const res = parseAndValidateDob(trimmedDob);
		if (res.isValid && res.birthYear) {
			const computedAge = calculateAge(res.formatted || trimmedDob, new Date().getFullYear());
			return {
				age: computedAge,
				formatted: res.formatted || trimmedDob,
				birthYear: res.birthYear,
			};
		}
		return null;
	}, [dob]);

	const cleanCccd = cccd.trim().replace(/\D/g, "");
	const duplicateMember =
		cleanCccd.length === 12 && existingMembers && existingMembers.length > 0
			? existingMembers.find((m) => {
					if (initialMember?.id && m.id === initialMember.id) return false;
					const targetCccd = (m.cccd || "").replace(/\D/g, "");
					return targetCccd.length === 12 && targetCccd === cleanCccd;
				})
			: null;
	const isDuplicateCccd = Boolean(duplicateMember);

	const careerFieldsFilledCount = useMemo(() => {
		let count = 0;
		if (occupation.trim()) count++;
		if (education.trim()) count++;
		if (militaryStatus.trim()) count++;
		if (notes.trim()) count++;
		return count;
	}, [occupation, education, militaryStatus, notes]);

	const isBasicInfoComplete = useMemo(() => {
		return Boolean(fullName.trim() && dob.trim() && relationship.trim());
	}, [fullName, dob, relationship]);

	if (!isOpen || typeof document === "undefined") return null;

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		setError(null);

		const trimmedName = fullName.trim();
		if (!trimmedName) {
			setActiveTab("basic");
			setError("Vui lòng nhập họ và tên nhân khẩu.");
			return;
		}

		const trimmedDob = dob.trim();
		if (!trimmedDob) {
			setActiveTab("basic");
			setError(
				"Vui lòng nhập ngày tháng năm sinh (DD/MM/YYYY, MM/YYYY hoặc YYYY)",
			);
			return;
		}

		const dobVal = parseAndValidateDob(trimmedDob);
		if (!dobVal.isValid) {
			setActiveTab("basic");
			setError(
				dobVal.error ||
					"Ngày tháng năm sinh không hợp lệ (hỗ trợ DD/MM/YYYY, MM/YYYY hoặc YYYY)",
			);
			return;
		}
		const dobFormatted = dobVal.formatted || trimmedDob;
		const birthYear = dobVal.birthYear ?? 2000;
		const age = calculateAge(dobFormatted, new Date().getFullYear());

		const trimmedCccd = cccd.trim();
		const isMasked = trimmedCccd.includes("•") || trimmedCccd.includes("*");
		const hasCccdEntered = Boolean(trimmedCccd) && !trimmedCccd.toLowerCase().includes("chưa có");

		if (isDuplicateCccd) {
			setActiveTab("basic");
			setError(
				`Cảnh báo: Trùng CCCD với nhân khẩu "${duplicateMember?.full_name}" trong hộ gia đình.`,
			);
			return;
		}

		if (hasCccdEntered && !isMasked) {
			const cccdVal = validateCccd(trimmedCccd);
			if (!cccdVal.isValid) {
				setActiveTab("basic");
				setError(`Lỗi số CCCD: ${cccdVal.error}`);
				return;
			}
		}

		const { lastName, firstName } = splitFullName(trimmedName);
		const isMinority = ethnicity !== "Kinh";
		const cccdLast4 = isMasked
			? initialMember?.cccd_last4 || trimmedCccd.slice(-4)
			: hasCccdEntered
				? trimmedCccd.slice(-4)
				: "";
		const cccdMasked = isMasked
			? initialMember?.cccd_masked || trimmedCccd
			: hasCccdEntered
				? maskCccd(trimmedCccd, false)
				: "Chưa có";
		const finalCccd = isMasked
			? initialMember?.cccd || trimmedCccd
			: hasCccdEntered
				? trimmedCccd
				: "";

		const memberData: Partial<Person> = {
			...(initialMember || {}),
			id: initialMember?.id || `mem-${Date.now()}`,
			full_name: trimmedName,
			last_name: lastName,
			first_name: firstName,
			name_unaccented: normalizeUnaccented(trimmedName),
			relationship: (headStatus ? "Chủ hộ" : relationship) as RelationshipType,
			is_head: headStatus,
			gender,
			dob: dobFormatted,
			dob_raw: dob.trim(),
			dob_formatted: formatDobDisplay(dobFormatted),
			birth_year: birthYear,
			age,
			cccd: finalCccd,
			cccd_last4: cccdLast4,
			cccd_masked: cccdMasked,
			ethnicity,
			is_minority: isMinority,
			religion,
			education: education.trim() || undefined,
			military_status: militaryStatus.trim() || undefined,
			occupation: occupation.trim() || undefined,
			native_place: nativePlace.trim() || undefined,
			notes: notes.trim(),
		};

		onSave(memberData);
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
			return;
		}

		if (e.key === "Enter") {
			const target = e.target as HTMLElement;
			if (target.tagName === "TEXTAREA") return;
			if (target.tagName === "BUTTON" && (target as HTMLButtonElement).type !== "submit") {
				return;
			}

			if (target.tagName === "INPUT") {
				e.preventDefault();
				const inputs = Array.from(
					formRef.current?.querySelectorAll<HTMLInputElement>(
						'input:not([type="hidden"]):not([disabled])'
					) || []
				);
				const currentIndex = inputs.indexOf(target as HTMLInputElement);
				if (currentIndex !== -1) {
					if (currentIndex === inputs.length - 1) {
						handleSubmit();
					} else {
						const nextInput = inputs[currentIndex + 1];
						if (nextInput) {
							nextInput.focus();
							nextInput.select();
						}
					}
				}
			}
		}
	};

	const inputClasses =
		"w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500";

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 dark:bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="citizen-modal-with-sidebar-title"
		>
			<div
				ref={modalRef}
				className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-150"
			>
				<aside className="w-full md:w-20 shrink-0 bg-slate-50/90 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 py-5 px-2 flex flex-row md:flex-col items-center justify-between">
					<div className="flex flex-row md:flex-col items-center gap-4">
						<div
							className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border relative transition-colors ${
								headStatus
									? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
									: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
							}`}
							title={`${fullName.trim() || "Nhân khẩu"} (${headStatus ? "Chủ hộ" : relationship})${parsedDobInfo ? ` • ${parsedDobInfo.age} tuổi` : ""}`}
						>
							{getAvatarInitials(fullName)}
							{headStatus && (
								<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
									★
								</span>
							)}
						</div>

						<nav className="flex flex-row md:flex-col items-center gap-2" aria-label="Các mục thông tin nhân khẩu">
							<button
								type="button"
								onClick={() => setActiveTab("basic")}
								aria-label="Thông tin cơ bản"
								title="Thông tin cơ bản (Nhân thân, CCCD & Quê quán)"
								className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
									activeTab === "basic"
										? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
										: "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								<User className="w-5 h-5" strokeWidth={activeTab === "basic" ? 2.2 : 1.8} />
								{isBasicInfoComplete && (
									<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
								)}
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("career")}
								aria-label="Nghề nghiệp & Nghĩa vụ"
								title="Nghề nghiệp & Nghĩa vụ (Học vấn, việc làm & NVQS)"
								className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
									activeTab === "career"
										? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
										: "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								<Briefcase className="w-5 h-5" strokeWidth={activeTab === "career" ? 2.2 : 1.8} />
								{careerFieldsFilledCount > 0 && (
									<span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
										{careerFieldsFilledCount}
									</span>
								)}
							</button>
						</nav>
					</div>

					<div
						className="hidden md:flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help transition-colors"
						title="Phím tắt: Enter (chuyển ô) | Ctrl+Enter (lưu nhanh) | Esc (đóng)"
					>
						<Sparkles className="w-4 h-4 text-amber-500/80" />
					</div>
				</aside>

				<main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
					<header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
						<div>
							<div className="flex items-center gap-2">
								<h3
									id="citizen-modal-with-sidebar-title"
									className="text-base font-bold text-slate-900 dark:text-slate-100"
								>
									{initialMember
										? "Sửa Thông Tin Nhân Khẩu"
										: "Thêm Nhân Khẩu Mới"}
								</h3>
								<span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
									{activeTab === "basic"
										? "Mục 1/2: Thông tin cơ bản"
										: "Mục 2/2: Nghề nghiệp & Nghĩa vụ"}
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
								{activeTab === "basic"
									? "Quản lý nhân thân, số định danh, ngày sinh và quan hệ gia đình"
									: "Cập nhật thông tin trình độ văn hóa, nghề nghiệp và thực hiện NVQS"}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Đóng cửa sổ"
							className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X strokeWidth={1.5} className="w-5 h-5" />
						</button>
					</header>

					{error && (
						<div className="mx-6 mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
							<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
							<span>{error}</span>
						</div>
					)}

					<form
						ref={formRef}
						onSubmit={handleSubmit}
						onKeyDown={handleKeyDown}
						noValidate
						autoComplete="off"
						className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-between"
					>
						<div className="space-y-4">
							{activeTab === "basic" && (
								<div className="space-y-3.5 animate-in fade-in duration-100">
									<div>
										<label
											htmlFor="modal-sidebar-full-name"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Họ và Tên <span className="text-rose-500">*</span>
										</label>
										<input
											ref={fullNameInputRef}
											id="modal-sidebar-full-name"
											type="text"
											required
											autoFocus
											autoComplete="off"
											spellCheck={false}
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											placeholder="Ví dụ: ĐINH THANH HIẾU, Y Bluih, A Đôi..."
											className={inputClasses}
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label
													htmlFor="modal-sidebar-relationship"
													className="block text-xs font-bold text-slate-800 dark:text-slate-200"
												>
													Quan hệ <span className="text-rose-500">*</span>
												</label>
												{headStatus && (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700">
														Chủ hộ gia đình
													</span>
												)}
											</div>
											<input
												id="modal-sidebar-relationship"
												list="modal-sidebar-relationships-list"
												type="text"
												required
												autoComplete="off"
												spellCheck={false}
												value={relationship}
												onChange={(e) => handleRelationshipChange(e.target.value)}
												placeholder="Nhập quan hệ gia đình..."
												className={inputClasses}
											/>
											<datalist id="modal-sidebar-relationships-list">
												{CITIZEN_RELATIONSHIPS.map((rel) => (
													<option key={rel} value={rel} />
												))}
											</datalist>
										</div>

										<div>
											<CustomSelect
												id="modal-sidebar-gender"
												value={gender}
												onChange={(val) => setGender(val as Gender)}
												options={["Nam", "Nữ"]}
												label="Giới tính"
												required
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label
													htmlFor="modal-sidebar-dob"
													className="block text-xs font-bold text-slate-800 dark:text-slate-200"
												>
													Ngày sinh (DD/MM/YYYY) <span className="text-rose-500">*</span>
												</label>
												{parsedDobInfo && (
													<span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
														Độ tuổi: {parsedDobInfo.age} tuổi
													</span>
												)}
											</div>
											<input
												id="modal-sidebar-dob"
												type="text"
												required
												autoComplete="off"
												spellCheck={false}
												value={dob}
												onChange={(e) => setDob(e.target.value)}
												placeholder="Ví dụ: 02/05/2015 hoặc 1987"
												className={inputClasses}
											/>
										</div>

										<div>
											<div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
												<div className="flex items-center gap-1.5">
													<label
														htmlFor="modal-sidebar-cccd"
														className="block text-xs font-bold text-slate-800 dark:text-slate-200"
													>
														Số CCCD (12 số)
													</label>
													{isDuplicateCccd && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs border border-rose-700 animate-pulse">
															<AlertCircle className="w-3 h-3" />
															Trùng CCCD
														</span>
													)}
												</div>
												{Boolean(initialMember?.id) &&
													!initialMember?.id?.startsWith("mem-") &&
													Boolean(
														(initialMember?.cccd_last4 &&
															/^\d{4}$/.test(
																String(initialMember.cccd_last4).trim(),
															)) ||
															(initialMember?.cccd &&
																/\d{4}/.test(String(initialMember.cccd)) &&
																!String(initialMember.cccd)
																	.toLowerCase()
																	.includes("có")),
													) &&
													Boolean(cccd.trim()) && (
														<button
															type="button"
															onClick={handleToggleRevealCccd}
															disabled={isRevealingCccd}
															className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60"
														>
															{isRevealingCccd ? (
																<span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
															) : cccd.includes("•") ? (
																<>
																	<Eye className="w-3 h-3" />
																	<span>Xem đầy đủ</span>
																</>
															) : (
																<>
																	<EyeOff className="w-3 h-3" />
																	<span>Ẩn bớt</span>
																</>
															)}
														</button>
													)}
											</div>
											<input
												id="modal-sidebar-cccd"
												type="text"
												maxLength={12}
												autoComplete="off"
												spellCheck={false}
												value={cccd}
												onChange={(e) =>
													setCccd(e.target.value.replace(/\D/g, ""))
												}
												placeholder="12 chữ số (để trống nếu chưa có)"
												className={`${inputClasses} ${
													isDuplicateCccd
														? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
														: ""
												}`}
											/>
											{isDuplicateCccd ? (
												<div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
													<AlertCircle
														className="w-3.5 h-3.5 shrink-0"
														strokeWidth={2}
													/>
													<span>
														Trùng với {duplicateMember?.full_name} (
														{duplicateMember?.relationship || "Thành viên"})
													</span>
												</div>
											) : cleanCccd.length > 0 &&
											  cleanCccd.length < 12 &&
											  cleanCccd.length !== 9 &&
											  !cccd.includes("•") ? (
												<div className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
													Đã nhập {cleanCccd.length}/12 số
												</div>
											) : cleanCccd.length === 12 ? (
												<div className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
													<Check className="w-3.5 h-3.5" strokeWidth={2} />
													<span>CCCD hợp lệ (12 số)</span>
												</div>
											) : null}
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<CustomSelect
												id="modal-sidebar-ethnicity"
												value={ethnicity}
												onChange={(val) => setEthnicity(String(val))}
												options={[...ETHNIC_GROUPS]}
												searchable
												label="Dân tộc"
											/>
										</div>

										<div>
											<CustomSelect
												id="modal-sidebar-religion"
												value={religion}
												onChange={(val) => setReligion(String(val))}
												options={[...RELIGIONS]}
												searchable
												label="Tôn giáo"
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="modal-sidebar-native-place"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Quê quán
										</label>
										<input
											id="modal-sidebar-native-place"
											type="text"
											autoComplete="off"
											spellCheck={false}
											value={nativePlace}
											onChange={(e) => setNativePlace(e.target.value)}
											placeholder="VD: Xã Đăk Hà, Huyện Tu Mơ Rông, Kon Tum..."
											className={inputClasses}
										/>
									</div>
								</div>
							)}

							{activeTab === "career" && (
								<div className="space-y-3.5 animate-in fade-in duration-100">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<label
												htmlFor="modal-sidebar-occupation"
												className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
											>
												Nghề nghiệp
											</label>
											<input
												ref={occupationInputRef}
												id="modal-sidebar-occupation"
												type="text"
												autoComplete="off"
												spellCheck={false}
												value={occupation}
												onChange={(e) => setOccupation(e.target.value)}
												placeholder="VD: Làm nông, Buôn bán, Công nhân, Học sinh..."
												className={inputClasses}
											/>
										</div>

										<div>
											<label
												htmlFor="modal-sidebar-education"
												className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
											>
												Trình độ học vấn
											</label>
											<input
												id="modal-sidebar-education"
												type="text"
												autoComplete="off"
												spellCheck={false}
												value={education}
												onChange={(e) => setEducation(e.target.value)}
												placeholder="VD: 12/12, Đại học, Cao đẳng, Biết chữ..."
												className={inputClasses}
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="modal-sidebar-military-status"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Tình hình thực hiện nghĩa vụ quân sự
										</label>
										<input
											id="modal-sidebar-military-status"
											type="text"
											autoComplete="off"
											spellCheck={false}
											value={militaryStatus}
											onChange={(e) => setMilitaryStatus(e.target.value)}
											placeholder="VD: Đủ điều kiện gọi nhập ngũ, Xuất ngũ 2024, Dân quân tự vệ..."
											className={inputClasses}
										/>
									</div>

									<div>
										<label
											htmlFor="modal-sidebar-notes"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Ghi chú nhân khẩu / Bổ sung
										</label>
										<textarea
											id="modal-sidebar-notes"
											rows={3}
											spellCheck={false}
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											placeholder="Tiền sử, nơi cư trú trước đây, ghi chú chính sách đặc thù..."
											className={`${inputClasses} resize-none`}
										/>
									</div>
								</div>
							)}
						</div>

						<footer className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
							<div>
								{activeTab === "basic" ? (
									<button
										type="button"
										onClick={() => setActiveTab("career")}
										className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
									>
										<span>Mục tiếp theo: Nghề nghiệp</span>
										<ArrowRight className="w-3.5 h-3.5" />
									</button>
								) : (
									<button
										type="button"
										onClick={() => setActiveTab("basic")}
										className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
									>
										<span>← Quay lại: Thông tin cơ bản</span>
									</button>
								)}
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
								>
									Hủy
								</button>
								<button
									type="submit"
									className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer focus:ring-2 focus:ring-emerald-500"
								>
									<Check className="w-4 h-4 mr-0.5" strokeWidth={2} />
									<span>Lưu nhân khẩu</span>
									<span className="text-[10px] opacity-75 font-normal">(Ctrl+Enter)</span>
								</button>
							</div>
						</footer>
					</form>
				</main>
			</div>
		</div>,
		document.body,
	);
};
