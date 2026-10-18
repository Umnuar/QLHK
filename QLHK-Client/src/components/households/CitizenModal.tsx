import { AlertCircle, Check, Eye, EyeOff, User, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { householdApi } from "../../api/householdApi";
import { ETHNIC_GROUPS, RELIGIONS } from "../../data/constants";
import type { Gender, Person, RelationshipType } from "../../types";
import { maskCccd, validateCccd } from "../../utils/cccd";
import {
	calculateAge,
	formatDobDisplay,
	parseAndValidateDob,
} from "../../utils/date";
import { normalizeUnaccented, splitFullName } from "../../utils/vietnamese";
import { CustomSelect } from "../common/CustomSelect";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface CitizenModalProps {
	isOpen: boolean;
	initialMember?: Partial<Person> | null;
	onClose: () => void;
	onSave: (memberData: Partial<Person>) => void;
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

export const CitizenModal: React.FC<CitizenModalProps> = ({
	isOpen,
	initialMember,
	onClose,
	onSave,
}) => {
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
				console.error("[CitizenModal] Lỗi mở khóa CCCD:", err);
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
		}
	}, [isOpen, initialMember]);

	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});


	if (!isOpen || typeof document === "undefined") return null;

	const handleRelationshipChange = (val: string) => {
		setRelationship(val);
		if (val === "Chủ hộ") {
			setIsHead(true);
		} else {
			setIsHead(false);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmedName = fullName.trim();
		if (!trimmedName) {
			setError("Vui lòng nhập họ và tên nhân khẩu.");
			return;
		}

		let dobFormatted = dob.trim();
		let birthYear = 2000;
		let age = 26;

		const trimmedDob = dob.trim();
		if (!trimmedDob) {
			setError(
				"Vui lòng nhập ngày tháng năm sinh (DD/MM/YYYY, MM/YYYY hoặc YYYY)",
			);
			return;
		}

		const dobVal = parseAndValidateDob(trimmedDob);
		if (!dobVal.isValid) {
			setError(
				dobVal.error ||
					"Ngày tháng năm sinh không hợp lệ (hỗ trợ DD/MM/YYYY, MM/YYYY hoặc YYYY)",
			);
			return;
		}
		dobFormatted = dobVal.formatted || trimmedDob;
		birthYear = dobVal.birthYear ?? 2000;
		age = calculateAge(dobFormatted, new Date().getFullYear());

		const trimmedCccd = cccd.trim();
		const isMasked = trimmedCccd.includes("•") || trimmedCccd.includes("*");
		const hasCccdEntered = Boolean(trimmedCccd) && !trimmedCccd.toLowerCase().includes("chưa có");

		if (hasCccdEntered && !isMasked) {
			const cccdVal = validateCccd(trimmedCccd);
			if (!cccdVal.isValid) {
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
		const headStatus = relationship === "Chủ hộ" || isHead;

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

	const inputClasses =
		"w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500/20";

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-[70] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="citizen-modal-title"
		>
			<div ref={modalRef} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
					<div className="flex items-center gap-2.5">
						<User
							className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
							strokeWidth={1.5}
						/>
						<div>
							<h3
								id="citizen-modal-title"
								className="text-base font-bold text-slate-900 dark:text-slate-100"
							>
								{initialMember
									? "Sửa Thông Tin Nhân Khẩu"
									: "Thêm Nhân Khẩu Mới"}
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Nhập đầy đủ thông tin nhân khẩu thuộc xã Đăk Hà
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng cửa sổ"
						className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					>
						<X strokeWidth={1.5} className="w-5 h-5" />
					</button>
				</div>

				{/* Error Alert */}
				{error && (
					<div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
						<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						<span>{error}</span>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-3.5">
					{/* Hàng 1: Họ và Tên * */}
					<div>
						<label htmlFor="citizen-full-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
							Họ và Tên <span className="text-rose-500">*</span>
						</label>
						<input
							id="citizen-full-name"
							type="text"
							required
							autoFocus
							autoComplete="off"
							spellCheck={false}
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Ví dụ: A Đôi, Y Bluih, Nguyễn Văn A..."
							className={inputClasses}
						/>
					</div>

					{/* Hàng 2: Quan hệ với chủ hộ & Giới tính */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label htmlFor="citizen-relationship" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
								Quan hệ với chủ hộ <span className="text-rose-500">*</span>
							</label>
							<input
								id="citizen-relationship"
								list="citizen-relationships-list"
								type="text"
								required
								autoComplete="off"
								spellCheck={false}
								value={relationship}
								onChange={(e) => handleRelationshipChange(e.target.value)}
								placeholder="Nhập hoặc chọn gợi ý..."
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
								value={gender}
								onChange={(val) => setGender(val as Gender)}
								options={["Nam", "Nữ"]}
								label="Giới tính"
								required
							/>
						</div>
					</div>

					{/* Hàng 3: Ngày tháng năm sinh & Số CCCD */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label htmlFor="citizen-dob" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
								Ngày sinh (DD/MM/YYYY) <span className="text-rose-500">*</span>
							</label>
							<input
								id="citizen-dob"
								type="text"
								required
								autoComplete="off"
								spellCheck={false}
								value={dob}
								onChange={(e) => setDob(e.target.value)}
								placeholder="Ví dụ: 13/12/1987"
								className={inputClasses}
							/>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1.5">
								<label htmlFor="citizen-cccd" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
									Số CCCD (12 số)
								</label>
								{Boolean(initialMember?.id) &&
									!initialMember?.id?.startsWith("mem-") &&
									Boolean(
										(initialMember?.cccd_last4 && /^\d{4}$/.test(String(initialMember.cccd_last4).trim())) ||
										(initialMember?.cccd && /\d{4}/.test(String(initialMember.cccd)) && !String(initialMember.cccd).toLowerCase().includes("có"))
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
								autoComplete="off"
								spellCheck={false}
								value={cccd}
								onChange={(e) => setCccd(e.target.value.replace(/\D/g, ""))}
								placeholder="12 chữ số (để trống nếu chưa có)"
								className={inputClasses}
							/>
						</div>
					</div>

					{/* Hàng 4: Dân tộc & Tôn giáo */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<CustomSelect
								value={ethnicity}
								onChange={(val) => setEthnicity(String(val))}
								options={[...ETHNIC_GROUPS]}
								searchable
								label="Dân tộc"
							/>
						</div>

						<div>
							<CustomSelect
								value={religion}
								onChange={(val) => setReligion(String(val))}
								options={[...RELIGIONS]}
								searchable
								label="Tôn giáo"
							/>
						</div>
					</div>

					{/* Hàng 5: Tình hình thực hiện nghĩa vụ quân sự */}
					<div>
						<label htmlFor="citizen-military-status" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
							Tình hình thực hiện nghĩa vụ quân sự
						</label>
						<input
							id="citizen-military-status"
							type="text"
							autoComplete="off"
							spellCheck={false}
							value={militaryStatus}
							onChange={(e) => setMilitaryStatus(e.target.value)}
							placeholder="VD: Đủ điều kiện gọi nhập ngũ, Bộ đội xuất ngũ năm 2024, Du kích thôn..."
							className={inputClasses}
						/>
					</div>

					{/* Hàng 6: Trình độ học vấn & Nghề nghiệp */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label htmlFor="citizen-education" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
								Trình độ học vấn
							</label>
							<input
								id="citizen-education"
								type="text"
								autoComplete="off"
								spellCheck={false}
								value={education}
								onChange={(e) => setEducation(e.target.value)}
								placeholder="VD: 12/12, Đại học, Cao đẳng, Biết chữ..."
								className={inputClasses}
							/>
						</div>

						<div>
							<label htmlFor="citizen-occupation" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
								Nghề nghiệp
							</label>
							<input
								id="citizen-occupation"
								type="text"
								autoComplete="off"
								spellCheck={false}
								value={occupation}
								onChange={(e) => setOccupation(e.target.value)}
								placeholder="VD: Làm nông, Buôn bán, Công nhân..."
								className={inputClasses}
							/>
						</div>
					</div>

					{/* Hàng 7: Quê quán */}
					<div>
						<label htmlFor="citizen-native-place" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
							Quê quán
						</label>
						<input
							id="citizen-native-place"
							type="text"
							autoComplete="off"
							spellCheck={false}
							value={nativePlace}
							onChange={(e) => setNativePlace(e.target.value)}
							placeholder="VD: Xã Đăk Hà, Huyện Tu Mơ Rông, Kon Tum..."
							className={inputClasses}
						/>
					</div>

					{/* Hàng 8: Ghi chú nhân khẩu */}
					<div>
						<label htmlFor="citizen-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
							Ghi chú nhân khẩu / Nghề nghiệp
						</label>
						<input
							id="citizen-notes"
							type="text"
							autoComplete="off"
							spellCheck={false}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Tiền sử, nơi cư trú trước đây, thông tin bổ sung..."
							className={inputClasses}
						/>
					</div>

					{/* Footer */}
					<div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
						>
							Hủy
						</button>
						<button
							type="submit"
							className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
						>
							<Check className="w-3.5 h-3.5 mr-0.5" strokeWidth={2} />
							<span>Lưu nhân khẩu</span>
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body,
	);
};
