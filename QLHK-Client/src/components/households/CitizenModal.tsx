import { AlertCircle, Check, User, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			if (initialMember) {
				setFullName(initialMember.full_name || "");
				const rel = initialMember.relationship || "Con đẻ";
				setRelationship(rel);
				setIsHead(initialMember.is_head || rel === "Chủ hộ");
				setGender(initialMember.gender || "Nam");
				setDob(initialMember.dob_raw || initialMember.dob || "");
				setCccd(initialMember.cccd || "");
				setEthnicity(initialMember.ethnicity || "Kinh");
				setReligion(initialMember.religion || "Không");
				setNotes(initialMember.notes || initialMember.occupation || "");
			} else {
				setFullName("");
				setRelationship("Con đẻ");
				setIsHead(false);
				setGender("Nam");
				setDob("");
				setCccd("");
				setEthnicity("Kinh");
				setReligion("Không");
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

		if (cccd.trim()) {
			const cccdVal = validateCccd(cccd.trim());
			if (!cccdVal.isValid) {
				setError(`Lỗi số CCCD: ${cccdVal.error}`);
				return;
			}
		}

		const { lastName, firstName } = splitFullName(trimmedName);
		const isMinority = ethnicity !== "Kinh";
		const cccdLast4 = cccd.trim() ? cccd.trim().slice(-4) : "";
		const cccdMasked = maskCccd(cccd.trim(), false);
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
			cccd: cccd.trim(),
			cccd_last4: cccdLast4,
			cccd_masked: cccdMasked,
			ethnicity,
			is_minority: isMinority,
			religion,
			occupation: notes.trim(),
			notes: notes.trim(),
		};

		onSave(memberData);
		onClose();
	};

	const inputClasses =
		"w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500/20";

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-[70] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="citizen-modal-title"
		>
			<div ref={modalRef} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
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
				<form onSubmit={handleSubmit} className="space-y-3.5">
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
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Ví dụ: A Đôi, Y Bluih, Nguyễn Văn A..."
							className={inputClasses}
						/>
					</div>

					{/* Hàng 2: Quan hệ với chủ hộ & Giới tính */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<CustomSelect
								value={relationship}
								onChange={(val) => handleRelationshipChange(String(val))}
								options={[...CITIZEN_RELATIONSHIPS]}
								searchable
								label="Quan hệ với chủ hộ"
								required
							/>
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
								value={dob}
								onChange={(e) => setDob(e.target.value)}
								placeholder="Ví dụ: 13/12/1987"
								className={inputClasses}
							/>
						</div>

						<div>
							<label htmlFor="citizen-cccd" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
								Số CCCD (12 số)
							</label>
							<input
								id="citizen-cccd"
								type="text"
								maxLength={12}
								value={cccd}
								onChange={(e) => setCccd(e.target.value.replace(/\D/g, ""))}
								placeholder="12 chữ số"
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

					{/* Hàng 5: Ghi chú nhân khẩu */}
					<div>
						<label htmlFor="citizen-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
							Ghi chú nhân khẩu / Nghề nghiệp
						</label>
						<input
							id="citizen-notes"
							type="text"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Nghề nghiệp, tiền sử, nơi làm việc..."
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
