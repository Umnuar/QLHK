import {
	Building2,
	CheckCircle2,
	Database,
	Edit3,
	Eye,
	EyeOff,
	Home,
	Info,
	KeyRound,
	LogOut,
	MapPin,
	Plus,
	RefreshCw,
	Shield,
	Trash2,
	User as UserIcon,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../AppContext";
import { authApi } from "../api/authApi";
import { CustomSelect } from "../components/common/CustomSelect";
import { BackupRestoreTab } from "../components/settings/BackupRestoreTab";
import { ProfileCard } from "./Settings/ProfileCard";
import { TimeCard } from "./Settings/TimeCard";
import { useModal } from "../hooks/useModal";
import type { User } from "../types";

type SettingsTab = "profile" | "users" | "backup" | "system";

const COMMUNE_INFO_KEY = "qlhk_commune_info";

interface CommuneInfo {
	communeName: string;
	districtName: string;
	provinceName: string;
	communePhone: string;
	communeAddress: string;
	communeEmail: string;
}

const DEFAULT_COMMUNE_INFO: CommuneInfo = {
	communeName: "Ủy ban nhân dân Xã Đăk Hà",
	districtName: "Huyện Đăk Hà",
	provinceName: "Tỉnh Kon Tum",
	communePhone: "0260.3822.123",
	communeAddress: "Trung tâm Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum",
	communeEmail: "ubnd.xadakha@kontum.gov.vn",
};

export const SettingsPage: React.FC = () => {
	const { villages, user, setUser } = useApp();
	const { showModal } = useModal();
	const isAdmin = user?.role === "admin";

	const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

	// --- TAB 2: QUẢN LÝ CÁN BỘ THÔN ---
	const [usersList, setUsersList] = useState<User[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);

	// Modal thêm cán bộ
	const [isAddUserOpen, setIsAddUserOpen] = useState(false);
	const [newUsername, setNewUsername] = useState("");
	const [newUserPassword, setNewUserPassword] = useState("");
	const [newUserVillageId, setNewUserVillageId] = useState("");
	const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user");

	// Modal đặt lại mật khẩu cán bộ
	const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
	const [resetPwdValue, setResetPwdValue] = useState("");
	const [showResetPwd, setShowResetPwd] = useState(false);
	const [loadingResetPwd, setLoadingResetPwd] = useState(false);

	// Modal phân công thôn cán bộ
	const [assignUser, setAssignUser] = useState<User | null>(null);
	const [assignVillageId, setAssignVillageId] = useState("");
	const [assignRole, setAssignRole] = useState<"admin" | "user">("user");
	const [loadingAssign, setLoadingAssign] = useState(false);

	// --- TAB 4: THÔNG TIN ĐƠN VỊ & HỆ THỐNG ---
	const [communeInfo, setCommuneInfo] = useState<CommuneInfo>(() => {
		try {
			const saved = localStorage.getItem(COMMUNE_INFO_KEY);
			if (saved) return JSON.parse(saved);
		} catch {
			// ignore
		}
		return DEFAULT_COMMUNE_INFO;
	});
	const [savedCommune, setSavedCommune] = useState(false);

	const fetchUsers = async () => {
		setLoadingUsers(true);
		try {
			const list = await authApi.getUsers();
			setUsersList(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error("Error fetching users", error);
		} finally {
			setLoadingUsers(false);
		}
	};

	useEffect(() => {
		if (activeTab === "users" && isAdmin) {
			fetchUsers();
		}
	}, [activeTab, isAdmin]);

	// Tạo tài khoản cán bộ mới
	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newUsername.trim() || !newUserPassword.trim()) {
			showModal({
				title: "Thiếu thông tin",
				message: "Vui lòng nhập tên đăng nhập và mật khẩu.",
				type: "warning",
			});
			return;
		}
		if (newUserPassword.trim().length < 6) {
			showModal({
				title: "Mật khẩu yếu",
				message: "Mật khẩu phải có ít nhất 6 ký tự.",
				type: "warning",
			});
			return;
		}
		try {
			await authApi.createUser({
				username: newUsername.trim(),
				password: newUserPassword.trim(),
				role: newUserRole,
				village_id:
					newUserRole === "user"
						? newUserVillageId || villages[0]?.id || null
						: null,
			});
			setIsAddUserOpen(false);
			setNewUsername("");
			setNewUserPassword("");
			setNewUserVillageId("");
			setNewUserRole("user");
			fetchUsers();
			showModal({
				title: "Thành công",
				message: "Tạo tài khoản cán bộ thành công.",
				type: "success",
			});
		} catch (err: any) {
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error || err.message || "Không thể tạo tài khoản",
				type: "danger",
			});
		}
	};

	// Đặt lại mật khẩu cán bộ
	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!resetPwdUser || !resetPwdValue.trim()) return;
		if (resetPwdValue.trim().length < 6) {
			showModal({
				title: "Mật khẩu yếu",
				message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
				type: "warning",
			});
			return;
		}
		setLoadingResetPwd(true);
		try {
			await authApi.updatePassword(resetPwdUser.id, resetPwdValue.trim());
			const username = resetPwdUser.username;
			setResetPwdUser(null);
			setResetPwdValue("");
			showModal({
				title: "Thành công",
				message: `Đã đặt lại mật khẩu cho cán bộ "${username}".`,
				type: "success",
			});
		} catch (err: any) {
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error ||
					err.message ||
					"Không thể đặt lại mật khẩu cán bộ",
				type: "danger",
			});
		} finally {
			setLoadingResetPwd(false);
		}
	};

	// Phân công thôn cán bộ
	const handleAssignVillage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!assignUser) return;
		setLoadingAssign(true);
		try {
			await authApi.updateUser(assignUser.id, {
				role: assignRole,
				village_id: assignRole === "user" ? assignVillageId || null : null,
			});
			const updatedUsername = assignUser.username;
			setAssignUser(null);
			fetchUsers();
			showModal({
				title: "Thành công",
				message: `Đã cập nhật phân công công tác cho cán bộ "${updatedUsername}".`,
				type: "success",
			});
		} catch (err: any) {
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error ||
					err.message ||
					"Không thể cập nhật phân công",
				type: "danger",
			});
		} finally {
			setLoadingAssign(false);
		}
	};

	// Xóa tài khoản cán bộ
	const handleDeleteUser = (u: User) => {
		if (u.username === "admin") {
			showModal({
				title: "Không thể xóa",
				message: "Không thể xóa tài khoản Quản trị viên mặc định (admin).",
				type: "warning",
			});
			return;
		}

		if (u.id === user?.id || u.username === user?.username) {
			showModal({
				title: "Không thể xóa",
				message: "Không thể tự xóa tài khoản đang đăng nhập hiện tại.",
				type: "warning",
			});
			return;
		}

		showModal({
			title: "Xác nhận xóa tài khoản",
			message: `Bạn có chắc muốn xóa tài khoản cán bộ "${u.username}" không?\nThao tác này không thể hoàn tác.`,
			type: "danger",
			confirmText: "Xóa Tài Khoản",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await authApi.deleteUser(u.id);
					fetchUsers();
					showModal({
						title: "Thành công",
						message: `Đã xóa tài khoản cán bộ "${u.username}" thành công.`,
						type: "success",
					});
				} catch (err: any) {
					showModal({
						title: "Lỗi",
						message:
							err.response?.data?.error ||
							err.message ||
							"Không thể xóa tài khoản",
						type: "danger",
					});
				}
			},
		});
	};

	// Lưu thông tin đơn vị
	const handleSaveCommune = (e: React.FormEvent) => {
		e.preventDefault();
		try {
			localStorage.setItem(COMMUNE_INFO_KEY, JSON.stringify(communeInfo));
		} catch {
			// ignore
		}
		setSavedCommune(true);
		setTimeout(() => setSavedCommune(false), 3000);
		showModal({
			title: "Đã lưu thông tin",
			message: "Thông tin UBND Xã Đăk Hà đã được cập nhật thành công.",
			type: "success",
		});
	};

	const currentVillageName =
		user?.role === "admin"
			? "Toàn xã Đăk Hà"
			: villages.find((v) => v.id === user?.village_id)?.name ||
				"Chưa phân công";

	return (
		<div className="space-y-6 max-w-5xl mx-auto pb-12 select-none animate-in fade-in">
			{/* 4 Tabs Điều Hướng Chuẩn QLCS */}
			<div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto scrollbar-none w-full max-w-full">
				<button
					type="button"
					onClick={() => setActiveTab("profile")}
					className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
						activeTab === "profile"
							? "bg-emerald-600 text-white shadow-xs"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<UserIcon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
					<span>Tài Khoản Của Tôi</span>
				</button>

				{isAdmin && (
					<button
						type="button"
						onClick={() => setActiveTab("users")}
						className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
							activeTab === "users"
								? "bg-emerald-600 text-white shadow-xs"
								: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
						}`}
					>
						<Users className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						<span>Quản Lý Cán Bộ Thôn</span>
					</button>
				)}

				{isAdmin && (
					<button
						type="button"
						onClick={() => setActiveTab("backup")}
						className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
							activeTab === "backup"
								? "bg-emerald-600 text-white shadow-xs"
								: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
						}`}
					>
						<Database className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						<span>Sao Lưu CSDL</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => setActiveTab("system")}
					className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
						activeTab === "system"
							? "bg-emerald-600 text-white shadow-xs"
							: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					<Building2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
					<span>Thông Tin Đơn Vị & Hệ Thống</span>
				</button>
			</div>

			{/* TAB 1: TÀI KHOẢN CỦA TÔI */}
			{activeTab === "profile" && (
				<ProfileCard
					user={user}
					setUser={setUser}
					communeName={communeInfo.communeName}
				/>
			)}

			{/* TAB 2: QUẢN LÝ CÁN BỘ THÔN (ADMIN) */}
			{activeTab === "users" && isAdmin && (
				<div className="space-y-6">
					<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
								<Users className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
								<span>Danh Sách Tài Khoản Cán Bộ ({usersList.length})</span>
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
								Quản trị tài khoản đăng nhập, phân công địa bàn quản lý thôn và
								đặt lại mật khẩu cán bộ
							</p>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={fetchUsers}
								className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer transition-colors"
								title="Làm mới danh sách"
								aria-label="Làm mới danh sách"
							>
								<RefreshCw
									className={`w-4 h-4 ${loadingUsers ? "animate-spin text-emerald-600" : ""}`}
									strokeWidth={1.5}
								/>
							</button>
							<button
								type="button"
								onClick={() => setIsAddUserOpen(true)}
								className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
							>
								<Plus className="w-4 h-4" strokeWidth={1.5} />
								<span>Thêm Cán Bộ</span>
							</button>
						</div>
					</div>

					{/* Form / Modal thêm cán bộ */}
					{isAddUserOpen && (
						<form
							onSubmit={handleCreateUser}
							className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-emerald-500 shadow-xl space-y-4 animate-in fade-in"
						>
							<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
								<h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
									<Plus
										className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
										strokeWidth={1.5}
									/>
									<span>Thêm Tài Khoản Cán Bộ Mới</span>
								</h4>
								<button
									type="button"
									onClick={() => setIsAddUserOpen(false)}
									className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
									aria-label="Đóng form"
								>
									<X className="w-4 h-4" strokeWidth={1.5} />
								</button>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
										Tên Đăng Nhập *
									</label>
									<input
										type="text"
										required
										value={newUsername}
										onChange={(e) => setNewUsername(e.target.value)}
										placeholder="canbothon1"
										className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
										Mật Khẩu Khởi Tạo *
									</label>
									<input
										type="password"
										required
										value={newUserPassword}
										onChange={(e) => setNewUserPassword(e.target.value)}
										placeholder="Ít nhất 6 ký tự"
										className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
									/>
								</div>
								<div>
									<CustomSelect
										label="Vai trò"
										value={newUserRole}
										onChange={(val) => setNewUserRole(val as any)}
										options={[
											{ value: "user", label: "Cán bộ Thôn (User)" },
											{ value: "admin", label: "Quản trị viên Xã (Admin)" },
										]}
									/>
								</div>
								{newUserRole === "user" && (
									<div>
										<CustomSelect
											label="Phân công Thôn"
											value={newUserVillageId}
											onChange={(val) => setNewUserVillageId(String(val))}
											options={villages.map((v) => ({
												value: v.id,
												label: v.name,
											}))}
											placeholder="Chọn thôn phụ trách"
										/>
									</div>
								)}
							</div>

							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setIsAddUserOpen(false)}
									className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer active:scale-95"
								>
									Hủy
								</button>
								<button
									type="submit"
									className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
								>
									<Plus className="w-4 h-4" strokeWidth={1.5} />
									<span>Tạo Tài Khoản</span>
								</button>
							</div>
						</form>
					)}

					{/* Modal đặt lại mật khẩu cán bộ */}
					{resetPwdUser &&
						typeof document !== "undefined" &&
						createPortal(
							<div
								className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
								onClick={(e) => {
									if (e.target === e.currentTarget) setResetPwdUser(null);
								}}
								role="dialog"
								aria-modal="true"
							>
								<form
									onSubmit={handleResetPassword}
									className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
										<h4 className="text-sm font-bold text-slate-900 dark:text-white">
											Đặt Lại Mật Khẩu Cho:{" "}
											<strong className="text-emerald-600">
												{resetPwdUser.username}
											</strong>
										</h4>
										<button
											type="button"
											onClick={() => setResetPwdUser(null)}
											className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
											aria-label="Đóng modal"
										>
											<X className="w-4 h-4" strokeWidth={1.5} />
										</button>
									</div>
									<div>
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
											Mật Khẩu Mới (ít nhất 6 ký tự)
										</label>
										<div className="relative">
											<input
												type={showResetPwd ? "text" : "password"}
												required
												value={resetPwdValue}
												onChange={(e) => setResetPwdValue(e.target.value)}
												placeholder="Nhập mật khẩu mới..."
												className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
											/>
											<button
												type="button"
												onClick={() => setShowResetPwd(!showResetPwd)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
											>
												{showResetPwd ? (
													<EyeOff className="w-4 h-4" strokeWidth={1.5} />
												) : (
													<Eye className="w-4 h-4" strokeWidth={1.5} />
												)}
											</button>
										</div>
									</div>
									<div className="flex justify-end gap-2 pt-2">
										<button
											type="button"
											onClick={() => setResetPwdUser(null)}
											className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer active:scale-95"
										>
											Hủy
										</button>
										<button
											type="submit"
											disabled={loadingResetPwd}
											className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
										>
											{loadingResetPwd ? "Đang lưu..." : "Lưu Mật Khẩu"}
										</button>
									</div>
								</form>
							</div>,
							document.body,
						)}

					{/* Modal phân công thôn cán bộ */}
					{assignUser &&
						typeof document !== "undefined" &&
						createPortal(
							<div
								className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
								onClick={(e) => {
									if (e.target === e.currentTarget) setAssignUser(null);
								}}
								role="dialog"
								aria-modal="true"
							>
								<form
									onSubmit={handleAssignVillage}
									className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
										<h4 className="text-sm font-bold text-slate-900 dark:text-white">
											Phân Công Thôn Cho:{" "}
											<strong className="text-emerald-600">
												{assignUser.username}
											</strong>
										</h4>
										<button
											type="button"
											onClick={() => setAssignUser(null)}
											className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
											aria-label="Đóng modal"
										>
											<X className="w-4 h-4" strokeWidth={1.5} />
										</button>
									</div>
									<div className="space-y-3">
										<div>
											<CustomSelect
												label="Vai trò"
												value={assignRole}
												onChange={(val) => setAssignRole(val as any)}
												options={[
													{ value: "user", label: "Cán bộ Thôn (User)" },
													{ value: "admin", label: "Quản trị viên Xã (Admin)" },
												]}
											/>
										</div>
										{assignRole === "user" && (
											<div>
												<CustomSelect
													label="Thôn Phụ Trách"
													value={assignVillageId}
													onChange={(val) => setAssignVillageId(String(val))}
													options={villages.map((v) => ({
														value: v.id,
														label: v.name,
													}))}
													placeholder="Chọn thôn"
												/>
											</div>
										)}
									</div>
									<div className="flex justify-end gap-2 pt-2">
										<button
											type="button"
											onClick={() => setAssignUser(null)}
											className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer active:scale-95"
										>
											Hủy
										</button>
										<button
											type="submit"
											disabled={loadingAssign}
											className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
										>
											{loadingAssign ? "Đang lưu..." : "Lưu Phân Công"}
										</button>
									</div>
								</form>
							</div>,
							document.body,
						)}

					{/* Bảng danh sách cán bộ */}
					<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-xs text-left border-separate border-spacing-0 whitespace-nowrap">
								<thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
									<tr>
										<th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
											Tài Khoản
										</th>
										<th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
											Vai Trò
										</th>
										<th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
											Địa Bàn Phụ Trách
										</th>
										<th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
											Trạng Thái
										</th>
										<th className="px-4 py-3 text-right border-b border-slate-200 dark:border-slate-800">
											Hành Động
										</th>
									</tr>
								</thead>
								<tbody className="font-medium">
									{usersList.map((u) => {
										const villageName =
											villages.find((v) => v.id === u.village_id)?.name ||
											(u.role === "admin"
												? "Toàn xã Đăk Hà"
												: "Chưa phân công");
										const isOnline = u.is_online ?? true;
										return (
											<tr
												key={u.id}
												className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
											>
												<td className="px-4 py-3 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
													<div className="flex items-center gap-2">
														<div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700">
															{u.username.slice(0, 2).toUpperCase()}
														</div>
														<span>{u.username}</span>
													</div>
												</td>
												<td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
													<span
														className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
															u.role === "admin"
																? "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
																: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
														}`}
													>
														{u.role === "admin" ? "Admin Xã" : "Cán bộ thôn"}
													</span>
												</td>
												<td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800">
													{villageName}
												</td>
												<td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
													<div className="flex items-center gap-1.5">
														<span
															className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
														></span>
														<span className="text-[11px] text-slate-500 dark:text-slate-400">
															{isOnline ? "Hoạt động" : "Ngoại tuyến"}
														</span>
													</div>
												</td>
												<td className="px-4 py-3 text-right border-b border-slate-100 dark:border-slate-800">
													<div className="flex items-center justify-end gap-1.5">
														<button
															type="button"
															onClick={() => {
																setAssignUser(u);
																setAssignRole(u.role);
																setAssignVillageId(u.village_id || "");
															}}
															className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
															title="Phân công thôn"
															aria-label={`Phân công thôn cho ${u.username}`}
														>
															<Edit3
																className="w-3.5 h-3.5"
																strokeWidth={1.5}
															/>
														</button>
														<button
															type="button"
															onClick={() => {
																setResetPwdUser(u);
																setResetPwdValue("");
															}}
															className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
															title="Đổi mật khẩu cán bộ"
															aria-label={`Đổi mật khẩu cho ${u.username}`}
														>
															<KeyRound
																className="w-3.5 h-3.5"
																strokeWidth={1.5}
															/>
														</button>
														<button
															type="button"
															onClick={() => handleDeleteUser(u)}
															disabled={
																u.id === user?.id || u.username === "admin"
															}
															className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
															title="Xóa tài khoản"
															aria-label={`Xóa tài khoản ${u.username}`}
														>
															<Trash2
																className="w-3.5 h-3.5"
																strokeWidth={1.5}
															/>
														</button>
													</div>
												</td>
											</tr>
										);
									})}
									{usersList.length === 0 && (
										<tr>
											<td
												colSpan={5}
												className="px-4 py-8 text-center text-slate-400"
											>
												Chưa có tài khoản cán bộ nào
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* TAB 3: SAO LƯU CSDL (ADMIN) */}
			{activeTab === "backup" && isAdmin && (
				<div className="space-y-6">
					<BackupRestoreTab />
				</div>
			)}

			{/* TAB 4: THÔNG TIN ĐƠN VỊ & HỆ THỐNG */}
			{activeTab === "system" && (
				<div className="space-y-6">
					<TimeCard />

					{/* Card 1: Thông Tin Đơn Vị Hành Chính */}
					<form
						onSubmit={handleSaveCommune}
						className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
					>
						<div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
									<Building2 className="w-5 h-5" strokeWidth={1.5} />
								</div>
								<div>
									<h3 className="font-black text-slate-900 dark:text-white text-base">
										Thông Tin Đơn Vị Hành Chính
									</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
										Xuất hiện trên tiêu đề báo cáo, biểu mẫu Excel và thống kê
										chính thức
									</p>
								</div>
							</div>
							{savedCommune && (
								<span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
									<CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
									<span>Đã lưu thành công</span>
								</span>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Tên Đơn Vị Cấp Xã *
								</label>
								<input
									type="text"
									required
									value={communeInfo.communeName}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											communeName: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Huyện Quản Lý *
								</label>
								<input
									type="text"
									required
									value={communeInfo.districtName}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											districtName: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Tỉnh / Thành Phố *
								</label>
								<input
									type="text"
									required
									value={communeInfo.provinceName}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											provinceName: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Điện Thoại Trực Ban
								</label>
								<input
									type="text"
									value={communeInfo.communePhone}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											communePhone: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Trụ Sở Làm Việc
								</label>
								<input
									type="text"
									value={communeInfo.communeAddress}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											communeAddress: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
									Hòm Thư Điện Tử (Email)
								</label>
								<input
									type="email"
									value={communeInfo.communeEmail}
									onChange={(e) =>
										setCommuneInfo({
											...communeInfo,
											communeEmail: e.target.value,
										})
									}
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>
						</div>

						{isAdmin && (
							<div className="pt-3 flex justify-end">
								<button
									type="submit"
									className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
								>
									Lưu Thay Đổi
								</button>
							</div>
						)}
					</form>

					{/* Card 2: Thông Tin Phần Mềm QLHK */}
					<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
						<div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
							<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
								<Info className="w-5 h-5" strokeWidth={1.5} />
							</div>
							<div>
								<h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
									Thông Tin Phần Mềm QLHK Xã Đăk Hà
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Chuẩn hóa giao diện & kiến trúc vận hành theo quy chuẩn Doanh
									nghiệp QLCS
								</p>
							</div>
						</div>

						<div className="space-y-2.5 text-xs">
							<div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span className="text-slate-500 dark:text-slate-400">
									Tên hệ thống:
								</span>
								<span className="font-bold text-slate-900 dark:text-white">
									Hệ Thống Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà
								</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span className="text-slate-500 dark:text-slate-400">
									Mã phần mềm:
								</span>
								<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
									QLHK-DAKHA
								</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span className="text-slate-500 dark:text-slate-400">
									Phiên bản phát hành:
								</span>
								<span className="font-mono font-bold text-slate-800 dark:text-slate-200">
									v1.0.0 (Production Stable Edition)
								</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span className="text-slate-500 dark:text-slate-400">
									Đơn vị triển khai:
								</span>
								<span className="font-bold text-slate-900 dark:text-white">
									Ủy Ban Nhân Dân Xã Đăk Hà, Tỉnh Kon Tum
								</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span className="text-slate-500 dark:text-slate-400">
									Công nghệ nền tảng:
								</span>
								<span className="font-mono text-slate-600 dark:text-slate-300">
									Vite 5 • React 18 • Tailwind CSS • Electron
								</span>
							</div>
							<div className="flex items-center justify-between py-1.5">
								<span className="text-slate-500 dark:text-slate-400">
									Bản quyền & Vận hành:
								</span>
								<span className="font-medium text-slate-600 dark:text-slate-400">
									© 2026 UBND Xã Đăk Hà. Toàn quyền bảo lưu.
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SettingsPage;
