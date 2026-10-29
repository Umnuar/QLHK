import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type CalculationTarget, YearSelector } from "../YearSelector";

describe("YearSelector Component", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders display label and opens popover on click", () => {
		const onYearChange = vi.fn();
		const onTargetChange = vi.fn();
		const currentYear = new Date().getFullYear();

		render(
			<YearSelector
				year={currentYear}
				onYearChange={onYearChange}
				onTargetChange={onTargetChange}
			/>,
		);

		expect(screen.getByText(`Năm ${currentYear}`)).toBeTruthy();
		expect(screen.queryByRole("dialog")).toBeNull();

		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByText("Theo Ngày")).toBeTruthy();
		expect(screen.getByText("Theo Tháng")).toBeTruthy();
		expect(screen.getByText("Theo Năm")).toBeTruthy();
	});

	it("switches to Theo Tháng and selects month directly without picking day", () => {
		const onYearChange = vi.fn();
		const onTargetChange = vi.fn();

		render(
			<YearSelector
				year={2026}
				onYearChange={onYearChange}
				onTargetChange={onTargetChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByText("Theo Tháng"));

		const mayButton = screen.getByText("Tháng 5");
		expect(mayButton).toBeTruthy();
		fireEvent.click(mayButton);

		expect(onTargetChange).toHaveBeenCalledWith(
			expect.objectContaining({
				precision: "month",
				year: 2026,
				month: 5,
				displayLabel: "Tháng 05/2026",
			}),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("switches to Theo Ngày and selects a specific day", () => {
		const onYearChange = vi.fn();
		const onTargetChange = vi.fn();

		render(
			<YearSelector
				year={2026}
				onYearChange={onYearChange}
				onTargetChange={onTargetChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByText("Theo Ngày"));

		const day15Buttons = screen.getAllByText("15");
		expect(day15Buttons.length).toBeGreaterThanOrEqual(1);
		fireEvent.click(day15Buttons[0]);

		expect(onTargetChange).toHaveBeenCalledWith(
			expect.objectContaining({
				precision: "date",
				year: 2026,
				day: 15,
			}),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("switches to Theo Năm and selects year directly without picking month or day", () => {
		const onYearChange = vi.fn();
		const onTargetChange = vi.fn();

		render(
			<YearSelector
				year={2026}
				onYearChange={onYearChange}
				onTargetChange={onTargetChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button"));
		fireEvent.click(screen.getByText("Theo Năm"));

		const year2028 = screen.getByText("2028");
		expect(year2028).toBeTruthy();
		fireEvent.click(year2028);

		expect(onTargetChange).toHaveBeenCalledWith(
			expect.objectContaining({
				precision: "year",
				year: 2028,
				displayLabel: "Năm 2028",
			}),
		);
		expect(onYearChange).toHaveBeenCalledWith(2028);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("renders custom target display label accurately", () => {
		const customTarget: CalculationTarget = {
			precision: "date",
			year: 2027,
			month: 8,
			day: 19,
			displayLabel: "19/08/2027",
			referenceDate: new Date(2027, 7, 19),
		};

		render(
			<YearSelector
				year={2027}
				target={customTarget}
				onYearChange={vi.fn()}
				onTargetChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("19/08/2027")).toBeTruthy();
	});
});
