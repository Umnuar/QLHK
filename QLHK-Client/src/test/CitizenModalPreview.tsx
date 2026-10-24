import { Check, Edit3, Plus, Sparkles, User } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Person } from "@/types";
import { CitizenModalWithSidebar } from "./CitizenModalWithSidebar";

export const SAMPLE_CITIZEN_FROM_SCREENSHOT: Partial<Person> = {
	id: "sample-dinh-thanh-hieu",
	full_name: "ĐINH THANH HIẾU",
	last_name: "ĐINH THANH",
	first_name: "HIẾU",
	name_unaccented: "dinh thanh hieu",
	relationship: "Chủ hộ",
	is_head: true,
	gender: "Nam",
	dob: "02/05/2015",
	dob_raw: "02/05/2015",
	dob_formatted: "02/05/2015",
	birth_year: 2015,
	age: 11,
	cccd: "",
	cccd_last4: "",
	cccd_masked: "Chưa có",
	ethnicity: "Giẻ Triêng",
	is_minority: true,
	religion: "Công giáo",
	education: "",
	military_status: "",
	occupation: "",
	native_place: "Xã Đăk Hà, Huyện Tu Mơ Rông, Tỉnh Kon Tum",
	notes: "Công giáo",
};

export const CitizenModalPreview: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [currentMember, setCurrentMember] = useState<Partial<Person>>(
		SAMPLE_CITIZEN_FROM_SCREENSHOT,
	);
	const [savedData, setSavedData] = useState<Partial<Person> | null>(null);

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-emerald-600" />
						<span>Bản Mẫu Thử Nghiệm: Modal Nhân Khẩu Có Sidebar</span>
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						Thiết kế chia đôi 2 phân vùng: Thông tin cơ bản và Nghề nghiệp / Học vấn
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
				>
					<Edit3 className="w-4 h-4" />
					<span>Mở Modal Chỉnh Sửa Mẫu</span>
				</button>
			</div>

			<div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
				<div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
					Dữ liệu nhân khẩu đang chọn
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Họ và tên:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{currentMember.full_name}
						</span>
					</div>
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Quan hệ:</span>
						<span className="font-bold text-amber-600 dark:text-amber-400">
							{currentMember.relationship} {currentMember.is_head && "(Chủ hộ)"}
						</span>
					</div>
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Ngày sinh & Tuổi:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{currentMember.dob} ({currentMember.age} tuổi)
						</span>
					</div>
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Dân tộc:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{currentMember.ethnicity}
						</span>
					</div>
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Tôn giáo:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{currentMember.religion}
						</span>
					</div>
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
						<span className="text-slate-400 block text-[11px]">Ghi chú:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{currentMember.notes || "—"}
						</span>
					</div>
				</div>
			</div>

			{savedData && (
				<div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
					<div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
						<Check className="w-4 h-4 text-emerald-600" />
						<span>Kết quả sau khi bấm Lưu nhân khẩu:</span>
					</div>
					<pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
						{JSON.stringify(savedData, null, 2)}
					</pre>
				</div>
			)}

			<CitizenModalWithSidebar
				isOpen={isOpen}
				initialMember={currentMember}
				onClose={() => setIsOpen(false)}
				onSave={(data) => {
					setCurrentMember((prev) => ({ ...prev, ...data }));
					setSavedData(data);
				}}
			/>
		</div>
	);
};
