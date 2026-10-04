import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	X,
} from "lucide-react";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type ToastType = "success" | "error" | "danger" | "warning" | "info";

export interface ToastOptions {
	id?: string;
	message: string;
	type?: ToastType;
	duration?: number; // default 5000ms
	onUndo?: () => Promise<void> | void;
	undoLabel?: string; // default "Hoàn tác"
	actionKey?: string; // Khi cùng actionKey lặp lại -> thay thế toast cũ
}

export interface ToastItem extends ToastOptions {
	id: string;
	createdAt: number;
	duration: number;
	type: ToastType;
}

export interface ToastContextType {
	showToast: (options: ToastOptions | string) => string;
	dismissToast: (id: string) => void;
	dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastCardProps {
	toast: ToastItem;
	onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
	const [timeLeft, setTimeLeft] = useState(toast.duration);
	const [isPaused, setIsPaused] = useState(false);
	const prefersReducedMotion =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Timer đếm ngược, tự động dừng khi hover hoặc focus
	useEffect(() => {
		if (isPaused) return;

		const interval = 25; // tick 25ms cho thanh progress mượt mà
		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= interval) {
					clearInterval(timer);
					onDismiss(toast.id);
					return 0;
				}
				return prev - interval;
			});
		}, interval);

		return () => clearInterval(timer);
	}, [isPaused, toast.id, onDismiss]);

	const handleUndo = async () => {
		if (toast.onUndo) {
			try {
				await toast.onUndo();
			} catch (err) {
				console.error("[Toast] Lỗi hoàn tác:", err);
			}
		}
		onDismiss(toast.id);
	};

	const renderIcon = () => {
		switch (toast.type) {
			case "success":
				return (
					<CheckCircle2
						className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
						strokeWidth={2}
					/>
				);
			case "error":
			case "danger":
				return (
					<AlertCircle
						className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0"
						strokeWidth={2}
					/>
				);
			case "warning":
				return (
					<AlertTriangle
						className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0"
						strokeWidth={2}
					/>
				);
			case "info":
			default:
				return (
					<Info
						className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0"
						strokeWidth={2}
					/>
				);
		}
	};

	const progressBarColor = (() => {
		switch (toast.type) {
			case "success":
				return "bg-emerald-500";
			case "error":
			case "danger":
				return "bg-rose-500";
			case "warning":
				return "bg-amber-500";
			case "info":
			default:
				return "bg-blue-500";
		}
	})();

	const isError = toast.type === "error" || toast.type === "danger";

	return (
		<div
			role={isError ? "alert" : "status"}
			aria-live={isError ? "assertive" : "polite"}
			className="pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 w-full max-w-[480px] min-w-[320px] px-4 py-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 text-slate-800 dark:text-slate-100"
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocus={() => setIsPaused(true)}
			onBlur={() => setIsPaused(false)}
		>
			{/* Icon trạng thái */}
			<div className="shrink-0">{renderIcon()}</div>

			{/* Nội dung thông báo (tối đa 2 dòng, cắt bằng ...) */}
			<div className="flex-1 min-w-0 pr-1">
				<p className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 break-words">
					{toast.message}
				</p>
			</div>

			{/* Cụm hành động: Hoàn tác (nếu có) và Đóng */}
			<div className="flex items-center gap-1.5 shrink-0">
				{toast.onUndo && (
					<button
						type="button"
						onClick={handleUndo}
						className="h-9 sm:h-9 min-h-[36px] max-sm:min-h-[44px] px-3.5 rounded-xl font-bold text-xs sm:text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 active:scale-95 transition-all cursor-pointer select-none focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
					>
						{toast.undoLabel || "Hoàn tác"}
					</button>
				)}

				<button
					type="button"
					onClick={() => onDismiss(toast.id)}
					aria-label="Đóng thông báo"
					className="w-8 h-8 max-sm:min-h-[44px] max-sm:min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
				>
					<X className="w-4 h-4" strokeWidth={2} />
				</button>
			</div>

			{/* Thanh đếm ngược mảnh ở mép dưới toast (~5s, tạm dừng khi hover/focus, tôn trọng prefers-reduced-motion) */}
			{!prefersReducedMotion && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
					<div
						className={`h-full transition-all duration-75 ${progressBarColor}`}
						style={{ width: `${(timeLeft / toast.duration) * 100}%` }}
					/>
				</div>
			)}
		</div>
	);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const toastsRef = useRef<ToastItem[]>([]);
	toastsRef.current = toasts;

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const dismissAll = useCallback(() => {
		setToasts([]);
	}, []);

	const showToast = useCallback((options: ToastOptions | string): string => {
		const opts: ToastOptions =
			typeof options === "string" ? { message: options } : options;
		const id = opts.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const type: ToastType = opts.type || "success";
		const duration = opts.duration ?? 5000;

		const newToast: ToastItem = {
			...opts,
			id,
			type,
			duration,
			createdAt: Date.now(),
		};

		setToasts((prev) => {
			// Nếu cùng hành động lặp lại (cùng actionKey): thay thế toast cũ
			let updated = prev;
			if (opts.actionKey) {
				updated = updated.filter((t) => t.actionKey !== opts.actionKey);
			}

			// Thêm toast mới và giới hạn tối đa 3 toast (đẩy toast cũ nhất đi)
			const nextList = [...updated, newToast];
			if (nextList.length > 3) {
				return nextList.slice(-3);
			}
			return nextList;
		});

		return id;
	}, []);

	// Bắt phím Escape để đóng toast mới nhất
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && toastsRef.current.length > 0) {
				const latest = toastsRef.current[toastsRef.current.length - 1];
				if (latest) {
					dismissToast(latest.id);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [dismissToast]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			(window as any).__showToast = showToast;
			(window as any).__dismissToast = dismissToast;
			(window as any).__dismissAllToasts = dismissAll;
		}
	}, [showToast, dismissToast, dismissAll]);

	const contextValue = useMemo(
		() => ({
			showToast,
			dismissToast,
			dismissAll,
		}),
		[showToast, dismissToast, dismissAll],
	);

	return (
		<ToastContext.Provider value={contextValue}>
			{children}

			{/* Container thông báo toast chung: Cố định mép dưới, không đè sidebar, z-index 100 */}
			<div
				className="fixed bottom-6 left-4 right-4 sm:left-64 sm:right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none select-none"
				aria-label="Thông báo hệ thống"
			>
				{toasts.map((toast) => (
					<ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
				))}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = (): ToastContextType => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast phải được sử dụng bên trong ToastProvider");
	}
	return context;
};
