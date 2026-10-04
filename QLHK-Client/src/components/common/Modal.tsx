/**
 * Modal.tsx
 * Component Modal dùng chung chuẩn cho toàn bộ hệ thống Đăk Hà.
 * 
 * QUY ƯỚC CHUNG:
 * 1. Lớp phủ (Overlay): Phủ ĐỀU 100% cửa sổ qua createPortal(..., document.body).
 *    Bỏ hoàn toàn backdrop-blur. Màu đặc: light rgba(15,23,42,0.45), dark rgba(0,0,0,0.6).
 * 2. Cấu trúc 3 phần: Tiêu đề (ô icon + tên + mô tả + nút đóng X), Thân cuộn bên trong, Chân cố định.
 * 3. Kích cỡ:
 *    - sm: ~420px (hộp thoại ngắn: xác nhận, phân công thôn)
 *    - md: ~640px (chọn tệp, form đơn)
 *    - lg: ~880px (form nhiều cột)
 *    - xl: min(1200px, 92vw) (bảng xem trước Excel, dữ liệu lớn)
 *    - Chiều cao tối đa: ~85vh.
 * 4. Truy cập (A11y): role="dialog", aria-modal="true", aria-labelledby, khóa focus (useFocusTrap), Esc đóng, vùng bấm >= 44px.
 * 5. Nhãn nút Sentence case: "Hủy", "Quay lại", "Tiếp tục", "Xác nhận"...
 */

import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	size?: ModalSize;
	children: React.ReactNode;
	footer?: React.ReactNode;
	headerExtra?: React.ReactNode;
	closeOnOverlayClick?: boolean;
	className?: string;
	bodyClassName?: string;
	zIndex?: number;
	id?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
	sm: "w-full max-w-[420px]",
	md: "w-full max-w-[670px]",
	lg: "w-full max-w-[880px]",
	xl: "w-full max-w-[min(1200px,92vw)]",
};

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	description,
	icon,
	size = "md",
	children,
	footer,
	headerExtra,
	closeOnOverlayClick = true,
	className = "",
	bodyClassName = "",
	zIndex = 50,
	id: customId,
}) => {
	const autoId = useId();
	const titleId = customId || `modal-title-${autoId}`;

	// Khóa focus trong modal và lắng nghe phím Escape
	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});

	// Khóa cuộn trang nền khi modal đang mở
	useEffect(() => {
		if (!isOpen) return;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 !m-0 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
			style={{ zIndex }}
			onClick={(e) => {
				if (closeOnOverlayClick && e.target === e.currentTarget) {
					onClose();
				}
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
		>
			<div
				ref={modalRef}
				className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 max-h-[85vh] transition-all duration-150 motion-reduce:transition-none relative ${SIZE_CLASSES[size]} ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Top Bar cố định */}
				<div className="p-5 border-b border-slate-200/90 dark:border-slate-800/90 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50 shrink-0 gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						{icon && (
							<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
								{icon}
							</div>
						)}
						<div className="min-w-0 flex-1">
							<h2
								id={titleId}
								className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate"
							>
								{title}
							</h2>
							{description && (
								<p className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
									{description}
								</p>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{headerExtra}
						<button
							type="button"
							onClick={onClose}
							aria-label="Đóng"
							title="Đóng (Esc)"
							className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X className="w-5 h-5" strokeWidth={1.5} />
						</button>
					</div>
				</div>

				{/* Thân cuộn bên trong */}
				<div
					className={`flex-1 overflow-y-auto p-5 sm:p-6 min-h-0 ${bodyClassName}`}
				>
					{children}
				</div>

				{/* Chân cố định nếu có footer */}
				{footer && (
					<div className="p-4 sm:p-5 border-t border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
						{footer}
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
};
