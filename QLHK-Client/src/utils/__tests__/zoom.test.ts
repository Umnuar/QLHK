import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { initTauriBridge } from "../tauriBridge";

vi.mock("@tauri-apps/api/core", () => ({
	isTauri: vi.fn(),
}));

describe("zoom mechanism via --app-zoom", () => {
	beforeEach(() => {
		document.documentElement.style.removeProperty("--app-zoom");
		document.documentElement.style.zoom = "";
		delete (window as any).electronAPI;
		delete (window as any).api;
	});

	afterEach(() => {
		vi.clearAllMocks();
		document.documentElement.style.removeProperty("--app-zoom");
		document.documentElement.style.zoom = "";
	});

	it("sets --app-zoom CSS variable on documentElement in web environment", async () => {
		vi.mocked(isTauri).mockReturnValue(false);

		initTauriBridge();

		expect(window.electronAPI).toBeDefined();
		expect(window.api?.app?.setZoom).toBeDefined();

		await window.electronAPI!.setZoom(80);
		expect(document.documentElement.style.getPropertyValue("--app-zoom")).toBe("0.8");
		expect(document.documentElement.style.zoom).toBe("");

		await window.electronAPI!.setZoom(120);
		expect(document.documentElement.style.getPropertyValue("--app-zoom")).toBe("1.2");
	});

	it("sets --app-zoom CSS variable in Tauri environment without root transform or CSS zoom", async () => {
		vi.mocked(isTauri).mockReturnValue(true);

		initTauriBridge();

		await window.electronAPI!.setZoom(150);
		expect(document.documentElement.style.getPropertyValue("--app-zoom")).toBe("1.5");
		expect(document.documentElement.style.zoom).toBe("");
	});

	it("clamps zoom level within 50% to 150% range", async () => {
		vi.mocked(isTauri).mockReturnValue(false);

		initTauriBridge();

		await window.electronAPI!.setZoom(30);
		expect(document.documentElement.style.getPropertyValue("--app-zoom")).toBe("0.5");

		await window.electronAPI!.setZoom(200);
		expect(document.documentElement.style.getPropertyValue("--app-zoom")).toBe("1.5");
	});
});
