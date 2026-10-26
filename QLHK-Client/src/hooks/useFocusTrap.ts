import { useEffect, useRef } from "react";

interface UseFocusTrapOptions {
	isActive: boolean;
	onEscape?: () => void;
	initialFocusRef?: React.RefObject<HTMLElement | null>;
	lockScroll?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
	isActive,
	onEscape,
	initialFocusRef,
	lockScroll = true,
}: UseFocusTrapOptions) {
	const containerRef = useRef<T>(null);
	const previousActiveElement = useRef<HTMLElement | null>(null);
	const onEscapeRef = useRef(onEscape);
	const initialFocusRefRef = useRef(initialFocusRef);

	useEffect(() => {
		onEscapeRef.current = onEscape;
	});

	useEffect(() => {
		initialFocusRefRef.current = initialFocusRef;
	});

	useEffect(() => {
		if (!isActive) return;

		if (typeof document !== "undefined") {
			previousActiveElement.current = document.activeElement as HTMLElement | null;
		}

		const originalOverflow = document.body.style.overflow;
		if (lockScroll) {
			document.body.style.overflow = "hidden";
		}

		const timeoutId = setTimeout(() => {
			if (containerRef.current && containerRef.current.contains(document.activeElement)) {
				return;
			}
			if (initialFocusRefRef.current?.current) {
				initialFocusRefRef.current.current.focus();
			} else if (containerRef.current) {
				const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				);
				const firstFocusable = Array.from(focusableElements).find(
					(el) =>
						!el.hasAttribute("disabled") &&
						el.getAttribute("aria-hidden") !== "true",
				);
				if (firstFocusable) {
					firstFocusable.focus();
				} else {
					containerRef.current.focus();
				}
			}
		}, 30);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && onEscapeRef.current) {
				e.stopPropagation();
				onEscapeRef.current();
				return;
			}

			if (e.key === "Tab" && containerRef.current) {
				const focusableElements = Array.from(
					containerRef.current.querySelectorAll<HTMLElement>(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
					),
				).filter(
					(el) =>
						!el.hasAttribute("disabled") &&
						el.getAttribute("aria-hidden") !== "true",
				);

				if (focusableElements.length === 0) {
					e.preventDefault();
					return;
				}

				const firstElement = focusableElements[0];
				const lastElement = focusableElements[focusableElements.length - 1];

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement.focus();
					}
				} else {
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement.focus();
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener("keydown", handleKeyDown);
			if (lockScroll) {
				document.body.style.overflow = originalOverflow;
			}
			if (
				previousActiveElement.current &&
				typeof previousActiveElement.current.focus === "function"
			) {
				previousActiveElement.current.focus();
			}
		};
	}, [isActive, lockScroll]);

	return containerRef;
}
