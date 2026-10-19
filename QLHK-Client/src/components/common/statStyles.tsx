/**
 * statStyles.tsx
 * Quy ước và component giao diện thống kê dùng chung cho 3 phân hệ dữ liệu Đăk Hà
 * (Hộ khẩu & Nhân khẩu, Quản lý Nông nghiệp, Chính sách & Chúc thọ).
 *
 * QUY ƯỚC CHUNG:
 * 1. Màu chủ đạo mỗi màn định nghĩa qua --stat-accent (Hộ khẩu: #14b8a6, Nông nghiệp: #22c55e, Chính sách: #8b5cf6).
 * 2. 4 thẻ KPI cùng chiều cao, lưới 4 cột (dưới ~1100px thành 2 cột, mobile 1 cột).
 *    Số lớn màu trắng (dark) / chữ chính (light), KHÔNG font mono, không số nào tô màu, không dòng phụ nào tô màu cả dòng.
 * 3. Panel biểu đồ cùng kiểu khung, tiêu đề = icon nét đơn + tên (đậm vừa) + mô tả xám bên dưới.
 *    Bỏ chữ mono nhỏ góc phải; hai panel cùng hàng cao bằng nhau.
 * 4. Dòng có thanh tiến độ: Mỗi dòng có KHUNG riêng (bo 12px, viền mảnh, nền sáng hơn panel, padding đều, cách nhau 8px).
 *    Trái: tên + (phần trăm xám nhỏ); Phải: giá trị + đơn vị nhỏ xám; Dưới: thanh 6px bo tròn.
 * 5. Donut SVG cùng kích thước (~104px), vòng mảnh, số + nhãn ở giữa, đặt bên trái legend.
 * 6. Bảng so sánh: Chuẩn bảng dùng chung, header trung tính (không chữ tô màu, không nền màu riêng ở ô %), số tabular-nums.
 */

import React, { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { Segment } from "../analytics/DonutChart";
import { formatVietnameseNumber } from "./tableStyles";

/**
 * Kiểu component icon thống kê hỗ trợ LucideIcon
 */
export type StatIconType =
	| LucideIcon
	| React.ComponentType<{
			className?: string;
			strokeWidth?: number | string;
			style?: React.CSSProperties;
	  }>;

/**
 * Màu chủ đạo mặc định cho phân hệ Hộ khẩu & Nhân khẩu
 */
export const DEFAULT_STAT_ACCENT = "#14b8a6"; // Xanh ngọc (teal-500)

/**
 * Bảng màu phân loại danh mục (category colors) độ tương phản cao đạt chuẩn WCAG (>= 3:1)
 * Token cat1..cat5 và other cho biểu đồ thống kê
 */
export const STAT_CATEGORY_COLORS = {
	cat1: "#14b8a6", // Teal - Nhóm 1 (Kinh / Công giáo)
	cat2: "#f59e0b", // Amber - Nhóm 2 (DTTS / Tin lành)
	cat3: "#38bdf8", // Sky - Nhóm 3 (Phật giáo)
	cat4: "#c084fc", // Purple - Nhóm 4 (Tôn giáo khác)
	cat5: "#f472b6", // Pink - Nhóm 5
	other: "#94a3b8", // Slate - Không tôn giáo / Còn lại
};

/**
 * Grid 4 thẻ KPI: 4 cột trên màn hình rộng, 2 cột dưới ~1100px, 1 cột trên mobile
 */
export const STAT_KPI_GRID_CLASS =
	"grid grid-cols-1 sm:grid-cols-2 min-[1100px]:grid-cols-4 gap-4";

/**
 * Grid 2 panel biểu đồ: 2 cột trên desktop, 1 cột trên màn hình nhỏ, cách nhau 16-20px
 */
export const STAT_PANEL_GRID_CLASS = "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5";

/**
 * Khung vùng cuộn danh sách thanh tiến độ kèm hiệu ứng mờ mép
 */
export const STAT_SCROLL_CONTAINER_CLASS =
	"space-y-2 max-h-[200px] sm:max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scroll-mask-bottom";

/**
 * Interface cho Props của thẻ KPI
 */
export interface StatKpiCardProps {
	label: string;
	value: React.ReactNode;
	unit?: string;
	subText?: React.ReactNode;
	icon: StatIconType;
	className?: string;
}

/**
 * Component Thẻ KPI dùng chung
 */
export const StatKpiCard: React.FC<StatKpiCardProps> = ({
	label,
	value,
	unit,
	subText,
	icon: Icon,
	className = "",
}) => {
	return (
		<div
			className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between gap-3 h-full min-h-[110px] ${className}`}
		>
			<div className="flex-1 min-w-0">
				{/* Nhãn chữ hoa nhỏ màu xám */}
				<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
					{label}
				</div>

				{/* Số lớn MÀU TRẮNG (dark) / màu chữ chính (light), font chữ thường + tabular-nums, không mono, không tô màu */}
				<div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-1 flex items-baseline">
					<span>{value}</span>
					{unit && (
						<span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1 shrink-0">
							{unit}
						</span>
					)}
				</div>

				{/* Dòng phụ xám, tối đa 1 dòng, không tô màu cả dòng */}
				{subText && (
					<div className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate mt-1">
						{subText}
					</div>
				)}
			</div>

			{/* Icon nét đơn xám trung tính ở góc phải */}
			<Icon
				className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5"
				strokeWidth={1.5}
			/>
		</div>
	);
};

/**
 * Interface cho Props của Panel biểu đồ
 */
export interface StatChartPanelProps {
	title: string;
	description?: string;
	icon: StatIconType | React.ReactNode;
	badge?: React.ReactNode;
	children: React.ReactNode;
	accentColor?: string;
	className?: string;
}

/**
 * Component Panel biểu đồ dùng chung chuẩn card-shell v0 (1)
 */
export const StatChartPanel: React.FC<StatChartPanelProps> = ({
	title,
	description,
	icon: IconProp,
	badge,
	children,
	accentColor = DEFAULT_STAT_ACCENT,
	className = "",
}) => {
	const renderIcon = () => {
		if (React.isValidElement(IconProp)) return IconProp;
		if (typeof IconProp === "function" || typeof IconProp === "object") {
			const Comp = IconProp as React.ComponentType<{
				className?: string;
				style?: React.CSSProperties;
				strokeWidth?: number | string;
			}>;
			return (
				<Comp
					className="size-4 shrink-0 text-teal-400"
					strokeWidth={1.5}
					style={{ color: accentColor }}
				/>
			);
		}
		return null;
	};

	return (
		<div
			className={`flex flex-col rounded-2xl border border-slate-200 bg-white py-0 text-slate-900 shadow-xs ring-0 transition-colors duration-150 hover:border-slate-300 lg:h-[276px] overflow-hidden dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-none dark:backdrop-blur-md dark:hover:border-slate-700 ${className}`}
		>
			<header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
				<div className="min-w-0">
					<h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
						<span className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true">
							{renderIcon()}
						</span>
						<span className="truncate">{title}</span>
					</h2>
					{description && (
						<p className="sr-only">{description}</p>
					)}
				</div>
				{badge &&
					(typeof badge === "string" ? (
						<span className="shrink-0 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
							{badge}
						</span>
					) : (
						<div className="shrink-0">{badge}</div>
					))}
			</header>

			{/* Nội dung bên trong panel */}
			<div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
				{children}
			</div>
		</div>
	);
};

/**
 * Interface cho Props của Dòng thanh tiến độ
 */
export interface StatBarRowProps {
	label: string;
	value: number;
	total: number;
	unit?: string;
	barColor?: string;
	customPercent?: number;
	className?: string;
}

/**
 * Component Dòng thanh tiến độ (Progress Bar Row) có khung riêng chuẩn
 */
export const StatBarRow: React.FC<StatBarRowProps> = ({
	label,
	value,
	total,
	unit = "người",
	barColor = DEFAULT_STAT_ACCENT,
	customPercent,
	className = "",
}) => {
	const percent =
		customPercent !== undefined
			? customPercent
			: total > 0
				? Math.round((value / total) * 1000) / 10
				: 0;
	const formattedPercent = formatVietnameseNumber(percent);

	return (
		<div
			className={`p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1 ${className}`}
		>
			<div className="flex items-center justify-between text-xs gap-2">
				{/* Trái: tên + phần trăm trong ngoặc xám nhỏ */}
				<div className="flex items-center gap-1.5 min-w-0 truncate">
					<span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] truncate">
						{label}
					</span>
					<span className="text-xs text-slate-400 dark:text-slate-500 font-normal shrink-0">
						({formattedPercent}%)
					</span>
				</div>

				{/* Phải: giá trị + đơn vị nhỏ xám, font tabular-nums */}
				<div className="text-right shrink-0">
					<span className="tabular-nums font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white">
						{formatVietnameseNumber(value)}
					</span>
					{unit && (
						<span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
							{unit}
						</span>
					)}
				</div>
			</div>

			{/* Dưới: thanh cao 6px bo tròn với track nền trống nhìn thấy rõ (~10% trắng dark, xám nhạt light) */}
			<div className="w-full h-1.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
				<div
					className="h-full rounded-full transition-all duration-300"
					style={{
						width: `${Math.min(100, Math.max(0, percent))}%`,
						backgroundColor: barColor,
					}}
				/>
			</div>
		</div>
	);
};

/**
 * Interface cho Props của Donut Chart SVG
 */
const MIN_HIT_LENGTH = 16;

export interface StatDonutItem {
	label: string;
	value: number;
	color: string;
	unit?: string;
}

export interface StatDonutProps {
	items?: StatDonutItem[];
	segments?: Segment[];
	total?: number;
	centerValue?: string | number;
	centerLabel?: string;
	activeId?: string | null;
	onActiveChange?: (id: string | null) => void;
	size?: number;
	stroke?: number;
	gap?: number;
	className?: string;
	ariaLabel?: string;
}

/**
 * Component Donut SVG chuẩn v0 (1): kích thước 176px, MIN_HIT_LENGTH = 16, hit-target vô hình chống trượt
 */
export const StatDonut: React.FC<StatDonutProps> = ({
	items,
	segments: propSegments,
	total: propTotal,
	centerValue,
	centerLabel,
	activeId: propActiveId,
	onActiveChange: propOnActiveChange,
	size = 176,
	stroke = 16,
	gap = 2,
	className = "",
	ariaLabel = "Biểu đồ tỷ lệ",
}) => {
	const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
	const activeId = propActiveId !== undefined ? propActiveId : internalActiveId;
	const onActiveChange = propOnActiveChange || setInternalActiveId;

	const normalizedSegments: Segment[] = useMemo(() => {
		if (propSegments && propSegments.length > 0) return propSegments;
		if (!items || items.length === 0) return [];
		const calcTotal =
			propTotal || items.reduce((sum, it) => sum + it.value, 0) || 1;
		return items.map((it, idx) => ({
			id: it.label || `seg-${idx}`,
			label: it.label,
			count: it.value,
			pct: Math.round((it.value / calcTotal) * 1000) / 10,
			color: it.color,
		}));
	}, [propSegments, items, propTotal]);

	const total = normalizedSegments.reduce((sum, s) => sum + s.pct, 0) || 1;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;

	let consumed = 0;
	const arcs = normalizedSegments.map((segment) => {
		const fraction = segment.pct / total;
		const length = Math.max(fraction * circumference - gap, 0.5);
		const offset = consumed * circumference;
		consumed += fraction;
		return { segment, length, offset };
	});

	const active = normalizedSegments.find((s) => s.id === activeId);
	const displayCenterValue = active
		? `${formatVietnameseNumber(active.pct)}%`
		: centerValue !== undefined
			? String(centerValue)
			: `${normalizedSegments[0]?.pct || 0}%`;
	const displayCenterLabel = active
		? active.label
		: centerLabel !== undefined
			? centerLabel
			: normalizedSegments[0]?.label || "";

	if (normalizedSegments.length === 0) {
		return (
			<div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
				Chưa có số liệu thống kê
			</div>
		);
	}

	return (
		<div
			className={`relative shrink-0 flex items-center justify-center ${className}`}
			style={{ width: size, height: size }}
			role="img"
			aria-label={ariaLabel}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="-rotate-90 overflow-visible"
				aria-hidden="true"
			>
				{/* Vòng nền rãnh tròn */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					className="stroke-slate-100 transition-colors duration-150 dark:stroke-slate-800/40"
				/>

				{/* Vòng SVG hiển thị màu sắc trực quan (pointer-events-none để tránh đè hit area) */}
				{arcs.map(({ segment, length, offset }) => (
					<circle
						key={segment.id}
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke={segment.color}
						strokeWidth={activeId === segment.id ? stroke + 4 : stroke}
						strokeDasharray={`${length} ${circumference - length}`}
						strokeDashoffset={-offset}
						opacity={activeId && activeId !== segment.id ? 0.3 : 1}
						className="pointer-events-none transition-all duration-200"
					/>
				))}

				{/* Vòng Hit-Target vô hình với MIN_HIT_LENGTH = 16 chống trượt hover trên lát cắt nhỏ */}
				{[...arcs]
					.sort((a, b) => b.segment.pct - a.segment.pct)
					.map(({ segment, length, offset }) => {
						const hitLength = Math.max(length, MIN_HIT_LENGTH);
						const hitOffset = offset - (hitLength - length) / 2;
						return (
							<circle
								key={`hit-${segment.id}`}
								cx={size / 2}
								cy={size / 2}
								r={radius}
								fill="none"
								stroke="transparent"
								strokeWidth={stroke + 14}
								strokeDasharray={`${hitLength} ${circumference - hitLength}`}
								strokeDashoffset={-hitOffset}
								pointerEvents="stroke"
								className="cursor-pointer"
								onMouseEnter={() => onActiveChange(segment.id)}
								onMouseLeave={() => onActiveChange(null)}
								onClick={() =>
									onActiveChange(activeId === segment.id ? null : segment.id)
								}
							/>
						);
					})}
			</svg>

			{/* Tâm Donut: số lớn và nhãn tiếng Việt bọc chữ an toàn */}
			<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
				<span className="text-xl font-black leading-none text-slate-900 dark:text-white tabular-nums">
					{displayCenterValue}
				</span>
				<span
					className="mt-1 text-balance break-words text-[10px] font-semibold leading-[1.15] text-slate-600 dark:text-slate-400"
					style={{ maxWidth: Math.max(size - stroke * 2 - 20, 60) }}
				>
					{displayCenterLabel}
				</span>
			</div>
		</div>
	);
};

/**
 * Component Tooltip native zero-dependency
 */
interface TooltipContextType {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextType | null>(null);

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isOpen, setIsOpen] = React.useState(false);
	return (
		<TooltipContext.Provider value={{ isOpen, setIsOpen }}>
			<div className="relative group/tooltip">{children}</div>
		</TooltipContext.Provider>
	);
};

export const TooltipTrigger: React.FC<{
	children: React.ReactNode;
	className?: string;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	onFocus?: () => void;
	onBlur?: () => void;
	tabIndex?: number;
}> = ({
	children,
	className,
	onMouseEnter,
	onMouseLeave,
	onFocus,
	onBlur,
	tabIndex = 0,
}) => {
	const ctx = React.useContext(TooltipContext);
	return (
		<div
			tabIndex={tabIndex}
			className={className}
			onMouseEnter={() => {
				ctx?.setIsOpen(true);
				onMouseEnter?.();
			}}
			onMouseLeave={() => {
				ctx?.setIsOpen(false);
				onMouseLeave?.();
			}}
			onFocus={() => {
				ctx?.setIsOpen(true);
				onFocus?.();
			}}
			onBlur={() => {
				ctx?.setIsOpen(false);
				onBlur?.();
			}}
		>
			{children}
		</div>
	);
};

export const TooltipContent: React.FC<{
	children: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
	className?: string;
}> = ({ children, side = "left", className = "" }) => {
	const ctx = React.useContext(TooltipContext);
	if (!ctx?.isOpen) return null;

	const posClasses =
		side === "left"
			? "right-full mr-2.5 top-1/2 -translate-y-1/2"
			: side === "right"
				? "left-full ml-2.5 top-1/2 -translate-y-1/2"
				: side === "top"
					? "bottom-full mb-2 left-1/2 -translate-x-1/2"
					: "top-full mt-2 left-1/2 -translate-x-1/2";

	return (
		<div
			className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${posClasses} ${className}`}
		>
			{children}
		</div>
	);
};

export { DonutChart } from "../analytics/DonutChart";
export { MicroBar, StatMicroBar } from "../analytics/MicroBar";
export { CardShell } from "../analytics/CardShell";
export { DistributionCard } from "../analytics/DistributionCard";
export { WelfareCard } from "../analytics/WelfareCard";
export { KpiRow } from "../analytics/KpiRow";
