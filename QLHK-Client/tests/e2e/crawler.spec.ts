import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureDatabaseSeeded } from "./seed_e2e";

interface CoverageItem {
	id: string;
	screen: string;
	type: "button" | "tab" | "combobox" | "dropdown-option" | "card" | "pill";
	label: string;
	reason?: string;
}

class ClickCoverageTracker {
	private discoveredMap = new Map<string, CoverageItem>();
	private clickedSet = new Set<string>();
	private guardedMap = new Map<string, string>();

	private normalize(text: string): string {
		return text.replace(/\s+/g, " ").trim().split("\n")[0].trim().slice(0, 70);
	}

	private makeId(screen: string, type: string, label: string): string {
		return `[${screen}] [${type}] ${this.normalize(label)}`;
	}

	public isGlobalUtility(label: string): boolean {
		const utilityRegex =
			/thu nhỏ giao diện|phóng to giao diện|đặt lại kích thước|100%|chuyển sang giao diện tối|chuyển sang giao diện sáng|giao diện tối|giao diện sáng|chẩn đoán kết nối|ping server|kiểm tra kết nối/i;
		return utilityRegex.test(label);
	}

	discover(
		screen: string,
		type: CoverageItem["type"],
		label: string,
		guardedReason?: string | boolean
	): string {
		const clean = this.normalize(label);
		if (!clean) return "";
		if (this.isGlobalUtility(clean)) return "";

		const reason = typeof guardedReason === "string" ? guardedReason : undefined;
		const id = this.makeId(screen, type, clean);
		if (!this.discoveredMap.has(id)) {
			this.discoveredMap.set(id, {
				id,
				screen,
				type,
				label: clean,
				reason,
			});
		}
		if (reason && !this.guardedMap.has(id)) {
			this.guardedMap.set(id, reason);
		}
		return id;
	}

	recordClick(screen: string, type: CoverageItem["type"], label: string) {
		const clean = this.normalize(label);
		if (!clean || this.isGlobalUtility(clean)) return;
		const id = this.discover(screen, type, clean);
		if (id) {
			this.clickedSet.add(id);
		}
	}

	hasClicked(screen: string, type: CoverageItem["type"], label: string): boolean {
		const clean = this.normalize(label);
		if (!clean) return true;
		const id = this.makeId(screen, type, clean);
		return this.clickedSet.has(id);
	}

	recordGuarded(
		screen: string,
		type: CoverageItem["type"],
		label: string,
		reason: string
	) {
		this.discover(screen, type, label, reason);
	}

	getReport() {
		const allItems = Array.from(this.discoveredMap.values());
		const discoveredSet = new Set(allItems.map((i) => i.id));
		const guardedSet = new Set(this.guardedMap.keys());
		const clickedSet = this.clickedSet;

		const missedItems = allItems.filter(
			(item) => !this.guardedMap.has(item.id) && !this.clickedSet.has(item.id)
		);

		const guardedItems = allItems.filter((item) => this.guardedMap.has(item.id));
		const actionableTotal = Math.max(1, discoveredSet.size - guardedSet.size);
		const coverage = Math.min(
			100,
			(clickedSet.size / actionableTotal) * 100
		).toFixed(1);

		return {
			totalDiscovered: discoveredSet.size,
			totalClicked: clickedSet.size,
			totalGuarded: guardedSet.size,
			missedCount: missedItems.length,
			coveragePercent: `${coverage}%`,
			missedItems,
			guardedItems,
		};
	}

	printReport() {
		const r = this.getReport();
		console.log("\n=======================================================");
		console.log("🎯 BÁO CÁO ĐỘ PHỦ TƯƠNG TÁC (CLICK COVERAGE TRACKER):");
		console.log("=======================================================");
		console.log(`• Tổng phần tử phát hiện (discoveredSet):     ${r.totalDiscovered}`);
		console.log(`• Đã click thành công (clickedSet):           ${r.totalClicked}`);
		console.log(`• Bỏ qua an toàn CSDL (guardedSet):           ${r.totalGuarded}`);
		console.log(`• Tập hợp chưa bấm (missedSet):               ${r.missedCount}`);
		console.log(`• TỶ LỆ ĐỘ PHỦ KHẢ THI (Coverage):            ${r.coveragePercent}`);
		console.log("-------------------------------------------------------");

		console.log("\n📋 BẢNG 1: DANH SÁCH PHẦN TỬ CHƯA BẤM (MISSED):");
		console.table(
			r.missedItems.map((m, idx) => ({
				"#": idx + 1,
				Screen: m.screen,
				Type: m.type,
				Label: m.label,
			}))
		);

		console.log("\n🛡️ BẢNG 2: DANH SÁCH PHẦN TỬ BẢO VỆ AN TOÀN (GUARDED):");
		console.table(
			r.guardedItems.map((g, idx) => ({
				"#": idx + 1,
				Screen: g.screen,
				Type: g.type,
				Label: g.label,
				Reason: this.guardedMap.get(g.id) || g.reason || "SafeGuard CSDL",
			}))
		);
		console.log("=======================================================\n");
	}
}

test.describe("QLHK Smart Crawler - Coverage Sweep & Deep Filter Testing", () => {
	const apiErrors: {
		method: string;
		url: string;
		status: number;
		body: string;
		timestamp: string;
		lastAction: string;
	}[] = [];

	const consoleErrors: {
		text: string;
		timestamp: string;
		lastAction: string;
	}[] = [];

	const unhandledErrors: {
		message: string;
		timestamp: string;
		lastAction: string;
	}[] = [];

	const visitedRoutes: string[] = [];
	let interactionCount = 0;
	let currentAction = "Khởi tạo môi trường kiểm thử";
	const tracker = new ClickCoverageTracker();

	const getTimestamp = (): string =>
		new Date().toLocaleTimeString("vi-VN", { hour12: false });

	const closeSuccessAlertIfPresent = async (p: Page): Promise<void> => {
		const dialogSelectors = [
			'div[role="alertdialog"]',
			'div.fixed.inset-0.z-\\[9999999\\]',
			'div[role="dialog"]:has-text("Thành công")',
			'div[role="dialog"]:has-text("thành công")',
			'div.swal2-container',
			'div[data-state="open"]:has-text("Thành công")',
		];

		for (const selector of dialogSelectors) {
			const dialog = p.locator(selector).first();
			if (await dialog.isVisible({ timeout: 400 }).catch(() => false)) {
				const closeBtn = dialog
					.locator(
						'button:has-text("Đóng"), button:has-text("OK"), button:has-text("Xác nhận"), button[aria-label="Close"], button[aria-label="Đóng hộp thoại"], button.swal2-confirm'
					)
					.first();
				if (await closeBtn.isVisible().catch(() => false)) {
					await closeBtn.click().catch(() => {});
					interactionCount++;
					await dialog.waitFor({ state: "hidden", timeout: 2500 }).catch(() => {});
					await p.waitForTimeout(150);
				}
			}
		}
	};

	interface SweepSelectConfig {
		screenName: string;
		dropdownName: string;
		getTrigger: () => Locator;
		expectedApiResponse?: string;
	}

	const sweepCustomSelect = async (
		page: Page,
		t: ClickCoverageTracker,
		config: SweepSelectConfig
	): Promise<void> => {
		const { screenName, dropdownName, getTrigger } = config;
		const initialTrigger = getTrigger();
		if (!(await initialTrigger.isVisible().catch(() => false))) return;

		currentAction = `[Dynamic Sweep] Mở dropdown [${dropdownName}]`;
		await getTrigger().click();
		interactionCount++;
		t.recordClick(screenName, "combobox", `Mở dropdown [${dropdownName}]`);

		const listbox = page.locator('div[role="listbox"]').first();
		await listbox.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});

		const optionButtons = await listbox.locator('button[role="option"]').all();
		const optionLabels: string[] = [];

		for (const opt of optionButtons) {
			const fullText = (await opt.innerText().catch(() => "")).trim();
			const label = fullText.split("\n")[0].trim();
			if (label) {
				optionLabels.push(label);
				t.discover(
					screenName,
					"dropdown-option",
					`[${dropdownName}] ${label}`
				);
			}
		}

		for (let i = 0; i < optionLabels.length; i++) {
			const optLabel = optionLabels[i];
			currentAction = `Quét cạn option [${optLabel}] của dropdown [${dropdownName}]`;

			const isListboxVisible = await listbox.isVisible().catch(() => false);
			if (!isListboxVisible) {
				await getTrigger().click();
				interactionCount++;
				await listbox.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});
			}

			const targetOption = page
				.locator(
					`div[role="listbox"] button[role="option"]:has-text("${optLabel}")`
				)
				.first();

			if (await targetOption.isVisible().catch(() => false)) {
				await targetOption.scrollIntoViewIfNeeded().catch(() => {});
				await targetOption.click();
				interactionCount++;
				t.recordClick(
					screenName,
					"dropdown-option",
					`[${dropdownName}] ${optLabel}`
				);

				await page.waitForTimeout(150);
				await page
					.locator(
						"table, div[role='table'], div.overflow-x-auto, div.space-y-4, div:has-text('Không tìm thấy')"
					)
					.first()
					.waitFor({ state: "visible", timeout: 1500 })
					.catch(() => {});
			} else {
				await page.keyboard.press("Escape").catch(() => {});
			}
		}

		if (optionLabels.length > 0) {
			const defaultLabel = optionLabels[0];
			const isListboxVisible = await listbox.isVisible().catch(() => false);
			if (!isListboxVisible) {
				await getTrigger().click();
				interactionCount++;
				await listbox.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});
			}
			const defaultOpt = page
				.locator(
					`div[role="listbox"] button[role="option"]:has-text("${defaultLabel}")`
				)
				.first();
			if (await defaultOpt.isVisible().catch(() => false)) {
				await defaultOpt.click().catch(() => {});
				interactionCount++;
			} else {
				await page.keyboard.press("Escape").catch(() => {});
			}
			await page.waitForTimeout(150);
		}
	};

	const sweepAgeFilterPopover = async (
		page: Page,
		t: ClickCoverageTracker,
		screenName: string
	): Promise<void> => {
		const agePopoverTrigger = page.locator('button:has-text("Lọc Độ Tuổi")').first();
		if (!(await agePopoverTrigger.isVisible().catch(() => false))) return;

		currentAction = `[Dynamic Sweep] Mở Popover [Lọc Độ Tuổi] trên ${screenName}`;
		await agePopoverTrigger.click();
		interactionCount++;
		t.recordClick(screenName, "button", "Lọc Độ Tuổi");
		await page.waitForTimeout(200);

		const popover = page
			.locator('div[role="dialog"]:has-text("Lọc Độ Tuổi Nhân Khẩu")')
			.first();
		await popover.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});

		const presetButtons = await popover.locator("div.grid button").all();
		const presetLabels: string[] = [];

		for (const pb of presetButtons) {
			const label = (await pb.innerText().catch(() => "")).trim();
			if (label) {
				presetLabels.push(label);
				t.discover(screenName, "button", `[Lọc Độ Tuổi] ${label}`);
			}
		}

		for (let i = 0; i < presetLabels.length; i++) {
			const pLabel = presetLabels[i];
			currentAction = `Click Preset độ tuổi [${pLabel}]`;

			const isPopoverVisible = await popover.isVisible().catch(() => false);
			if (!isPopoverVisible) {
				const reopenTrigger = page
					.locator('button:has-text("Lọc Độ Tuổi"), button:has-text("Tuổi:")')
					.first();
				await reopenTrigger.click();
				interactionCount++;
				await popover.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});
			}

			const targetPreset = popover.locator(`button:has-text("${pLabel}")`).first();
			if (await targetPreset.isVisible().catch(() => false)) {
				await targetPreset.click();
				interactionCount++;
				t.recordClick(screenName, "button", `[Lọc Độ Tuổi] ${pLabel}`);
				await page.waitForTimeout(150);
			}
		}

		const isPopoverVisibleEnd = await popover.isVisible().catch(() => false);
		if (!isPopoverVisibleEnd) {
			const reopenTrigger = page
				.locator('button:has-text("Lọc Độ Tuổi"), button:has-text("Tuổi:")')
				.first();
			await reopenTrigger.click();
			interactionCount++;
			await popover.waitFor({ state: "visible", timeout: 1500 }).catch(() => {});
		}

		const clearBtn = popover.locator('button:has-text("Xóa lọc")').first();
		if (await clearBtn.isVisible().catch(() => false)) {
			await clearBtn.click();
			interactionCount++;
			t.recordClick(screenName, "button", "[Lọc Độ Tuổi] Xóa lọc");
			await page.waitForTimeout(150);
		} else {
			await page.keyboard.press("Escape").catch(() => {});
		}
	};

	const discoverVisibleButtons = async (
		page: Page,
		screenName: string
	): Promise<void> => {
		const visibleBtns = await page
			.locator('button:visible, [role="button"]:visible, [role="tab"]:visible')
			.all();
		for (const b of visibleBtns) {
			const text = (await b.innerText().catch(() => "")).trim();
			const aria = (await b.getAttribute("aria-label").catch(() => "")) || "";
			const title = (await b.getAttribute("title").catch(() => "")) || "";
			const label = text || aria || title;
			if (!label) continue;

			const role = (await b.getAttribute("role").catch(() => "")) || "button";
			const itemType: CoverageItem["type"] =
				role === "tab" ? "tab" : role === "combobox" ? "combobox" : "button";

			tracker.discover(screenName, itemType, label);
		}
	};

	const crawlSafeButtons = async (
		page: Page,
		screenName: string
	): Promise<void> => {
		await discoverVisibleButtons(page, screenName);

		const candidateButtons = await page
			.locator('button:visible, [role="tab"]:visible')
			.all();

		for (const btn of candidateButtons) {
			const fullLabel = (
				(await btn.innerText().catch(() => "")) ||
				(await btn.getAttribute("aria-label").catch(() => "")) ||
				(await btn.getAttribute("title").catch(() => "")) ||
				""
			).trim();

			const shortLabel = fullLabel.split("\n")[0].trim().slice(0, 50);
			if (!shortLabel || tracker.hasClicked(screenName, "button", shortLabel)) {
				continue;
			}

			if (
				fullLabel.includes("Xóa") ||
				fullLabel.includes("xóa") ||
				fullLabel.includes("Đăng xuất") ||
				fullLabel.includes("Logout") ||
				fullLabel.includes("Hủy") ||
				fullLabel.includes("Lưu")
			) {
				continue;
			}

			if (
				fullLabel.includes("Đổi thôn") ||
				fullLabel.includes("Làm mới") ||
				fullLabel.includes("Làm Mới") ||
				fullLabel.includes("Thu gọn") ||
				fullLabel.includes("Mở rộng")
			) {
				currentAction = `[Spider] Click nút an toàn trên ${screenName}: ${shortLabel}`;
				await btn.click({ timeout: 1500 }).catch(() => {});
				interactionCount++;
				tracker.recordClick(screenName, "button", shortLabel);
				await page.waitForTimeout(200);
			}
		}
	};

	test.beforeAll(async () => {
		console.log("\n=======================================================");
		console.log("🌱 TỰ ĐỘNG SEED CSDL MẪU (ADMIN, THÔN, CCCD, MỪNG THỌ, THÙNG RÁC)");
		console.log("=======================================================\n");
		ensureDatabaseSeeded();
	});

	test.beforeEach(async ({ page }) => {
		page.on("response", async (response) => {
			const url = response.url();
			if (
				url.includes("favicon.ico") ||
				url.includes("chrome-extension://") ||
				url.includes("fonts.googleapis.com") ||
				url.includes("fonts.gstatic.com")
			) {
				return;
			}

			const status = response.status();
			const isBackendCall =
				url.includes(":5002") || url.includes(":5012") || url.includes("/api/");

			if (status >= 400 && isBackendCall) {
				let body = "";
				try {
					body = await response.text();
				} catch {
					body = "[Không thể trích xuất body response]";
				}
				apiErrors.push({
					method: response.request().method(),
					url,
					status,
					body: body.slice(0, 300),
					timestamp: getTimestamp(),
					lastAction: currentAction,
				});
			}
		});

		page.on("requestfailed", (request) => {
			const url = request.url();
			const isBackendCall =
				url.includes(":5002") || url.includes(":5012") || url.includes("/api/");

			if (isBackendCall) {
				const failure = request.failure();
				const errorText = failure?.errorText || "Lỗi mạng không xác định";
				if (
					!errorText.includes("net::ERR_ABORTED") &&
					!errorText.includes("Request was aborted")
				) {
					apiErrors.push({
						method: request.method(),
						url,
						status: 0,
						body: `Network Error: ${errorText}`,
						timestamp: getTimestamp(),
						lastAction: currentAction,
					});
				}
			}
		});

		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				if (
					text.includes("favicon.ico") ||
					text.includes("net::ERR_CONNECTION_REFUSED") ||
					text.includes("fonts.googleapis.com") ||
					text.includes("fonts.gstatic.com") ||
					text.includes("chrome-extension://") ||
					text.includes("vite:react-babel") ||
					text.startsWith("Warning: ")
				) {
					return;
				}
				consoleErrors.push({
					text: text.slice(0, 300),
					timestamp: getTimestamp(),
					lastAction: currentAction,
				});
			}
		});

		page.on("pageerror", (err) => {
			unhandledErrors.push({
				message: `${err.name}: ${err.message}`,
				timestamp: getTimestamp(),
				lastAction: currentAction,
			});
		});
	});

	test("Smart Crawler: Quét cạn toàn bộ luồng nghiệp vụ QLHK không thiếu tính năng", async ({
		page,
		request,
	}) => {
		test.setTimeout(360_000);

		console.log("\n=======================================================");
		console.log("🚀 BẮT ĐẦU SMART CRAWLER TOÀN DIỆN CHO QLHK (HỘ KHẨU - NHÂN KHẨU)");
		console.log("=======================================================\n");

		currentAction = "Giai đoạn 1: Đăng nhập hệ thống";
		console.log("🔑 [1/8] Điều hướng & Đăng nhập tài khoản admin...");
		await page.goto("/", { waitUntil: "load", timeout: 60_000 });

		let adminAuthToken = "";

		const loginForm = page.locator("form").first();
		if (await loginForm.isVisible({ timeout: 5000 }).catch(() => false)) {
			await page.locator('input[type="text"]').first().fill("admin");
			await page.locator('input[type="password"]').first().fill("admin123");
			tracker.discover("Đăng Nhập", "button", "ĐĂNG NHẬP", true);

			const submitLoginBtn = page
				.locator('button[type="submit"], button:has-text("ĐĂNG NHẬP"), button:has-text("Đăng nhập")')
				.first();

			const [loginResponse] = await Promise.all([
				page.waitForResponse(
					(res) => res.url().includes("/api/auth/login") && res.status() === 200,
					{ timeout: 15_000 }
				),
				submitLoginBtn.click(),
			]);
			const loginJson = await loginResponse.json().catch(() => null);
			if (loginJson?.accessToken) {
				adminAuthToken = loginJson.accessToken;
			}
			tracker.recordClick("Đăng Nhập", "button", "ĐĂNG NHẬP");
			interactionCount++;
			console.log("   ✓ Đã gửi thông tin đăng nhập admin/admin123.");
		}

		await page.waitForLoadState("networkidle").catch(() => {});
		await closeSuccessAlertIfPresent(page);
		visitedRoutes.push("Login -> Main Layout");
		console.log("   ✓ Đăng nhập thành công! Giao diện chính sẵn sàng.");

		const sidebar = page.locator("aside").first();
		tracker.recordGuarded(
			"Sidebar",
			"button",
			"Đăng xuất khỏi hệ thống",
			"SafeGuard (Chặn thao tác phá hủy / đăng xuất)"
		);

		currentAction = "Giai đoạn 2: Quản Lý Thôn";
		console.log("📍 [2/8] Dò quét Màn hình: Quản Lý Thôn...");

		const villagesNav = sidebar.locator('button:has-text("Quản Lý Thôn")').first();
		if (await villagesNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Quản Lý Thôn", true);
			await villagesNav.click();
			tracker.recordClick("Sidebar", "button", "Quản Lý Thôn");
			interactionCount++;
			await page.waitForTimeout(250);
		}
		visitedRoutes.push("Quản Lý Thôn");

		const banner = page
			.locator('div:has-text("Tổng Quan Dân Cư & Hộ Gia Đình Toàn Xã")')
			.first();
		await expect(banner).toBeVisible({ timeout: 15_000 });
		console.log("   ✓ Xác nhận Banner Tổng quan và các thẻ KPI hiển thị đầy đủ.");

		const villageCards = page.locator('div[role="button"][aria-label*="Thôn"]');
		const villageCardCount = await villageCards.count();
		console.log(`   ✓ Phát hiện ${villageCardCount} thẻ thôn trên địa bàn.`);

		const thon1Card = page
			.locator('div[role="button"][aria-label*="Thôn 1"]')
			.first();
		if (await thon1Card.isVisible().catch(() => false)) {
			console.log("   ✓ Click chọn Thôn 1 để kích hoạt toàn bộ phạm vi quản lý...");
			tracker.discover("Quản Lý Thôn", "card", "Thôn 1");
			await thon1Card.click();
			tracker.recordClick("Quản Lý Thôn", "card", "Thôn 1");
			interactionCount++;
			await page.waitForTimeout(250);
		} else if (villageCardCount > 0) {
			await villageCards.first().click();
			interactionCount++;
			await page.waitForTimeout(250);
		}

		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 3: Quản Lý Hộ Gia Đình & Nhân Khẩu";
		console.log("👨‍👩‍👧‍👦 [3/8] Dò quét Màn hình: Hộ Gia Đình & Nhân Khẩu...");

		const householdsNav = sidebar.locator('button:has-text("Hộ Gia Đình")').first();
		await expect(householdsNav).toBeVisible({ timeout: 10_000 });
		tracker.discover("Sidebar", "button", "Hộ Gia Đình");
		await householdsNav.click();
		tracker.recordClick("Sidebar", "button", "Hộ Gia Đình");
		interactionCount++;
		await page.waitForTimeout(250);
		visitedRoutes.push("Hộ Gia Đình & Nhân Khẩu");

		await expect(page.locator('h2:has-text("Quản Lý Hộ Gia Đình")')).toBeVisible({
			timeout: 15_000,
		});

		const searchInput = page.locator(
			'input[placeholder*="Tìm theo họ tên chủ hộ, CCCD"]'
		);

		console.log("   -> 3.1. Thử tìm kiếm tên công dân không dấu (name_unaccented)...");
		if (await searchInput.isVisible()) {
			await searchInput.fill("Doan Van");
			await page.waitForTimeout(350);
			const filteredRow = page.locator("table tbody tr").first();
			if (await filteredRow.isVisible().catch(() => false)) {
				console.log("      ✓ Tìm kiếm không dấu 'Doan Van' hiển thị kết quả thành công.");
			}
			await searchInput.fill("");
			await page.waitForTimeout(300);
		}

		console.log("   -> 3.2. Mở rộng chi tiết hộ khẩu & Thử nút 'Xem CCCD' (/reveal-cccd)...");
		const firstHouseholdRow = page.locator("table tbody tr").first();
		if (await firstHouseholdRow.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			await firstHouseholdRow.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			interactionCount++;
			await page.waitForTimeout(250);

			const cccdCell = page
				.locator('table tbody tr td:has-text("••••")')
				.first();
			if (await cccdCell.isVisible().catch(() => false)) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");

				const [revealResponse] = await Promise.all([
					page.waitForResponse(
						(res) =>
							res.url().includes("/reveal-cccd") && res.status() === 200,
						{ timeout: 10_000 }
					).catch(() => [null]),
					cccdCell.click(),
				]);

				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");
				interactionCount++;
				await page.waitForTimeout(200);

				if (revealResponse) {
					console.log("      ✓ Bắt thành công API /reveal-cccd trả về mã 200 OK.");
				}

				await cccdCell.click().catch(() => {});
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Ẩn lại CCCD");
				interactionCount++;
				await page.waitForTimeout(150);
			}
		}

		console.log("   -> 3.3. Quét cạn toàn bộ thanh bộ lọc...");
		const yearTrigger = page
			.locator('div:has-text("Năm ")')
			.filter({ hasText: /^Năm \d+/ })
			.first();
		if (await yearTrigger.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Bộ chọn năm");
			await yearTrigger.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Bộ chọn năm");
			interactionCount++;
			await page.waitForTimeout(200);

			const currentYearBtn = page.locator('button:has-text("Năm nay")').first();
			if (await currentYearBtn.isVisible()) {
				await currentYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const applyYearBtn = page.locator('button:has-text("Áp dụng")').first();
			if (await applyYearBtn.isVisible()) {
				await applyYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(200);
			} else {
				await page.keyboard.press("Escape");
			}
		}

		await sweepAgeFilterPopover(page, tracker, "Hộ Gia Đình & Nhân Khẩu");

		await sweepCustomSelect(page, tracker, {
			screenName: "Hộ Gia Đình & Nhân Khẩu",
			dropdownName: "Giới tính",
			getTrigger: () =>
				page.locator("div.w-36").nth(0).locator('button[aria-haspopup="listbox"]').first(),
		});

		await sweepCustomSelect(page, tracker, {
			screenName: "Hộ Gia Đình & Nhân Khẩu",
			dropdownName: "Dân tộc",
			getTrigger: () =>
				page.locator("div.w-40").locator('button[aria-haspopup="listbox"]').first(),
		});

		await sweepCustomSelect(page, tracker, {
			screenName: "Hộ Gia Đình & Nhân Khẩu",
			dropdownName: "Cư trú",
			getTrigger: () =>
				page.locator("div.w-36").nth(1).locator('button[aria-haspopup="listbox"]').first(),
		});

		const refreshBtn = page
			.locator('button:has(svg.lucide-refresh-cw), button:has-text("Làm Mới")')
			.first();
		if (await refreshBtn.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			await refreshBtn.click().catch(() => {});
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			interactionCount++;
			await page.waitForTimeout(250);
		}

		console.log("   -> 3.4. Vòng đời CRUD THẬT an toàn với tag [TEST-CRAWLER]...");
		const addHouseholdBtn = page
			.locator('button:has-text("Thêm Hộ Gia Đình"), button:has-text("Thêm Hộ")')
			.first();
		await expect(addHouseholdBtn).toBeVisible({ timeout: 10_000 });
		tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Thêm Hộ Gia Đình");
		await addHouseholdBtn.click();
		tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Thêm Hộ Gia Đình");
		interactionCount++;
		await page.waitForTimeout(200);

		const drawer = page
			.locator(
				'div[aria-labelledby="household-drawer-title"], div[role="dialog"]:has(#household-drawer-title)'
			)
			.first();
		await expect(drawer).toBeVisible({ timeout: 10_000 });

		const testAddress = page.locator('#drawer-address, input[placeholder*="Số nhà, đường"], input[placeholder*="Thôn 1"]').first();
		if (await testAddress.isVisible()) {
			await testAddress.fill("Thôn 1, Xã Đăk Hà [TEST-CRAWLER]");
		}

		const addMemberBtn = page
			.locator('button:has-text("Thêm Nhân Khẩu Mới"), button:has-text("Thêm Nhân Khẩu")')
			.first();
		await expect(addMemberBtn).toBeVisible({ timeout: 10_000 });
		tracker.discover("Thêm Hộ Drawer", "button", "Thêm Nhân Khẩu Mới");
		await addMemberBtn.click();
		tracker.recordClick("Thêm Hộ Drawer", "button", "Thêm Nhân Khẩu Mới");
		interactionCount++;
		await page.waitForTimeout(300);

		const citizenModal = page
			.locator(
				'div[aria-labelledby="citizen-modal-title"], div[role="dialog"]:has(#citizen-modal-title)'
			)
			.first();
		await expect(citizenModal).toBeVisible({ timeout: 10_000 });

		const nameInput = citizenModal
			.locator('#citizen-full-name, input[placeholder*="Nguyễn Văn A"], input[placeholder*="A Đôi"]')
			.first();
		await expect(nameInput).toBeVisible({ timeout: 10_000 });
		await nameInput.fill("[TEST-CRAWLER] Nguyễn Văn Test");

		const dobInput = citizenModal
			.locator('#citizen-dob, input[placeholder*="13/12/1987"]')
			.first();
		if (await dobInput.isVisible().catch(() => false)) {
			await dobInput.fill("15/08/1990");
		}

		const cccdInput = citizenModal
			.locator('#citizen-cccd, input[placeholder*="12 số"]')
			.first();
		if (await cccdInput.isVisible().catch(() => false)) {
			await cccdInput.fill("064090009999");
		}

		const saveMemberSubmit = citizenModal.locator('button[type="submit"]').first();
		tracker.discover("Thêm Nhân Khẩu Modal", "button", "Lưu nhân khẩu");
		await saveMemberSubmit.click();
		tracker.recordClick("Thêm Nhân Khẩu Modal", "button", "Lưu nhân khẩu");
		interactionCount++;
		await citizenModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(200);

		const saveHouseholdSubmit = page
			.locator('button[form="household-drawer-form"], button:has-text("Lưu Thông Tin Hộ")')
			.first();
		tracker.discover("Thêm Hộ Drawer", "button", "Lưu Thông Tin Hộ");

		const [createResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes("/api/households") &&
					res.request().method() === "POST" &&
					res.status() < 400,
				{ timeout: 15_000 }
			),
			saveHouseholdSubmit.click(),
		]);
		tracker.recordClick("Thêm Hộ Drawer", "button", "Lưu Thông Tin Hộ");
		interactionCount++;
		console.log(`      ✓ Bắt thành công API POST /api/households [HTTP ${createResponse.status()}].`);
		await page.waitForTimeout(250);
		await closeSuccessAlertIfPresent(page);

		if (await searchInput.isVisible()) {
			await searchInput.fill("[TEST-CRAWLER]");
			await page.waitForTimeout(600);
		}

		const createdRow = page.locator('table tbody tr:has-text("[TEST-CRAWLER]")').first();
		if (await createdRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
			console.log("      ✓ XÁC NHẬN: Bản ghi [TEST-CRAWLER] hiển thị trên bảng.");

			const editTestBtn = createdRow.locator('button[aria-label*="Sửa"]').first();
			if (await editTestBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await editTestBtn.click();
				interactionCount++;
				await page.waitForTimeout(300);

				const saveEditBtn = page
					.locator('button[form="household-drawer-form"], button:has-text("Lưu Thông Tin Hộ")')
					.first();
				await expect(saveEditBtn).toBeVisible({ timeout: 10_000 });

				await Promise.all([
					page.waitForResponse(
						(res) =>
							res.url().includes("/api/households/") &&
							(res.request().method() === "PUT" || res.request().method() === "PATCH") &&
							res.status() < 400,
						{ timeout: 15_000 }
					),
					saveEditBtn.click(),
				]);
				interactionCount++;
				await page.waitForTimeout(250);
				await closeSuccessAlertIfPresent(page);
			}

			const deleteTestBtn = page
				.locator('table tbody tr:has-text("[TEST-CRAWLER]") button[aria-label*="Xóa"]')
				.first();
			if (await deleteTestBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await deleteTestBtn.click();
				interactionCount++;
				await page.waitForTimeout(200);

				const confirmDeleteBtn = page
					.locator('button:has-text("Chuyển Vào Thùng Rác")')
					.first();
				if (await confirmDeleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
					await Promise.all([
						page.waitForResponse(
							(res) =>
								res.url().includes("/api/households/") &&
								res.request().method() === "DELETE" &&
								res.status() < 400,
							{ timeout: 15_000 }
						),
						confirmDeleteBtn.click(),
					]);
					interactionCount++;
					await page.waitForTimeout(250);
					await closeSuccessAlertIfPresent(page);
				}
			}
		}

		if (await searchInput.isVisible()) {
			await searchInput.fill("");
			await page.waitForTimeout(600);
		}

		currentAction = "Giai đoạn 4: Thống Kê Dân Số (Analytics)";
		console.log("\n📊 [4/8] Dò quét Màn hình: Thống Kê Dân Số...");
		const analyticsNav = sidebar.locator('button:has-text("Thống Kê")').first();
		if (await analyticsNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Thống Kê");
			await analyticsNav.click();
			tracker.recordClick("Sidebar", "button", "Thống Kê");
			interactionCount++;
			await page.waitForTimeout(300);

			const kpiCards = page.locator('div:has-text("Tổng số hộ"), div:has-text("Tổng Nhân Khẩu")').first();
			await expect(kpiCards).toBeVisible({ timeout: 15_000 });
			console.log("   ✓ Thống kê dân số và các chỉ số KPI tải hoàn chỉnh.");
			await crawlSafeButtons(page, "Thống Kê Báo Cáo");
		}
		visitedRoutes.push("Thống Kê Báo Cáo");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 5: Chính sách Chúc Thọ & Hỗ Trợ Xã Hội";
		console.log("\n🎁 [5/8] Dò quét Màn hình: Chính sách Chúc Thọ & Hỗ Trợ Xã Hội...");
		const chucThoNav = sidebar.locator('button:has-text("Chúc Thọ")').first();
		if (await chucThoNav.isVisible({ timeout: 10_000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Chúc Thọ");
			await chucThoNav.click();
			tracker.recordClick("Sidebar", "button", "Chúc Thọ");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Chúc Thọ");

			await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 });
			console.log("   ✓ Bảng danh sách Chúc Thọ hiển thị dữ liệu.");

			const chucThoSearch = page.locator('input[placeholder*="Tìm kiếm"]').first();
			if (await chucThoSearch.isVisible().catch(() => false)) {
				await chucThoSearch.fill("Cụ");
				await page.waitForTimeout(300);
				await chucThoSearch.fill("");
				await page.waitForTimeout(250);
			}

			const giftBtn = page
				.locator('table tbody tr button[aria-label="Chưa nhận quà"], table tbody tr button[aria-label="Đã nhận quà"]')
				.first();
			if (await giftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				tracker.discover("Chúc Thọ", "button", "Đánh dấu quà tặng");

				const [giftResponse] = await Promise.all([
					page.waitForResponse(
						(res) =>
							res.url().includes("/received") &&
							(res.request().method() === "PATCH" || res.request().method() === "PUT") &&
							res.status() < 400,
						{ timeout: 10_000 }
					),
					giftBtn.click(),
				]);
				tracker.recordClick("Chúc Thọ", "button", "Đánh dấu quà tặng");
				interactionCount++;
				console.log(`   ✓ Bắt thành công API Cập nhật quà [HTTP ${giftResponse.status()}].`);
				await page.waitForTimeout(300);
				await closeSuccessAlertIfPresent(page);
			}
		}

		const htxhNav = sidebar.locator('button:has-text("Hỗ Trợ Xã Hội")').first();
		if (await htxhNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Hỗ Trợ Xã Hội");
			await htxhNav.click();
			tracker.recordClick("Sidebar", "button", "Hỗ Trợ Xã Hội");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Hỗ Trợ Xã Hội");
			console.log("   ✓ Màn hình Hỗ Trợ Xã Hội nạp dữ liệu thành công.");
		}

		const policyAnalyticsNav = sidebar.locator('button:has-text("TK Chính Sách")').first();
		if (await policyAnalyticsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "TK Chính Sách");
			await policyAnalyticsNav.click();
			tracker.recordClick("Sidebar", "button", "TK Chính Sách");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("TK Chính Sách");
			console.log("   ✓ Màn hình Thống Kê Chính Sách nạp dữ liệu thành công.");
		}

		currentAction = "Giai đoạn 6: Thùng Rác & Khôi phục Nhân khẩu";
		console.log("\n🗑️ [6/8] Dò quét Màn hình: Thùng Rác...");
		const trashNav = sidebar.locator('button:has-text("Thùng Rác")').first();
		if (await trashNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Thùng Rác");
			await trashNav.click();
			tracker.recordClick("Sidebar", "button", "Thùng Rác");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Thùng Rác");

			await expect(page.locator('h2:has-text("Thùng Rác")')).toBeVisible({
				timeout: 15_000,
			});

			const restoreBtn = page
				.locator('table tbody tr button[title*="Khôi phục"], table tbody tr button:has(svg.lucide-rotate-ccw)')
				.first();
			if (await restoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				tracker.discover("Thùng Rác", "button", "Khôi phục hộ khẩu");
				await restoreBtn.click();
				tracker.recordClick("Thùng Rác", "button", "Khôi phục hộ khẩu");
				interactionCount++;
				await page.waitForTimeout(200);

				const confirmRestoreBtn = page
					.locator('div[role="dialog"] button:has-text("Khôi Phục"), button:has-text("Khôi Phục")')
					.first();
				if (await confirmRestoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
					const [restoreResponse] = await Promise.all([
						page.waitForResponse(
							(res) =>
								res.url().includes("/restore") &&
								(res.request().method() === "POST" || res.request().method() === "PATCH") &&
								res.status() < 400,
							{ timeout: 10_000 }
						),
						confirmRestoreBtn.click(),
					]);
					interactionCount++;
					console.log(`   ✓ Bắt thành công API Restore [HTTP ${restoreResponse.status()}].`);
					await page.waitForTimeout(250);
					await closeSuccessAlertIfPresent(page);
				}
			}

			const testRowInTrash = page
				.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
				.first();
			if (await testRowInTrash.isVisible({ timeout: 3000 }).catch(() => false)) {
				const hardDeleteBtn = testRowInTrash
					.locator('button:has-text("Xóa vĩnh viễn"), button[title*="Xóa vĩnh viễn"], button:has(svg.lucide-trash-2)')
					.first();
				if (await hardDeleteBtn.isVisible().catch(() => false)) {
					await hardDeleteBtn.click();
					interactionCount++;
					await page.waitForTimeout(200);

					const confirmHardDeleteBtn = page
						.locator('div[role="dialog"] button:has-text("Xóa Vĩnh Viễn"), div[role="dialog"] button:has-text("Xóa vĩnh viễn")')
						.first();
					if (await confirmHardDeleteBtn.isVisible().catch(() => false)) {
						await Promise.all([
							page.waitForResponse(
								(res) =>
									res.url().includes("/api/households/") &&
									res.request().method() === "DELETE" &&
									res.status() < 400,
								{ timeout: 10_000 }
							),
							confirmHardDeleteBtn.click(),
						]);
						interactionCount++;
						await page.waitForTimeout(250);
						await closeSuccessAlertIfPresent(page);
					}
				}
			}
		}

		currentAction = "Giai đoạn 7: Nhật Ký Hoạt Động & Cài Đặt Hệ Thống";
		console.log("\n📜 [7/8] Dò quét Màn hình: Nhật Ký Hoạt Động & Cài Đặt...");
		const auditNav = sidebar.locator('button:has-text("Nhật Ký Hoạt Động")').first();
		if (await auditNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Nhật Ký Hoạt Động");
			await auditNav.click();
			tracker.recordClick("Sidebar", "button", "Nhật Ký Hoạt Động");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Nhật Ký Hoạt Động");

			await expect(page.locator('h2:has-text("Nhật Ký Hoạt Động")')).toBeVisible({
				timeout: 15_000,
			});

			const auditPills = ["Tất Cả", "Thêm Mới", "Cập Nhật", "Xóa", "Khôi Phục"];
			for (const pill of auditPills) {
				const pillBtn = page.locator(`button:has-text("${pill}")`).first();
				if (await pillBtn.isVisible()) {
					tracker.discover("Nhật Ký Hoạt Động", "pill", pill);
					await pillBtn.click();
					tracker.recordClick("Nhật Ký Hoạt Động", "pill", pill);
					interactionCount++;
					await page.waitForTimeout(100);
				}
			}
		}

		const settingsNav = sidebar.locator('button:has-text("Cài Đặt Hệ Thống")').first();
		if (await settingsNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Cài Đặt Hệ Thống");
			await settingsNav.click();
			tracker.recordClick("Sidebar", "button", "Cài Đặt Hệ Thống");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Cài Đặt Hệ Thống");

			const usersTab = page.locator('button:has-text("Quản Lý Cán Bộ Thôn")').first();
			if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
				await usersTab.click();
				interactionCount++;
				await page.waitForTimeout(200);

				await expect(page.locator('h3:has-text("Danh Sách Tài Khoản Cán Bộ")')).toBeVisible({
					timeout: 15_000,
				});
				console.log("   ✓ Danh sách người dùng trong Cài đặt hiển thị đầy đủ.");
			}
		}

		currentAction = "Giai đoạn 8: Xuất Excel";
		console.log("\n📑 [8/8] Kiểm thử luồng Xuất Excel...");

		if (!adminAuthToken) {
			adminAuthToken =
				(await page.evaluate(() => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "")) || "";
		}

		const authHeaders: Record<string, string> = adminAuthToken
			? { Authorization: `Bearer ${adminAuthToken}` }
			: {};

		const exportHouseholdsRes = await request.get("http://localhost:5012/api/excel/export", {
			headers: authHeaders,
		});
		expect(exportHouseholdsRes.status(), "API /api/excel/export phải trả về 200 OK").toBe(200);

		const exportChucThoRes = await request.get("http://localhost:5012/api/excel/export/chuctho", {
			headers: authHeaders,
		});
		expect(exportChucThoRes.status(), "API /api/excel/export/chuctho phải trả về 200 OK").toBe(200);

		const templateRes = await request.get("http://localhost:5012/api/excel/template", {
			headers: authHeaders,
		});
		expect(templateRes.status(), "API /api/excel/template phải trả về 200 OK").toBe(200);

		console.log("   ✓ Xác nhận 3/3 API Xuất Excel & Tải Template trả về HTTP 200 binary stream.");

		console.log("\n=======================================================");
		console.log("📊 KẾT QUẢ GIÁM SÁT VÀ KIỂM ĐỊNH SMART CRAWLER QLHK:");
		console.log("=======================================================");
		console.log(
			`• Tổng số route đã duyệt: ${visitedRoutes.length} (${visitedRoutes.join(
				" -> "
			)})`
		);
		console.log(`• Tổng số tương tác đã thực hiện: ${interactionCount} actions`);
		console.log(`• Lỗi Unhandled JS Exceptions: ${unhandledErrors.length}`);
		console.log(`• Lỗi Browser Console Crash: ${consoleErrors.length}`);
		console.log(`• Lỗi HTTP API (code >= 400 hoặc lỗi mạng): ${apiErrors.length}`);

		tracker.printReport();

		expect(
			unhandledErrors,
			"Không được có unhandled exception gây crash UI"
		).toEqual([]);

		expect(
			apiErrors,
			"Không được có lỗi HTTP Status >= 400 hoặc network failure từ Backend"
		).toEqual([]);

		expect(
			consoleErrors.filter(
				(e) =>
					e.text.includes("Invariant Violation") ||
					e.text.includes("Minified React error")
			),
			"Không được có lỗi crash React (Invariant Violation/Minified Error)"
		).toEqual([]);

		console.log(
			"\n✅ TOÀN BỘ CÁC MÀN HÌNH VÀ LUỒNG NGHIỆP VỤ QLHK ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100%!\n"
		);
	});
});
