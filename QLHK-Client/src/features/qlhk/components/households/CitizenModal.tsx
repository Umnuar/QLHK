import {
	AlertCircle,
	ArrowRight,
	Award,
	Briefcase,
	Check,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
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

export interface CitizenModalProps {
	isOpen: boolean;
	initialMember?: Partial<Person> | null;
	existingMembers?: (Partial<Person> | Person)[];
	onClose: () => void;
	onSave?: (memberData: Partial<Person>) => void;
	readOnly?: boolean;
	zIndex?: number;
}

export type CitizenModalTab = "basic" | "career" | "pension";

export const RETIREMENT_POLICIES = [
	{
		key: "age75plus",
		label: "Đối tượng đủ 75 tuổi trở lên",
		badge: "Tuổi tác",
		desc: "Người cao tuổi từ đủ 75 tuổi trở lên",
	},
	{
		key: "age70to74poor",
		label: "Đối tượng từ 70-74 tuổi thuộc hộ nghèo, cận nghèo",
		badge: "Hộ nghèo",
		desc: "Người cao tuổi 70-74 tuổi thuộc hộ nghèo hoặc cận nghèo",
	},
	{
		key: "bao_tro",
		label: "Bảo trợ",
		badge: "Bảo trợ",
		desc: "Đang hưởng trợ cấp bảo trợ xã hội",
	},
	{
		key: "huu_tri",
		label: "Hưu trí",
		badge: "Hưu trí",
		desc: "Đang hưởng chế độ hưu trí / Lương hưu hàng tháng",
	},
	{
		key: "huu_tuat_bao_hiem",
		label: "Hưu, Tuất Bảo hiểm",
		badge: "Hưu tuất",
		desc: "Đang hưởng chế độ hưu tuất hoặc bảo hiểm",
	},
	{
		key: "nguoi_co_cong",
		label: "Người có công",
		badge: "Ưu đãi",
		desc: "Đang hưởng chế độ chính sách người có công",
	},
] as const;

export function isRetireeOccupation(occ?: string | null): boolean {
	if (!occ) return false;
	const lower = occ.toLowerCase().trim();
	const unacc = normalizeUnaccented(lower);
	return (
		lower.includes("hưu") ||
		unacc.includes("huu") ||
		lower.includes("mất sức") ||
		unacc.includes("mat suc") ||
		lower.includes("bhxh") ||
		lower.includes("nghỉ hưu")
	);
}

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

export const CitizenModal: React.FC<CitizenModalProps> = ({
	isOpen,
	initialMember,
	existingMembers,
	onClose,
	onSave,
	readOnly = false,
	zIndex = 70,
}) => {
	const [isRendered, setIsRendered] = useState(isOpen);
	const [isVisible, setIsVisible] = useState(false);

	const fullNameInputRef = useRef<HTMLInputElement>(null);
	const occupationInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const [activeTab, setActiveTab] = useState<CitizenModalTab>("basic");
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
	const [pensionPolicies, setPensionPolicies] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isRevealingCccd, setIsRevealingCccd] = useState(false);

	const isRetiree = useMemo(() => isRetireeOccupation(occupation), [occupation]);

	useEffect(() => {
		if (isOpen) {
			setIsRendered(true);
			const frameId = requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setIsVisible(true);
				});
			});
			return () => cancelAnimationFrame(frameId);
		} else {
			setIsVisible(false);
			const timer = setTimeout(() => {
				setIsRendered(false);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	const handleTogglePolicy = (key: string) => {
		if (readOnly || !isRetiree) return;
		setPensionPolicies((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		);
	};

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
				const loadedPolicies: string[] = [];
				if (Array.isArray(initialMember.pension_policies)) {
					loadedPolicies.push(...initialMember.pension_policies);
				}
				if ((initialMember.age75plus === true || initialMember.age75plus === "x") && !loadedPolicies.includes("age75plus")) {
					loadedPolicies.push("age75plus");
				}
				if ((initialMember.age70to74poor === true || initialMember.age70to74poor === "x") && !loadedPolicies.includes("age70to74poor")) {
					loadedPolicies.push("age70to74poor");
				}
				if ((initialMember.bao_tro === true || initialMember.bao_tro === "x") && !loadedPolicies.includes("bao_tro")) {
					loadedPolicies.push("bao_tro");
				}
				if ((initialMember.huu_tri === true || initialMember.huu_tri === "x") && !loadedPolicies.includes("huu_tri")) {
					loadedPolicies.push("huu_tri");
				}
				if ((initialMember.huu_tuat_bao_hiem === true || initialMember.huu_tuat_bao_hiem === "x") && !loadedPolicies.includes("huu_tuat_bao_hiem")) {
					loadedPolicies.push("huu_tuat_bao_hiem");
				}
				if ((initialMember.nguoi_co_cong === true || initialMember.nguoi_co_cong === "x") && !loadedPolicies.includes("nguoi_co_cong")) {
					loadedPolicies.push("nguoi_co_cong");
				}
				if (isRetireeOccupation(initialMember.occupation || (initialMember as any).nghe_nghiep) && loadedPolicies.length === 0) {
					loadedPolicies.push("huu_tri");
				}
				setPensionPolicies(loadedPolicies);
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
				setPensionPolicies([]);
			}
			setError(null);
			setActiveTab("basic");

			const timer = setTimeout(() => {
				fullNameInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		} else {
			setError(null);
			setIsRevealingCccd(false);
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
		isActive: isOpen && isVisible,
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

	const handleOccupationChange = (val: string) => {
		setOccupation(val);
		if (!isRetireeOccupation(val) && pensionPolicies.length > 0) {
			setPensionPolicies([]);
		} else if (isRetireeOccupation(val) && pensionPolicies.length === 0) {
			setPensionPolicies(["huu_tri"]);
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
		if (readOnly) {
			onClose();
			return;
		}
		setError(null);

		const trimmedName = fullName.trim().replace(/\s+/g, " ");
		if (!trimmedName) {
			setActiveTab("basic");
			setError("Vui lòng nhập họ và tên nhân khẩu.");
			return;
		}

		if (trimmedName.length < 2) {
			setActiveTab("basic");
			setError("Họ và tên phải có ít nhất 2 ký tự.");
			return;
		}

		if (/\d/.test(trimmedName)) {
			setActiveTab("basic");
			setError("Họ và tên không được chứa chữ số.");
			return;
		}

		if (!/^[a-zA-ZÀ-ỹ\s'.-]+$/u.test(trimmedName)) {
			setActiveTab("basic");
			setError("Họ và tên chỉ được chứa chữ cái và khoảng trắng.");
			return;
		}

		const trimmedRel = relationship.trim().replace(/\s+/g, " ");
		if (!trimmedRel) {
			setActiveTab("basic");
			setError("Vui lòng chọn hoặc nhập quan hệ với chủ hộ.");
			return;
		}

		if (/\d/.test(trimmedRel)) {
			setActiveTab("basic");
			setError("Quan hệ gia đình không được chứa chữ số.");
			return;
		}

		const trimmedDob = dob.trim();
		if (!trimmedDob) {
			setActiveTab("basic");
			setError("Vui lòng nhập ngày tháng năm sinh (DD/MM/YYYY, MM/YYYY hoặc YYYY)");
			return;
		}

		const dobVal = parseAndValidateDob(trimmedDob);
		if (!dobVal.isValid) {
			setActiveTab("basic");
			setError(dobVal.error || "Ngày tháng năm sinh không hợp lệ (hỗ trợ DD/MM/YYYY, MM/YYYY hoặc YYYY).");
			return;
		}

		const dobFormatted = dobVal.formatted || trimmedDob;
		const currentYear = new Date().getFullYear();
		const birthYear = dobVal.birthYear ?? currentYear;

		if (birthYear > currentYear) {
			setActiveTab("basic");
			setError(`Năm sinh không được lớn hơn năm hiện tại (${currentYear}).`);
			return;
		}

		if (dobVal.formatted && dobVal.type === "full") {
			const [d, m, y] = dobVal.formatted.split("/").map(Number);
			const birthDate = new Date(y, m - 1, d);
			const today = new Date();
			today.setHours(23, 59, 59, 999);
			if (birthDate > today) {
				setActiveTab("basic");
				setError("Ngày sinh không được vượt quá ngày hiện tại.");
				return;
			}
		}

		const age = calculateAge(dobFormatted, currentYear);
		if (headStatus && age < 15) {
			setActiveTab("basic");
			setError(`Nhân khẩu là Chủ hộ phải từ đủ 15 tuổi trở lên (hiện tại ${age} tuổi).`);
			return;
		}

		const trimmedCccd = cccd.trim();
		const isMasked = trimmedCccd.includes("•") || trimmedCccd.includes("*");
		const hasCccdEntered = Boolean(trimmedCccd) && !trimmedCccd.toLowerCase().includes("chưa có");

		if (isDuplicateCccd) {
			setActiveTab("basic");
			setError(`Cảnh báo: Trùng CCCD với nhân khẩu "${duplicateMember?.full_name}" trong hộ gia đình.`);
			return;
		}

		if (hasCccdEntered && !isMasked) {
			const cleanDigits = trimmedCccd.replace(/\D/g, "");
			if (cleanDigits.length !== 12 && cleanDigits.length !== 9) {
				setActiveTab("basic");
				setError(`Lỗi số CCCD: Số CCCD/CMND phải gồm đúng 12 chữ số (hoặc 9 chữ số đối với CMND cũ), hiện tại có ${cleanDigits.length} số.`);
				return;
			}

			const cccdVal = validateCccd(cleanDigits);
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

		const finalPolicies = isRetiree || pensionPolicies.length > 0 ? pensionPolicies : [];
		const hasPolicy = (key: string) => finalPolicies.includes(key);

		const memberData: Partial<Person> = {
			...(initialMember || {}),
			id: initialMember?.id || `mem-${Date.now()}`,
			full_name: trimmedName,
			last_name: lastName,
			first_name: firstName,
			name_unaccented: normalizeUnaccented(trimmedName),
			relationship: (headStatus ? "Chủ hộ" : trimmedRel) as RelationshipType,
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
			pension_policies: finalPolicies,
			age75plus: hasPolicy("age75plus"),
			age70to74poor: hasPolicy("age70to74poor"),
			bao_tro: hasPolicy("bao_tro"),
			huu_tri: hasPolicy("huu_tri"),
			huu_tuat_bao_hiem: hasPolicy("huu_tuat_bao_hiem"),
			nguoi_co_cong: hasPolicy("nguoi_co_cong"),
		};

		if (onSave) {
			onSave(memberData);
		}
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if (readOnly) return;
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

	const inputClasses = readOnly
		? "w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed select-text"
		: "w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500";

	return createPortal(
		<div
			className={`fixed inset-0 !m-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 dark:bg-black/70 backdrop-blur-sm select-none transition-opacity duration-200 ease-out ${
				isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
			}`}
			style={{ zIndex }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="citizen-modal-title"
		>
			<div
				ref={modalRef}
				className={`w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden h-[580px] max-h-[92vh] transform transition-all duration-200 ease-out ${
					isVisible
						? "opacity-100 scale-100 translate-y-0"
						: "opacity-0 scale-95 translate-y-2"
				}`}
			>
				<aside className="w-full md:w-20 shrink-0 bg-slate-50/90 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 py-5 px-2 flex flex-row md:flex-col items-center justify-between h-full">
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

							<button
								type="button"
								onClick={() => setActiveTab("pension")}
								aria-label="Hưu trí & Chính sách"
								title="Hưu trí & Chính sách xã hội"
								className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
									activeTab === "pension"
										? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
										: "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								<Award className="w-5 h-5" strokeWidth={activeTab === "pension" ? 2.2 : 1.8} />
								{isRetiree && pensionPolicies.length > 0 && (
									<span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 rounded-full bg-emerald-700 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
										{pensionPolicies.length}
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

				<main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 h-full">
					<header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
						<div>
							<div className="flex items-center gap-2">
								<h3
									id="citizen-modal-title"
									className="text-base font-bold text-slate-900 dark:text-slate-100"
								>
									{readOnly
										? "Xem Thông Tin Nhân Khẩu"
										: initialMember
											? "Sửa Thông Tin Nhân Khẩu"
											: "Thêm Nhân Khẩu Mới"}
								</h3>
								{readOnly ? (
									<span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
										Chỉ xem (Không thể sửa)
									</span>
								) : (
									<span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
										{activeTab === "basic"
											? "Mục 1/3: Thông tin cơ bản"
											: activeTab === "career"
												? "Mục 2/3: Nghề nghiệp & Nghĩa vụ"
												: "Mục 3/3: Hưu trí & Chính sách"}
									</span>
								)}
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
								{readOnly
									? "Dữ liệu nhân khẩu lưu trữ trong thùng rác (chế độ bảo vệ dữ liệu)"
									: activeTab === "basic"
										? "Quản lý nhân thân, số định danh, ngày sinh và quan hệ gia đình"
										: activeTab === "career"
											? "Cập nhật thông tin trình độ văn hóa, nghề nghiệp và thực hiện NVQS"
											: "Quản lý các chế độ chính sách hưu trí và trợ cấp xã hội theo biểu mẫu"}
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
											htmlFor="citizen-full-name"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Họ và Tên {!readOnly && <span className="text-rose-500">*</span>}
										</label>
										<input
											ref={fullNameInputRef}
											id="citizen-full-name"
											type="text"
											required={!readOnly}
											readOnly={readOnly}
											disabled={readOnly}
											autoFocus={!readOnly}
											autoComplete="off"
											spellCheck={false}
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											placeholder={readOnly ? "—" : "Ví dụ: ĐINH THANH HIẾU, Y Bluih, A Đôi..."}
											className={inputClasses}
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label
													htmlFor="citizen-relationship"
													className="block text-xs font-bold text-slate-800 dark:text-slate-200"
												>
													Quan hệ {!readOnly && <span className="text-rose-500">*</span>}
												</label>
												{headStatus && (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700">
														Chủ hộ gia đình
													</span>
												)}
											</div>
											<input
												id="citizen-relationship"
												list="citizen-relationships-list"
												type="text"
												required={!readOnly}
												readOnly={readOnly}
												disabled={readOnly}
												autoComplete="off"
												spellCheck={false}
												value={relationship}
												onChange={(e) => handleRelationshipChange(e.target.value)}
												placeholder={readOnly ? "—" : "Nhập quan hệ gia đình..."}
												className={inputClasses}
											/>
											<datalist id="citizen-relationships-list">
												{CITIZEN_RELATIONSHIPS.map((rel) => (
													<option key={rel} value={rel} />
												))}
											</datalist>
										</div>

										<div>
											<CustomSelect
												id="citizen-gender"
												value={gender}
												onChange={(val) => setGender(val as Gender)}
												options={["Nam", "Nữ"]}
												label="Giới tính"
												required={!readOnly}
												disabled={readOnly}
												className={readOnly ? "!bg-slate-100 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-700 !text-slate-800 dark:!text-slate-200" : ""}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label
													htmlFor="citizen-dob"
													className="block text-xs font-bold text-slate-800 dark:text-slate-200"
												>
													Ngày sinh (DD/MM/YYYY) {!readOnly && <span className="text-rose-500">*</span>}
												</label>
												{parsedDobInfo && (
													<span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
														Độ tuổi: {parsedDobInfo.age} tuổi
													</span>
												)}
											</div>
											<input
												id="citizen-dob"
												type="text"
												required={!readOnly}
												readOnly={readOnly}
												disabled={readOnly}
												autoComplete="off"
												spellCheck={false}
												value={dob}
												onChange={(e) => setDob(e.target.value)}
												placeholder={readOnly ? "—" : "Ví dụ: 02/05/2015 hoặc 1987"}
												className={inputClasses}
											/>
										</div>

										<div>
											<div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
												<div className="flex items-center gap-1.5">
													<label
														htmlFor="citizen-cccd"
														className="block text-xs font-bold text-slate-800 dark:text-slate-200"
													>
														Số CCCD (12 số)
													</label>
													{!readOnly && isDuplicateCccd && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs border border-rose-700 animate-pulse">
															<AlertCircle className="w-3 h-3" />
															Cảnh báo: Trùng CCCD
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
												id="citizen-cccd"
												type="text"
												maxLength={12}
												readOnly={readOnly}
												disabled={readOnly}
												autoComplete="off"
												spellCheck={false}
												value={cccd}
												onChange={(e) =>
													setCccd(e.target.value.replace(/\D/g, ""))
												}
												placeholder={readOnly ? "Chưa có CCCD" : "12 chữ số (để trống nếu chưa có)"}
												className={`${inputClasses} ${
													!readOnly && isDuplicateCccd
														? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
														: ""
												}`}
											/>
											{!readOnly && isDuplicateCccd ? (
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
											) : !readOnly && cleanCccd.length > 0 &&
											  cleanCccd.length < 12 &&
											  !cccd.includes("•") ? (
												<div className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
													Đã nhập {cleanCccd.length}/12 số
												</div>
											) : !readOnly && cleanCccd.length === 12 ? (
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
												id="citizen-ethnicity"
												value={ethnicity}
												onChange={(val) => setEthnicity(String(val))}
												options={[...ETHNIC_GROUPS]}
												searchable={!readOnly}
												label="Dân tộc"
												disabled={readOnly}
												className={readOnly ? "!bg-slate-100 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-700 !text-slate-800 dark:!text-slate-200" : ""}
											/>
										</div>

										<div>
											<CustomSelect
												id="citizen-religion"
												value={religion}
												onChange={(val) => setReligion(String(val))}
												options={[...RELIGIONS]}
												searchable={!readOnly}
												label="Tôn giáo"
												disabled={readOnly}
												className={readOnly ? "!bg-slate-100 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-700 !text-slate-800 dark:!text-slate-200" : ""}
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="citizen-native-place"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Quê quán
										</label>
										<input
											id="citizen-native-place"
											type="text"
											readOnly={readOnly}
											disabled={readOnly}
											autoComplete="off"
											spellCheck={false}
											value={nativePlace}
											onChange={(e) => setNativePlace(e.target.value)}
											placeholder={readOnly ? "—" : "VD: Xã Đăk Hà, Huyện Tu Mơ Rông, Kon Tum..."}
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
												htmlFor="citizen-occupation"
												className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
											>
												Nghề nghiệp
											</label>
											<input
												ref={occupationInputRef}
												id="citizen-occupation"
												type="text"
												readOnly={readOnly}
												disabled={readOnly}
												autoComplete="off"
												spellCheck={false}
												value={occupation}
												onChange={(e) => handleOccupationChange(e.target.value)}
												placeholder={readOnly ? "—" : "VD: Làm nông, Buôn bán, Công nhân, Học sinh..."}
												className={inputClasses}
											/>
										</div>

										<div>
											<label
												htmlFor="citizen-education"
												className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
											>
												Trình độ học vấn
											</label>
											<input
												id="citizen-education"
												type="text"
												readOnly={readOnly}
												disabled={readOnly}
												autoComplete="off"
												spellCheck={false}
												value={education}
												onChange={(e) => setEducation(e.target.value)}
												placeholder={readOnly ? "—" : "VD: 12/12, Đại học, Cao đẳng, Biết chữ..."}
												className={inputClasses}
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="citizen-military-status"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Tình hình thực hiện nghĩa vụ quân sự
										</label>
										<input
											id="citizen-military-status"
											type="text"
											readOnly={readOnly}
											disabled={readOnly}
											autoComplete="off"
											spellCheck={false}
											value={militaryStatus}
											onChange={(e) => setMilitaryStatus(e.target.value)}
											placeholder={readOnly ? "—" : "VD: Đủ điều kiện gọi nhập ngũ, Xuất ngũ 2024, Dân quân tự vệ..."}
											className={inputClasses}
										/>
									</div>

									<div>
										<label
											htmlFor="citizen-notes"
											className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
										>
											Ghi chú nhân khẩu / Bổ sung
										</label>
										<textarea
											id="citizen-notes"
											rows={4}
											readOnly={readOnly}
											disabled={readOnly}
											spellCheck={false}
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											placeholder={readOnly ? "Không có ghi chú" : "Tiền sử, nơi cư trú trước đây, ghi chú chính sách đặc thù..."}
											className={`${inputClasses} resize-none min-h-[110px]`}
										/>
									</div>
								</div>
							)}

							{activeTab === "pension" && (
								<div className="space-y-3.5 animate-in fade-in duration-100">
									{!isRetiree ? (
										<div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
											<div className="flex items-start gap-3">
												<div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
													<Lock className="w-5 h-5" />
												</div>
												<div className="space-y-1 flex-1">
													<h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
														Mục Hưu trí đang bị khóa
													</h4>
													<p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
														Tất cả chính sách tại mục này chỉ áp dụng cho nhân khẩu có nghề nghiệp là <strong>Hưu trí</strong>. Nghề nghiệp hiện tại: <strong>{occupation.trim() || "Chưa khai báo"}</strong>.
													</p>
												</div>
											</div>
										</div>
									) : (
										<div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
											<div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
												<CheckCircle2 className="w-4 h-4" />
											</div>
											<div>
												<h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
													Đã xác thực nghề nghiệp: Hưu trí
												</h4>
												<p className="text-[11px] text-emerald-700 dark:text-emerald-300/90">
													Cán bộ có thể tích chọn các chính sách xã hội và hưu trí mà nhân khẩu đang thụ hưởng theo biểu mẫu.
												</p>
											</div>
										</div>
									)}

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										{RETIREMENT_POLICIES.map((p) => {
											const isChecked = isRetiree && pensionPolicies.includes(p.key);
											return (
												<button
													key={p.key}
													type="button"
													role="checkbox"
													aria-checked={isChecked}
													disabled={readOnly || !isRetiree}
													onClick={() => handleTogglePolicy(p.key)}
													className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
														!isRetiree
															? "opacity-50 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 cursor-not-allowed"
															: isChecked
																? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 shadow-xs cursor-pointer ring-1 ring-emerald-500/30"
																: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
													}`}
												>
													<div
														className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
															isChecked
																? "bg-emerald-600 text-white"
																: "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
														}`}
													>
														{isChecked && <Check className="w-3 h-3 stroke-[3]" />}
													</div>
													<div className="space-y-0.5 flex-1 min-w-0">
														<div className="flex items-center justify-between gap-1.5 flex-wrap">
															<span
																className={`text-xs font-bold truncate ${
																	isChecked
																		? "text-emerald-900 dark:text-emerald-100"
																		: "text-slate-800 dark:text-slate-200"
																}`}
															>
																{p.label}
															</span>
															<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
																{p.badge}
															</span>
														</div>
														<p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
															{p.desc}
														</p>
													</div>
												</button>
											);
										})}
									</div>
								</div>
							)}
						</div>

						<footer className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
							<div className="shrink-0">
								{activeTab === "basic" ? (
									<button
										type="button"
										onClick={() => setActiveTab("career")}
										className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0"
									>
										<span>Nghề nghiệp</span>
										<ArrowRight className="w-3.5 h-3.5 shrink-0" />
									</button>
								) : activeTab === "career" ? (
									<div className="flex items-center gap-1.5 shrink-0">
										<button
											type="button"
											onClick={() => setActiveTab("basic")}
											className="h-9 inline-flex items-center gap-1 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
										>
											<span>← Cơ bản</span>
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("pension")}
											className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0"
										>
											<span>Hưu trí</span>
											<ArrowRight className="w-3.5 h-3.5 shrink-0" />
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setActiveTab("career")}
										className="h-9 inline-flex items-center gap-1 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
									>
										<span>← Nghề nghiệp</span>
									</button>
								)}
							</div>

							<div className="flex items-center gap-2 shrink-0">
								{readOnly ? (
									<button
										type="button"
										onClick={onClose}
										className="h-9 inline-flex items-center justify-center px-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
									>
										Đóng cửa sổ
									</button>
								) : (
									<>
										<button
											type="button"
											onClick={onClose}
											className="h-9 inline-flex items-center justify-center px-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
										>
											Hủy
										</button>
										<button
											type="submit"
											className="h-9 inline-flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer focus:ring-2 focus:ring-emerald-500 whitespace-nowrap shrink-0"
										>
											<Check className="w-4 h-4 mr-0.5 shrink-0" strokeWidth={2} />
											<span>Lưu nhân khẩu</span>
											<span className="text-[10px] opacity-75 font-normal">(Ctrl+Enter)</span>
										</button>
									</>
								)}
							</div>
						</footer>
					</form>
				</main>
			</div>
		</div>,
		document.body,
	);
};
