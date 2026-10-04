import { useEffect, useRef } from "react";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 phút

export function useInactivityTimeout(
	onTimeout: () => void,
	isEnabled: boolean = true,
) {
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const resetTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		if (isEnabled) {
			timerRef.current = setTimeout(() => {
				console.warn(
					"[Session] Hết thời gian chờ phiên 30 phút không hoạt động -> Tự động đăng xuất.",
				);
				onTimeout();
			}, TIMEOUT_MS);
		}
	};

	useEffect(() => {
		if (!isEnabled) return;

		const events = [
			"mousedown",
			"mousemove",
			"keypress",
			"scroll",
			"touchstart",
		];
		const handleActivity = () => resetTimer();

		events.forEach((evt) => window.addEventListener(evt, handleActivity));
		resetTimer();

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			events.forEach((evt) => window.removeEventListener(evt, handleActivity));
		};
	}, [isEnabled, onTimeout]);
}
