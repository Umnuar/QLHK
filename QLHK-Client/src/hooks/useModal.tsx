import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

interface ModalOptions {
	title: string;
	message: string;
	type?: "info" | "warning" | "danger" | "success";
	confirmText?: string;
	cancelText?: string | null;
	onConfirm?: () => Promise<void> | void;
	onCancel?: () => void;
}

interface ModalContextType {
	showModal: (options: ModalOptions) => void;
	hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [modal, setModal] = useState<ModalOptions | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const showModal = useCallback((options: ModalOptions) => {
		setModal(options);
		setIsOpen(true);
	}, []);

	const hideModal = useCallback(() => {
		setIsOpen(false);
		setTimeout(() => setModal(null), 200);
	}, []);

	const handleConfirm = async () => {
		if (modal?.onConfirm) {
			try {
				setIsLoading(true);
				await modal.onConfirm();
				hideModal();
			} catch (error) {
				console.error("Modal action error:", error);
			} finally {
				setIsLoading(false);
			}
		} else {
			hideModal();
		}
	};

	const handleCancel = () => {
		if (modal?.onCancel) modal.onCancel();
		hideModal();
	};

	return (
		<ModalContext.Provider value={{ showModal, hideModal }}>
			{children}
			{isOpen &&
				modal &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
						onClick={(e) => {
							if (e.target === e.currentTarget) handleCancel();
						}}
						role="dialog"
						aria-modal="true"
					>
						<div
							className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden scale-100 transition-all text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-6 flex items-start gap-4">
								<div
									className={`p-3 rounded-2xl shrink-0 ${
										modal.type === "danger"
											? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
											: modal.type === "warning"
												? "bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
												: modal.type === "success"
													? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
													: "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
									}`}
								>
									{modal.type === "danger" || modal.type === "warning" ? (
										<AlertTriangle className="w-6 h-6" />
									) : modal.type === "success" ? (
										<CheckCircle2 className="w-6 h-6" />
									) : (
										<Info className="w-6 h-6" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
										{modal.title}
									</h3>
									<p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
										{modal.message}
									</p>
								</div>
								<button
									type="button"
									onClick={handleCancel}
									aria-label="Đóng hộp thoại"
									className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-xl cursor-pointer"
								>
									<X className="w-5 h-5" strokeWidth={1.5} />
								</button>
							</div>
							<div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex justify-end gap-3">
								{modal.cancelText !== null && (
									<button
										type="button"
										onClick={handleCancel}
										disabled={isLoading}
										className="h-10 px-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
									>
										{modal.cancelText || "Hủy"}
									</button>
								)}
								<button
									type="button"
									onClick={handleConfirm}
									disabled={isLoading}
									className={`h-10 px-5 text-xs font-bold text-white rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer ${
										modal.type === "danger"
											? "bg-rose-600 hover:bg-rose-700"
											: "bg-emerald-600 hover:bg-emerald-700"
									}`}
								>
									{isLoading && (
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									)}
									<span>{modal.confirmText || "Xác nhận"}</span>
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</ModalContext.Provider>
	);
};

export const useModal = () => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error("useModal must be used within a ModalProvider");
	}
	return context;
};
