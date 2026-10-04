// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "../useDebounce";

describe("useDebounce Hook", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("trả về giá trị ban đầu ngay lập tức", () => {
		const { result } = renderHook(() => useDebounce("initial", 300));
		expect(result.current).toBe("initial");
	});

	it("giữ nguyên giá trị cũ trước khi hết thời gian debounce delay", () => {
		const { result, rerender } = renderHook(
			({ value, delay }) => useDebounce(value, delay),
			{ initialProps: { value: "initial", delay: 300 } },
		);

		expect(result.current).toBe("initial");

		// Cập nhật prop
		rerender({ value: "updated", delay: 300 });

		// Trôi 150ms (< 300ms)
		act(() => {
			vi.advanceTimersByTime(150);
		});

		expect(result.current).toBe("initial");
	});

	it("cập nhật giá trị mới sau khi debounce delay kết thúc", () => {
		const { result, rerender } = renderHook(
			({ value, delay }) => useDebounce(value, delay),
			{ initialProps: { value: "initial", delay: 300 } },
		);

		rerender({ value: "updated", delay: 300 });

		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current).toBe("updated");
	});

	it("reset lại timer nếu giá trị thay đổi liên tục trong khoảng delay (chống API Flooding)", () => {
		const { result, rerender } = renderHook(
			({ value, delay }) => useDebounce(value, delay),
			{ initialProps: { value: "a", delay: 300 } },
		);

		rerender({ value: "ab", delay: 300 });
		act(() => {
			vi.advanceTimersByTime(150);
		});
		expect(result.current).toBe("a");

		rerender({ value: "abc", delay: 300 });
		act(() => {
			vi.advanceTimersByTime(150);
		});
		expect(result.current).toBe("a");

		act(() => {
			vi.advanceTimersByTime(150);
		});
		expect(result.current).toBe("abc");
	});
});
