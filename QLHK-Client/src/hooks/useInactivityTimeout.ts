import { useEffect, useRef } from "react";

const TIMEOUT_MS = 30 * 60 * 1000;
const THROTTLE_MS = 2000;

export function useInactivityTimeout(
	onTimeout: () => void,
	isEnabled: boolean = true,
) {
	const savedCallback = useRef(onTimeout);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const lastActivityRef = useRef<number>(Date.now());

	useEffect(() => {
		savedCallback.current = onTimeout;
	}, [onTimeout]);

	useEffect(() => {
		if (!isEnabled) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			return;
		}

		const scheduleTimeout = (delayMs: number) => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				savedCallback.current();
			}, delayMs);
		};

		const handleActivity = () => {
			const now = Date.now();
			if (now - lastActivityRef.current < THROTTLE_MS) {
				return;
			}
			lastActivityRef.current = now;
			scheduleTimeout(TIMEOUT_MS);
		};

		const handleVisibilityChange = () => {
			if (document.hidden) return;
			const elapsed = Date.now() - lastActivityRef.current;
			if (elapsed >= TIMEOUT_MS) {
				savedCallback.current();
			} else {
				scheduleTimeout(TIMEOUT_MS - elapsed);
			}
		};

		const events = [
			"mousedown",
			"keydown",
			"scroll",
			"touchstart",
			"wheel",
		];

		events.forEach((evt) =>
			window.addEventListener(evt, handleActivity, { passive: true }),
		);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		lastActivityRef.current = Date.now();
		scheduleTimeout(TIMEOUT_MS);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			events.forEach((evt) =>
				window.removeEventListener(evt, handleActivity),
			);
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
		};
	}, [isEnabled]);
}
