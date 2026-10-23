import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendSwitcher } from "../BackendSwitcher";

vi.mock("../../../api/client", async () => {
	const actual = await vi.importActual<typeof import("../../../api/client")>(
		"../../../api/client",
	);
	return {
		...actual,
		checkBackendHealth: vi.fn().mockImplementation(async (port: number) => {
			if (port === 5002) return { online: true, latencyMs: 2 };
			return { online: false, latencyMs: -1 };
		}),
	};
});

describe("BackendSwitcher Component", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("render dạng compact chuẩn xác", () => {
		render(<BackendSwitcher variant="compact" />);

		expect(screen.getByText("Node 5002")).toBeDefined();
		expect(screen.getByText("Rust 5012")).toBeDefined();
	});

	it("chuyển đổi cổng khi bấm vào nút trong compact mode", () => {
		render(<BackendSwitcher variant="compact" />);

		const rustBtn = screen.getByTitle("Rust Axum (Cổng 5012 - Hiệu năng cao)");
		fireEvent.click(rustBtn);

		expect(localStorage.getItem("qlhk_backend_port")).toBe("5012");
	});

	it("render dạng card đầy đủ thông tin", () => {
		render(<BackendSwitcher variant="card" />);

		expect(
			screen.getByText(/Cơ Chế Chuyển Đổi Backend Kép/),
		).toBeDefined();
		expect(screen.getByText(/Backend Node.js/)).toBeDefined();
		expect(screen.getByText(/Backend Rust Axum/)).toBeDefined();
		expect(screen.getByText("http://localhost:5002/api")).toBeDefined();
		expect(screen.getByText("http://localhost:5012/api")).toBeDefined();
	});

	it("chuyển đổi cổng khi bấm kích hoạt trong card mode", () => {
		render(<BackendSwitcher variant="card" />);

		const activateRustBtn = screen.getByText("Kích hoạt cổng này");
		fireEvent.click(activateRustBtn);

		expect(localStorage.getItem("qlhk_backend_port")).toBe("5012");
	});
});
