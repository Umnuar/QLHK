import { expect, type Page, type Request, type Response } from "@playwright/test";

export interface HttpErrorRecord {
	method: string;
	url: string;
	status: number;
	statusText: string;
	body: string;
	timestamp: string;
	lastAction: string;
}

export interface NetworkErrorRecord {
	method: string;
	url: string;
	errorText: string;
	timestamp: string;
	lastAction: string;
}

export interface ConsoleErrorRecord {
	text: string;
	location?: string;
	timestamp: string;
	lastAction: string;
}

export interface PageErrorRecord {
	name: string;
	message: string;
	stack?: string;
	timestamp: string;
	lastAction: string;
}

export class NetworkErrorTrapGuardian {
	private readonly httpErrors: HttpErrorRecord[] = [];
	private readonly networkErrors: NetworkErrorRecord[] = [];
	private readonly consoleErrors: ConsoleErrorRecord[] = [];
	private readonly pageErrors: PageErrorRecord[] = [];
	private actionProvider: () => string = () => "Chưa xác định hành động";

	public setActionProvider(provider: () => string): void {
		this.actionProvider = provider;
	}

	private getCurrentTimestamp(): string {
		return new Date().toLocaleTimeString("vi-VN", { hour12: false });
	}

	private isTargetBackendUrl(url: string): boolean {
		if (
			url.includes("favicon.ico") ||
			url.includes("chrome-extension://") ||
			url.includes("fonts.googleapis.com") ||
			url.includes("fonts.gstatic.com") ||
			url.includes("@vite") ||
			url.includes("@fs")
		) {
			return false;
		}

		return (
			url.includes(":5002") ||
			url.includes(":5012") ||
			url.includes("/api/") ||
			/localhost:(5002|5012)/.test(url) ||
			/127\.0\.0\.1:(5002|5012)/.test(url)
		);
	}

	private isIgnoredConsoleError(text: string): boolean {
		return (
			text.includes("favicon.ico") ||
			text.includes("chrome-extension://") ||
			text.includes("fonts.googleapis.com") ||
			text.includes("fonts.gstatic.com") ||
			text.includes("vite:react-babel") ||
			text.includes("[vite]") ||
			text.startsWith("Warning: ") ||
			text.includes("Download the React DevTools")
		);
	}

	private isIgnoredNetworkFailure(errorText: string): boolean {
		return (
			errorText.includes("net::ERR_ABORTED") ||
			errorText.includes("Request was aborted") ||
			errorText.includes("AbortError") ||
			errorText.includes("NS_BINDING_ABORTED") ||
			errorText.includes("canceled")
		);
	}

	public setupListeners(page: Page, actionProvider?: () => string): void {
		if (actionProvider) {
			this.actionProvider = actionProvider;
		}

		page.on("response", async (response: Response) => {
			const url = response.url();
			if (!this.isTargetBackendUrl(url)) {
				return;
			}

			const status = response.status();
			if (status >= 400) {
				let body = "";
				try {
					body = await response.text();
				} catch {
					body = "[Không thể trích xuất body response]";
				}

				const record: HttpErrorRecord = {
					method: response.request().method(),
					url,
					status,
					statusText: response.statusText(),
					body: body.slice(0, 1000),
					timestamp: this.getCurrentTimestamp(),
					lastAction: this.actionProvider(),
				};

				this.httpErrors.push(record);

				console.error(
					`\n🚨 [HTTP ERROR ${record.status} ${record.statusText}] ${record.method} ${record.url}\n` +
					`   ⏱️ Thời điểm: ${record.timestamp}\n` +
					`   🎯 Hành động: ${record.lastAction}\n` +
					`   📦 Response Body: ${record.body}\n`
				);
			}
		});

		page.on("requestfailed", (request: Request) => {
			const url = request.url();
			if (!this.isTargetBackendUrl(url)) {
				return;
			}

			const failure = request.failure();
			const errorText = failure?.errorText || "Lỗi mạng không xác định";

			if (this.isIgnoredNetworkFailure(errorText)) {
				return;
			}

			const record: NetworkErrorRecord = {
				method: request.method(),
				url,
				errorText,
				timestamp: this.getCurrentTimestamp(),
				lastAction: this.actionProvider(),
			};

			this.networkErrors.push(record);

			console.error(
				`\n🚨 [NETWORK FAILED] ${record.method} ${record.url}\n` +
				`   ⏱️ Thời điểm: ${record.timestamp}\n` +
				`   🎯 Hành động: ${record.lastAction}\n` +
				`   ⚠️ Chi tiết lỗi: ${record.errorText}\n`
			);
		});

		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				if (this.isIgnoredConsoleError(text)) {
					return;
				}

				const location = msg.location();
				const locationString = location
					? `${location.url}:${location.lineNumber}:${location.columnNumber}`
					: undefined;

				const record: ConsoleErrorRecord = {
					text: text.slice(0, 1000),
					location: locationString,
					timestamp: this.getCurrentTimestamp(),
					lastAction: this.actionProvider(),
				};

				this.consoleErrors.push(record);

				console.error(
					`\n🚨 [CONSOLE ERROR] ${record.text}\n` +
					`   ⏱️ Thời điểm: ${record.timestamp}\n` +
					`   🎯 Hành động: ${record.lastAction}\n` +
					(locationString ? `   📍 Vị trí: ${locationString}\n` : "")
				);
			}
		});

		page.on("pageerror", (err: Error) => {
			const record: PageErrorRecord = {
				name: err.name,
				message: err.message,
				stack: err.stack?.slice(0, 1000),
				timestamp: this.getCurrentTimestamp(),
				lastAction: this.actionProvider(),
			};

			this.pageErrors.push(record);

			console.error(
				`\n🚨 [PAGE UNHANDLED ERROR] ${record.name}: ${record.message}\n` +
				`   ⏱️ Thời điểm: ${record.timestamp}\n` +
				`   🎯 Hành động: ${record.lastAction}\n` +
				(record.stack ? `   📍 Stack: ${record.stack}\n` : "")
			);
		});
	}

	public getHttpErrors(): readonly HttpErrorRecord[] {
		return this.httpErrors;
	}

	public getNetworkErrors(): readonly NetworkErrorRecord[] {
		return this.networkErrors;
	}

	public getCombinedApiErrors(): {
		method: string;
		url: string;
		status: number;
		body: string;
		timestamp: string;
		lastAction: string;
	}[] {
		const combined: {
			method: string;
			url: string;
			status: number;
			body: string;
			timestamp: string;
			lastAction: string;
		}[] = [];

		for (const h of this.httpErrors) {
			combined.push({
				method: h.method,
				url: h.url,
				status: h.status,
				body: h.body,
				timestamp: h.timestamp,
				lastAction: h.lastAction,
			});
		}

		for (const n of this.networkErrors) {
			combined.push({
				method: n.method,
				url: n.url,
				status: 0,
				body: `Network Error: ${n.errorText}`,
				timestamp: n.timestamp,
				lastAction: n.lastAction,
			});
		}

		return combined;
	}

	public getConsoleErrors(): readonly ConsoleErrorRecord[] {
		return this.consoleErrors;
	}

	public getPageErrors(): readonly PageErrorRecord[] {
		return this.pageErrors;
	}

	public getReactCrashErrors(): ConsoleErrorRecord[] {
		const crashKeywords = [
			"Invariant Violation",
			"Minified React error",
			"[ErrorBoundary]",
			"Rendered fewer hooks than expected",
			"Maximum update depth exceeded",
			"Cannot read properties of undefined",
			"Cannot read properties of null",
		];

		return this.consoleErrors.filter((e) =>
			crashKeywords.some((keyword) => e.text.includes(keyword))
		);
	}

	public printReport(): void {
		console.log("\n=======================================================");
		console.log("🛡️ BÁO CÁO GIÁM SÁT LỖI HỆ THỐNG (NETWORK & ERROR TRAP):");
		console.log("=======================================================");
		console.log(`• Lỗi HTTP API (status >= 400):     ${this.httpErrors.length}`);
		console.log(`• Lỗi kết nối mạng (requestfailed): ${this.networkErrors.length}`);
		console.log(`• Lỗi Unhandled Page Error (JS):    ${this.pageErrors.length}`);
		console.log(`• Lỗi Console Error (Browser):      ${this.consoleErrors.length}`);
		console.log(`• Lỗi React Crash / ErrorBoundary:  ${this.getReactCrashErrors().length}`);
		console.log("-------------------------------------------------------");

		if (this.httpErrors.length > 0) {
			console.log("\n📋 CHI TIẾT LỖI HTTP BACKEND (STATUS >= 400):");
			console.table(
				this.httpErrors.map((e, idx) => ({
					"#": idx + 1,
					Method: e.method,
					Status: e.status,
					URL: e.url,
					Action: e.lastAction,
					BodyPreview: e.body.slice(0, 80),
				}))
			);
		}

		if (this.networkErrors.length > 0) {
			console.log("\n📋 CHI TIẾT LỖI KẾT NỐI MẠNG:");
			console.table(
				this.networkErrors.map((e, idx) => ({
					"#": idx + 1,
					Method: e.method,
					URL: e.url,
					Error: e.errorText,
					Action: e.lastAction,
				}))
			);
		}

		if (this.pageErrors.length > 0) {
			console.log("\n📋 CHI TIẾT LỖI UNHANDLED JS EXCEPTION:");
			console.table(
				this.pageErrors.map((e, idx) => ({
					"#": idx + 1,
					Name: e.name,
					Message: e.message.slice(0, 100),
					Action: e.lastAction,
				}))
			);
		}

		if (this.consoleErrors.length > 0) {
			console.log("\n📋 CHI TIẾT LỖI CONSOLE ERROR:");
			console.table(
				this.consoleErrors.map((e, idx) => ({
					"#": idx + 1,
					ErrorText: e.text.slice(0, 100),
					Location: e.location || "N/A",
					Action: e.lastAction,
				}))
			);
		}
		console.log("=======================================================\n");
	}

	public async assertZeroErrors(page: Page): Promise<void> {
		const isCrashBannerVisible = await page
			.locator(
				'h1:has-text("Đã xảy ra sự cố hệ thống"), div:has-text("Giao diện ứng dụng gặp lỗi không mong muốn"), button:has-text("Tải lại ứng dụng")'
			)
			.first()
			.isVisible()
			.catch(() => false);

		if (
			this.httpErrors.length > 0 ||
			this.networkErrors.length > 0 ||
			this.pageErrors.length > 0 ||
			this.consoleErrors.length > 0 ||
			isCrashBannerVisible
		) {
			this.printReport();
		}

		expect(
			isCrashBannerVisible,
			"React Error Boundary màn hình sập hệ thống không được xuất hiện"
		).toBe(false);

		expect(
			this.pageErrors,
			`Phát hiện ${this.pageErrors.length} lỗi Unhandled Exception / Page Error gây crash UI`
		).toEqual([]);

		expect(
			this.httpErrors,
			`Phát hiện ${this.httpErrors.length} lỗi HTTP API (Status >= 400) từ Backend (:5002/:5012//api/)`
		).toEqual([]);

		expect(
			this.networkErrors,
			`Phát hiện ${this.networkErrors.length} lỗi kết nối mạng từ Backend`
		).toEqual([]);

		expect(
			this.getReactCrashErrors(),
			`Phát hiện ${this.getReactCrashErrors().length} lỗi React Crash (Invariant Violation/Minified React error)`
		).toEqual([]);

		expect(
			this.consoleErrors,
			`Phát hiện ${this.consoleErrors.length} lỗi Browser Console Error không mong muốn`
		).toEqual([]);
	}
}
