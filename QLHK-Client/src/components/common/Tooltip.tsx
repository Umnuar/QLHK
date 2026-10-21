import React, { createContext, useContext, useState } from "react";

interface TooltipContextType {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isOpen, setIsOpen] = useState(false);
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
	onClick?: () => void;
	tabIndex?: number;
}> = ({
	children,
	className,
	onMouseEnter,
	onMouseLeave,
	onFocus,
	onBlur,
	onClick,
	tabIndex = 0,
}) => {
	const ctx = useContext(TooltipContext);
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
			onClick={onClick}
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
	const ctx = useContext(TooltipContext);
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
