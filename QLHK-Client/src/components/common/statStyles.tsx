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

import type React from "react";
import type { LucideIcon } from "lucide-react";
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
 * Grid 2 panel biểu đồ: 2 cột trên desktop, 1 cột trên màn hình nhỏ, cách nhau 24px
 */
export const STAT_PANEL_GRID_CLASS = "grid grid-cols-1 lg:grid-cols-2 gap-6";

/**
 * Khung vùng cuộn danh sách thanh tiến độ kèm hiệu ứng mờ mép
 */
export const STAT_SCROLL_CONTAINER_CLASS =
	"space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scroll-mask-bottom";

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
	description: string;
	icon: StatIconType;
	badge?: React.ReactNode;
	children: React.ReactNode;
	accentColor?: string;
	className?: string;
}

/**
 * Component Panel biểu đồ dùng chung
 */
export const StatChartPanel: React.FC<StatChartPanelProps> = ({
	title,
	description,
	icon: Icon,
	badge,
	children,
	accentColor = DEFAULT_STAT_ACCENT,
	className = "",
}) => {
	return (
		<div
			className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[460px] ${className}`}
		>
			{/* Tiêu đề = icon nét đơn + tên (đậm vừa, không viết hoa toàn bộ) + mô tả xám bên dưới */}
			<div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
				<div className="min-w-0">
					<h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
						<Icon
							className="w-4 h-4 shrink-0"
							strokeWidth={1.5}
							style={{ color: accentColor }}
						/>
						<span className="truncate">{title}</span>
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal line-clamp-1">
						{description}
					</p>
				</div>
				{badge && <div className="shrink-0">{badge}</div>}
			</div>

			{/* Nội dung bên trong panel */}
			<div className="flex-1 flex flex-col justify-between">{children}</div>
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
			className={`p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 ${className}`}
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
export interface StatDonutItem {
	label: string;
	value: number;
	color: string;
	unit?: string;
}

export interface StatDonutProps {
	items: StatDonutItem[];
	total: number;
	centerValue?: string | number;
	centerLabel?: string;
	className?: string;
}

/**
 * Component Donut SVG chuẩn kích thước ~104px, vòng mảnh, số + nhãn ở giữa, đặt bên trái legend
 */
export const StatDonut: React.FC<StatDonutProps> = ({
	items,
	total,
	centerValue,
	centerLabel,
	className = "",
}) => {
	if (total <= 0) {
		return (
			<div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
				Chưa có số liệu thống kê
			</div>
		);
	}

	// Kích thước vòng mảnh chuẩn 104px
	const size = 104;
	const radius = 42;
	const strokeWidth = 9;
	const circumference = 2 * Math.PI * radius; // ~263.89

	// Đếm số phân khúc có giá trị > 0 để tạo khe hở 2px
	const activeItems = items.filter((it) => it.value > 0);
	const gap = activeItems.length > 1 ? 2 : 0;

	// Tính toán phần bù strokeDashoffset cho từng phân khúc kèm khe 2px
	let accumulatedPercent = 0;
	const segments = items.map((item) => {
		const pct = total > 0 ? (item.value / total) * 100 : 0;
		const arcLen = (pct / 100) * circumference;
		const dashLen = Math.max(0, arcLen - gap);
		const dashArray = `${dashLen} ${circumference}`;
		const dashOffset = -(accumulatedPercent / 100) * circumference;
		accumulatedPercent += pct;
		return {
			...item,
			pct,
			dashArray,
			dashOffset,
		};
	});

	const firstPct = items[0] && total > 0 ? Math.round((items[0].value / total) * 100) : 0;
	const displayCenterValue =
		centerValue !== undefined ? centerValue : `${firstPct}%`;
	const displayCenterLabel =
		centerLabel !== undefined ? centerLabel : items[0]?.label || "";

	return (
		<div className={`flex items-center gap-5 py-1 ${className}`}>
			{/* Vòng Donut ~104px bên trái */}
			<div
				className="relative shrink-0 flex items-center justify-center"
				style={{ width: size, height: size }}
			>
				<svg
					className="-rotate-90"
					style={{ width: size, height: size }}
					viewBox={`0 0 ${size} ${size}`}
					role="img"
					aria-label={`Biểu đồ tỷ lệ ${items.map((i) => i.label).join(", ")}`}
				>
					<title>{`Biểu đồ tỷ lệ ${items.map((i) => i.label).join(", ")}`}</title>
					{/* Vòng nền xám nhạt */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="transparent"
						stroke="currentColor"
						strokeWidth={strokeWidth}
						className="text-slate-100 dark:text-slate-800"
					/>
					{/* Các phân khúc màu kèm khe hở 2px */}
					{segments.map((seg) => (
						<circle
							key={seg.label}
							cx={size / 2}
							cy={size / 2}
							r={radius}
							fill="transparent"
							stroke={seg.color}
							strokeWidth={strokeWidth}
							strokeDasharray={seg.dashArray}
							strokeDashoffset={seg.dashOffset}
							strokeLinecap="butt"
							className="transition-all duration-500"
						/>
					))}
				</svg>

				{/* Số + nhãn ở giữa */}
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
					<span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
						{displayCenterValue}
					</span>
					<span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate max-w-[56px] mt-0.5">
						{displayCenterLabel}
					</span>
				</div>
			</div>

			{/* Danh sách Legend bên phải */}
			<div className="flex-1 space-y-2">
				{items.map((it) => {
					const pct = total > 0 ? Math.round((it.value / total) * 1000) / 10 : 0;
					return (
						<div
							key={it.label}
							className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80"
						>
							<div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-xs">
								<div className="flex items-center gap-2 min-w-0">
									<div
										className="w-2.5 h-2.5 rounded-full shrink-0"
										style={{ backgroundColor: it.color }}
									/>
									<span className="truncate">{it.label}</span>
								</div>
								<span className="tabular-nums font-bold text-xs text-slate-900 dark:text-white shrink-0 ml-1">
									{formatVietnameseNumber(pct)}%
								</span>
							</div>
							<div className="text-slate-500 dark:text-slate-400 font-normal text-xs pl-4.5 mt-0.5 tabular-nums">
								{formatVietnameseNumber(it.value)} {it.unit || "người"}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
