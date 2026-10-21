import React, { useEffect, useState } from "react";
import type { PolicyProfile } from "../../types/policy";

export interface ChucThoModalProps {
	isOpen: boolean;
	onClose: () => void;
	profile?: PolicyProfile | null;
	onSaved: () => void;
}

export const ChucThoModal: React.FC<ChucThoModalProps> = ({ isOpen, onClose, profile, onSaved }) => {
	const [name, setName] = useState("");
	const [dob, setDob] = useState("");
	const [cccd, setCccd] = useState("");

	useEffect(() => {
		setName(profile?.name || "");
		setDob(profile?.dob || "");
		setCccd(profile?.cccd || "");
	}, [profile, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSaved();
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
				<h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
					{profile ? "Chỉnh sửa hồ sơ Chúc Thọ" : "Thêm hồ sơ Chúc Thọ"}
				</h3>
				<form onSubmit={handleSubmit} className="space-y-3">
					<input type="text" placeholder="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" />
					<input type="text" placeholder="Năm sinh" value={dob} onChange={(e) => setDob(e.target.value)} required className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" />
					<input type="text" placeholder="Số CCCD" value={cccd} onChange={(e) => setCccd(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 text-sm" />
					<div className="flex justify-end gap-2 pt-2">
						<button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Hủy</button>
						<button type="submit" className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Lưu</button>
					</div>
				</form>
			</div>
		</div>
	);
};
