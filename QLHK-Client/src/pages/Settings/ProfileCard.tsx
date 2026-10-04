import {
	Eye,
	EyeOff,
	Home,
	KeyRound,
	LogOut,
	MapPin,
	Shield,
	ShieldAlert,
	Trash2,
	User as UserIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../AppContext";
import { authApi } from "../../api/authApi";
import { clearCache } from "../../db/indexedDB";
import { useModal } from "../../hooks/useModal";
import type { User } from "../../types";

interface ProfileCardProps {
	user: User | null;
	setUser?: (user: User | null) => void;
	communeName?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, communeName }) => {
	const { villages, logout } = useApp();
	const { showModal } = useModal();

	const [currentPasswordOwn, setCurrentPasswordOwn] = useState("");
	const [newPasswordOwn, setNewPasswordOwn] = useState("");
	const [confirmPasswordOwn, setConfirmPasswordOwn] = useState("");
	const [showPasswordOwn, setShowPasswordOwn] = useState(false);
	const [loadingOwnPassword, setLoadingOwnPassword] = useState(false);

	const currentVillageName =
		user?.role === "admin"
			? "Toàn xã Đăk Hà"
			: villages.find((v) => v.id === user?.village_id)?.name ||
				"Chưa phân công";

	const userInitials = (user?.username || "AD").slice(0, 2).toUpperCase();

	const handleChangeOwnPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentPasswordOwn.trim()) {
			showModal({
				title: "Cảnh báo",
				message: "Vui lòng nhập mật khẩu hiện tại.",
				type: "warning",
			});
			return;
		}
		if (!newPasswordOwn) {
			showModal({
				title: "Cảnh báo",
				message: "Vui lòng nhập mật khẩu mới.",
				type: "warning",
			});
			return;
		}
		if (newPasswordOwn.length < 6) {
			showModal({
				title: "Mật khẩu yếu",
				message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
				type: "warning",
			});
			return;
		}
		if (newPasswordOwn !== confirmPasswordOwn) {
			showModal({
				title: "Không khớp",
				message: "Mật khẩu xác nhận không trùng khớp.",
				type: "warning",
			});
			return;
		}
		if (!user?.id) return;

		setLoadingOwnPassword(true);
		try {
			await authApi.updatePassword(user.id, newPasswordOwn);
			setCurrentPasswordOwn("");
			setNewPasswordOwn("");
			setConfirmPasswordOwn("");
			showModal({
				title: "Thành công",
				message: "Đổi mật khẩu cá nhân thành công!",
				type: "success",
			});
		} catch (err: any) {
			showModal({
				title: "Lỗi",
				message:
					err.response?.data?.error ||
					err.message ||
					"Không thể đổi mật khẩu cá nhân. Vui lòng thử lại.",
				type: "danger",
			});
		} finally {
			setLoadingOwnPassword(false);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Card 1: Thông tin tài khoản */}
				<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
					<div>
						<div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
							<div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0 shadow-inner">
								{userInitials}
							</div>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
										{user?.username}
									</h3>
									<span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										<span>Hoạt động</span>
									</span>
								</div>
								<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
									{user?.role === "admin"
										? "Quản trị viên Xã (Admin)"
										: "Cán bộ phụ trách Thôn"}
								</p>
							</div>
						</div>

						<div className="mt-5 space-y-3.5 text-xs">
							<div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
								<span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<Shield className="w-3.5 h-3.5 text-slate-400" />
									<span>Vai trò hệ thống:</span>
								</span>
								<span className="font-bold text-slate-900 dark:text-white">
									{user?.role === "admin"
										? "Cán bộ Quản trị Xã"
										: "Cán bộ Cơ sở"}
								</span>
							</div>

							<div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
								<span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<Home className="w-3.5 h-3.5 text-slate-400" />
									<span>Đơn vị công tác:</span>
								</span>
								<span className="font-bold text-slate-900 dark:text-white">
									{communeName || "Ủy ban nhân dân Xã Đăk Hà"}
								</span>
							</div>

							<div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
								<span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<MapPin className="w-3.5 h-3.5 text-slate-400" />
									<span>Địa bàn quản lý:</span>
								</span>
								<span className="font-bold text-emerald-600 dark:text-emerald-400">
									{currentVillageName}
								</span>
							</div>
						</div>
					</div>

					<div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
						<button
							type="button"
							onClick={() => logout()}
							className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
						>
							<LogOut className="w-4 h-4" strokeWidth={1.5} />
							<span>Đăng Xuất Khỏi Hệ Thống</span>
						</button>
					</div>
				</div>

				{/* Card 2: Đổi mật khẩu cá nhân */}
				<form
					onSubmit={handleChangeOwnPassword}
					className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5"
				>
					<div>
						<div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
							<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
								<KeyRound className="w-5 h-5" strokeWidth={1.5} />
							</div>
							<div>
								<h3 className="font-bold text-base text-slate-900 dark:text-white">
									Đổi Mật Khẩu Cá Nhân
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Cập nhật mật khẩu bảo vệ tài khoản của bạn
								</p>
							</div>
						</div>

						<div className="mt-4 space-y-4">
							<div>
								<label
									htmlFor="current-password-own-input"
									className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
								>
									Mật Khẩu Hiện Tại *
								</label>
								<input
									id="current-password-own-input"
									type={showPasswordOwn ? "text" : "password"}
									required
									value={currentPasswordOwn}
									onChange={(e) => setCurrentPasswordOwn(e.target.value)}
									placeholder="Nhập mật khẩu đang dùng"
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>

							<div>
								<label
									htmlFor="new-password-own-input"
									className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
								>
									Mật Khẩu Mới *
								</label>
								<div className="relative">
									<input
										id="new-password-own-input"
										type={showPasswordOwn ? "text" : "password"}
										required
										value={newPasswordOwn}
										onChange={(e) => setNewPasswordOwn(e.target.value)}
										placeholder="Ít nhất 6 ký tự"
										className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
									/>
									<button
										type="button"
										onClick={() => setShowPasswordOwn(!showPasswordOwn)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
										aria-label={
											showPasswordOwn ? "Ẩn mật khẩu" : "Hiện mật khẩu"
										}
									>
										{showPasswordOwn ? (
											<EyeOff className="w-4 h-4" strokeWidth={1.5} />
										) : (
											<Eye className="w-4 h-4" strokeWidth={1.5} />
										)}
									</button>
								</div>
							</div>

							<div>
								<label
									htmlFor="confirm-password-own-input"
									className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
								>
									Xác Nhận Mật Khẩu Mới *
								</label>
								<input
									id="confirm-password-own-input"
									type={showPasswordOwn ? "text" : "password"}
									required
									value={confirmPasswordOwn}
									onChange={(e) => setConfirmPasswordOwn(e.target.value)}
									placeholder="Nhập lại mật khẩu mới"
									className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>
						</div>
					</div>

					<div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
						<button
							type="submit"
							disabled={loadingOwnPassword || !newPasswordOwn}
							className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
						>
							<KeyRound className="w-4 h-4" strokeWidth={1.5} />
							<span>
								{loadingOwnPassword
									? "Đang cập nhật..."
									: "Cập Nhật Mật Khẩu"}
							</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

interface DangerZoneCardProps {
	user: User | null;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = () => {
	const { logout } = useApp();
	const { showModal } = useModal();
	const [isClearing, setIsClearing] = useState(false);

	const handleClearCache = () => {
		showModal({
			title: "Xác nhận xóa bộ nhớ đệm (Cache)",
			message:
				"Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm ngoại tuyến (Offline Cache)?\n\nDữ liệu hiển thị sẽ được đồng bộ lại từ máy chủ trong lần tải trang kế tiếp.",
			type: "warning",
			confirmText: "Xóa Bộ Nhớ Đệm",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					setIsClearing(true);
					await clearCache();
					showModal({
						title: "Đã xóa bộ nhớ đệm",
						message:
							"Toàn bộ cache ngoại tuyến đã được làm sạch thành công. Trang sẽ tự động tải lại.",
						type: "success",
						onConfirm: () => {
							window.location.reload();
						},
					});
				} catch (err: any) {
					showModal({
						title: "Lỗi",
						message: `Không thể xóa cache: ${err.message}`,
						type: "danger",
					});
				} finally {
					setIsClearing(false);
				}
			},
		});
	};

	const handleLogoutConfirm = () => {
		showModal({
			title: "Xác nhận đăng xuất",
			message:
				"Bạn có chắc chắn muốn đăng xuất khỏi tài khoản làm việc hiện tại?",
			type: "warning",
			confirmText: "Đăng Xuất Ngay",
			cancelText: "Hủy",
			onConfirm: async () => {
				await logout();
			},
		});
	};

	return (
		<div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/40 shadow-sm overflow-hidden transition-colors">
			{/* Header */}
			<div className="p-6 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
				<div className="flex items-center">
					<div className="bg-rose-100 text-rose-600 p-2.5 rounded-2xl mr-4 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
						<ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
					</div>
					<div>
						<h3 className="text-base font-black uppercase tracking-tight text-rose-700 dark:text-rose-400">
							Vùng Tác Vụ An Toàn & Phiên Làm Việc (Danger Zone)
						</h3>
						<p className="text-xs font-medium mt-0.5 text-rose-600/70 dark:text-rose-400/70">
							Các thao tác tác động trực tiếp đến phiên làm việc và bộ nhớ đệm
							cục bộ
						</p>
					</div>
				</div>
			</div>

			<div className="p-6 md:p-8 space-y-6">
				{/* Action: Clear Cache */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
					<div>
						<h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
							<Trash2 className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
							<span>Xóa bộ nhớ đệm ngoại tuyến (Offline Cache)</span>
						</h5>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Làm sạch danh sách hộ khẩu lưu tạm trên máy tính này để ép buộc hệ
							thống nạp số liệu mới nhất từ CSDL máy chủ.
						</p>
					</div>
					<button
						type="button"
						onClick={handleClearCache}
						disabled={isClearing}
						className="px-4 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
					>
						{isClearing ? "Đang làm sạch..." : "Xóa Cache"}
					</button>
				</div>

				{/* Action: Logout */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10">
					<div>
						<h5 className="font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2">
							<LogOut className="w-4 h-4 text-rose-600" strokeWidth={1.5} />
							<span>Đăng xuất tài khoản</span>
						</h5>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Kết thúc phiên làm việc hiện tại và thu hồi token xác thực trên
							thiết bị.
						</p>
					</div>
					<button
						type="button"
						onClick={handleLogoutConfirm}
						className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer shrink-0"
					>
						Đăng Xuất
					</button>
				</div>

				{/* Security Note */}
				<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs text-slate-500 dark:text-slate-400">
					<p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
						Hệ sinh thái Dữ liệu Số Xã Đăk Hà — Cơ chế đồng bộ bảo mật:
					</p>
					<p>
						Mọi thông tin sửa đổi hộ khẩu đều được đồng bộ hóa và lưu trữ an
						toàn. Bạn có thể yên tâm xóa cache hoặc đăng xuất mà không ảnh hưởng
						tới dữ liệu gốc trên cơ sở dữ liệu.
					</p>
				</div>
			</div>
		</div>
	);
};
