import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup sau mỗi bài test để tránh rò rỉ bộ nhớ
afterEach(() => {
	cleanup();
});

// Polyfill window.localStorage trong môi trường test jsdom
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem(key: string): string | null {
			return store[key] ?? null;
		},
		setItem(key: string, value: string): void {
			store[key] = String(value);
		},
		clear(): void {
			store = {};
		},
		removeItem(key: string): void {
			delete store[key];
		},
	};
})();

if (typeof window !== "undefined") {
	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
		writable: true,
	});
}
