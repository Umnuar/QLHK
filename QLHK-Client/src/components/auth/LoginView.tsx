import {
	AlertCircle,
	Eye,
	EyeOff,
	Lock,
	ShieldCheck,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../AppContext";
import { authApi } from "../../api/authApi";
import { secureStorage } from "../../utils/secureStorage";

export const LoginView: React.FC = () => {
	const { setUser, setActiveTab, setSelectedVillageId } = useApp();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim() || !password.trim()) {
			setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const data = await authApi.login({ username: username.trim(), password });
			if (!data?.accessToken || !data?.user) {
				throw new Error("Phản hồi đăng nhập không hợp lệ.");
			}
			await secureStorage.setItem("accessToken", data.accessToken);
			await secureStorage.setItem("refreshToken", data.refreshToken);
			await secureStorage.setItem("user", JSON.stringify(data.user));
			setUser(data.user);
			if (data.user.role === "admin") {
				setSelectedVillageId("");
				setActiveTab("villages");
			} else {
				setSelectedVillageId(data.user.village_id || "");
				setActiveTab("households");
			}
		} catch (err: any) {
			const msg =
				err.response?.data?.error ||
				err.message ||
				"Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc kết nối mạng.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans text-slate-900 dark:text-slate-100 select-none">
			<div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl border-t-4 border-t-emerald-600">
				{/* Header Branding */}
				<div className="text-center mb-8">
					<div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 border-[3px] border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full mx-auto flex items-center justify-center mb-5 shadow-sm">
						<Users className="w-10 h-10" strokeWidth={2.5} />
					</div>
					<h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight mb-1">
						Đăng nhập
					</h1>
					<p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-2">
						QUẢN LÝ HỘ KHẨU & NHÂN KHẨU — XÃ ĐĂK HÀ
					</p>
				</div>

				{/* Error Alert */}
				{error && (
					<div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
						<AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
						<span>{error}</span>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleLogin} className="space-y-5">
					<div>
						<label htmlFor="login-username" className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
							Tên đăng nhập
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
								<Users className="w-5 h-5" />
							</div>
							<input
								id="login-username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="Nhập tài khoản"
								required
								autoFocus
								className="w-full h-12 pl-11 pr-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors font-medium"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="login-password" className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
							Mật khẩu
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
								<Lock className="w-5 h-5" />
							</div>
							<input
								id="login-password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Nhập mật khẩu"
								required
								className="w-full h-12 pl-11 pr-12 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors font-medium"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
								className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
								tabIndex={0}
							>
								{showPassword ? (
									<EyeOff className="w-5 h-5" />
								) : (
									<Eye className="w-5 h-5" />
								)}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full mt-2 h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider text-[13px]"
					>
						{loading ? (
							<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : (
							<span>ĐĂNG NHẬP</span>
						)}
					</button>
				</form>

				<div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
					<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
						<ShieldCheck className="w-4 h-4 text-emerald-500" />
						<span>Bảo mật dữ liệu nhân khẩu - Hộ khẩu</span>
					</p>
				</div>
			</div>
		</div>
	);
};
