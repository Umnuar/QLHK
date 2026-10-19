import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
	cleanup();
});

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
