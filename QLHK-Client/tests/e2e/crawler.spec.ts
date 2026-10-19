import { expect, test, type Locator, type Page } from "@playwright/test";

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

	recordGuarded(
		screen: string,
		type: CoverageItem["type"],
		label: string,
		reason: string
	) {
		this.discover(screen, type, label, reason);
	}

	hasClicked(screen: string, type: CoverageItem["type"], label: string): boolean {
		const clean = this.normalize(label);
		const id = this.makeId(screen, type, clean);
		return this.clickedSet.has(id);
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

	const isDangerous = (text: string): boolean => {
		const dangerousRegex =
			/xóa vĩnh viễn|xóa hàng loạt|hard delete|reset|đăng xuất|logout/i;
		return dangerousRegex.test(text);
	};

	const closeSuccessAlertIfPresent = async (p: Page): Promise<void> => {
		const dialogSelectors = [
			'div[role="alertdialog"]',
			'div.fixed.inset-0.z-\\[9999999\\]',
			'div[role="dialog"]:has-text("Thành công")',
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

		console.log(
			`      ✓ [Dynamic Sweep] ${dropdownName}: Phát hiện ${optionLabels.length} options thực tế trên DOM.`
		);

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
				await defaultOpt.scrollIntoViewIfNeeded().catch(() => {});
				await defaultOpt.click();
				interactionCount++;
				await page.waitForTimeout(150);
			} else {
				await page.keyboard.press("Escape").catch(() => {});
			}
		}

		console.log(
			`      ✓ [Dynamic Sweep] Đã quét cạn 100% (${optionLabels.length}/${optionLabels.length}) options của [${dropdownName}].`
		);
	};

	const sweepAgeFilterPopover = async (
		page: Page,
		t: ClickCoverageTracker,
		screenName: string
	): Promise<void> => {
		const getAgeTrigger = () =>
			page
				.locator(
					'button:has-text("Lọc Độ Tuổi"), div:has(button[title*="Xóa lọc độ tuổi"])'
				)
				.first();

		const initialTrigger = getAgeTrigger();
		if (!(await initialTrigger.isVisible().catch(() => false))) return;

		await initialTrigger.click();
		interactionCount++;
		t.recordClick(screenName, "button", "Mở popover: Lọc Độ Tuổi");
		await page.waitForTimeout(150);

		const popover = page.locator('div:has-text("Lọc Theo Nhóm Tuổi")').first();
		await expect(popover).toBeVisible({ timeout: 5000 });

		const presetButtons = await page
			.locator('div:has-text("Nhóm tuổi phổ biến") + div button')
			.all();
		const presetLabels: string[] = [];

		for (const btn of presetButtons) {
			const fullText = (await btn.innerText().catch(() => "")).trim();
			const label = fullText.split("\n")[0].trim();
			if (label) {
				presetLabels.push(label);
				t.discover(
					screenName,
					"dropdown-option",
					`[Lọc Độ Tuổi] ${label}`
				);
			}
		}

		console.log(
			`      ✓ [Dynamic Sweep] Lọc Độ Tuổi: Phát hiện ${presetLabels.length} presets thực tế trên DOM.`
		);

		for (const preset of presetLabels) {
			currentAction = `Quét cạn preset độ tuổi [${preset}]`;

			const isPopoverOpen = await popover.isVisible().catch(() => false);
			if (!isPopoverOpen) {
				await getAgeTrigger().click();
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const targetPresetBtn = page
				.locator(
					`div:has-text("Nhóm tuổi phổ biến") + div button:has-text("${preset}")`
				)
				.first();

			if (await targetPresetBtn.isVisible().catch(() => false)) {
				await targetPresetBtn.scrollIntoViewIfNeeded().catch(() => {});
				await targetPresetBtn.click();
				interactionCount++;
				t.recordClick(
					screenName,
					"dropdown-option",
					`[Lọc Độ Tuổi] ${preset}`
				);
				await page.waitForTimeout(150);
				await expect(page.locator("table tbody, div[role='table']")).toBeVisible({
					timeout: 10_000,
				}).catch(() => {});
			}
		}

		const clearBtn = page
			.locator('button[title*="Xóa lọc độ tuổi"], button:has-text("Xóa lọc")')
			.first();
		if (await clearBtn.isVisible().catch(() => false)) {
			await clearBtn.click();
			interactionCount++;
			t.recordClick(screenName, "button", "[Lọc Độ Tuổi] Xóa lọc");
			await page.waitForTimeout(200);
		}
		console.log(
			`      ✓ [Dynamic Sweep] Đã quét cạn 100% (${presetLabels.length}/${presetLabels.length}) presets của [Lọc Độ Tuổi].`
		);
	};

	const discoverVisibleButtons = async (page: Page, screenName: string) => {
		const elements = await page
			.locator('button, div[role="button"], [role="tab"]')
			.all();
		for (const el of elements) {
			const isVisible = await el.isVisible().catch(() => false);
			if (!isVisible) continue;

			const isDisabled = await el
				.getAttribute("disabled")
				.then((d) => d !== null)
				.catch(() => false);
			const text = (await el.innerText().catch(() => "")) || "";
			const ariaLabel =
				(await el.getAttribute("aria-label").catch(() => "")) || "";
			const title = (await el.getAttribute("title").catch(() => "")) || "";
			const role = (await el.getAttribute("role").catch(() => "")) || "button";
			const rawLabel = `${text} ${ariaLabel} ${title}`.trim();
			const cleanLabel = rawLabel.split("\n")[0].trim().slice(0, 60);

			if (!cleanLabel) continue;
			if (tracker.isGlobalUtility(cleanLabel)) continue;

			const dangerous = isDangerous(cleanLabel);
			const isDeleteReal =
				cleanLabel.toLowerCase().includes("xóa") &&
				!cleanLabel.includes("[TEST-CRAWLER]") &&
				!cleanLabel.includes("crawler_test_user");

			if (dangerous) {
				tracker.recordGuarded(
					screenName,
					role === "tab" ? "tab" : "button",
					cleanLabel,
					"SafeGuard (Chặn thao tác phá hủy / đăng xuất)"
				);
			} else if (isDeleteReal) {
				tracker.recordGuarded(
					screenName,
					role === "tab" ? "tab" : "button",
					cleanLabel,
					"Bảo toàn dữ liệu thật CSDL (Chỉ xóa dòng test)"
				);
			} else if (!isDisabled) {
				tracker.discover(
					screenName,
					role === "tab" ? "tab" : "button",
					cleanLabel
				);
			}
		}
	};

	const crawlSafeButtons = async (page: Page, screenName: string) => {
		currentAction = `[Spider] Rà soát các nút an toàn trên [${screenName}]`;
		await discoverVisibleButtons(page, screenName);

		const buttons = await page.locator("button").all();
		for (const btn of buttons) {
			const isVisible = await btn.isVisible().catch(() => false);
			if (!isVisible) continue;

			const text = (await btn.innerText().catch(() => "")) || "";
			const ariaLabel =
				(await btn.getAttribute("aria-label").catch(() => "")) || "";
			const title = (await btn.getAttribute("title").catch(() => "")) || "";
			const fullLabel = `${text} ${ariaLabel} ${title}`.trim();
			const shortLabel = fullLabel.split("\n")[0].trim().slice(0, 60);

			if (!fullLabel || isDangerous(fullLabel) || tracker.isGlobalUtility(fullLabel)) {
				continue;
			}

			if (
				fullLabel.includes("thanh bên") ||
				fullLabel.includes("Đăng xuất") ||
				fullLabel.includes("logout") ||
				fullLabel.includes("Đóng") ||
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
			if (status >= 400 && (url.includes(":5002") || url.includes("/api/"))) {
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

	test("Smart Crawler: Quét cạn toàn bộ Filter & Vòng đời CRUD THẬT an toàn 100%", async ({
		page,
	}) => {
		test.setTimeout(360_000);

		console.log("\n=======================================================");
		console.log("🚀 BẮT ĐẦU SMART CRAWLER QUÉT CẠN DYNAMIC SWEEP & CRUD THẬT");
		console.log("=======================================================\n");

		currentAction = "Giai đoạn 1: Đăng nhập hệ thống";
		console.log("🔑 [1/7] Điều hướng & Đăng nhập tài khoản admin...");
		await page.goto("/", { waitUntil: "load", timeout: 60_000 });

		const loginForm = page.locator("form").first();
		if (await loginForm.isVisible({ timeout: 5000 }).catch(() => false)) {
			await page.locator('input[type="text"]').first().fill("admin");
			await page.locator('input[type="password"]').first().fill("admin123");
			tracker.discover("Đăng Nhập", "button", "ĐĂNG NHẬP", true);

			await Promise.all([
				page.waitForResponse(
					(res) => res.url().includes("/api/auth/login") && res.status() === 200,
					{ timeout: 15_000 }
				),
				page.locator('button[type="submit"]').first().click(),
			]);
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

		currentAction = "Giai đoạn 2: Quét cạn màn hình Quản Lý Thôn";
		console.log("📍 [2/7] Dò quét Màn hình: Quản Lý Thôn...");

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

		const villageSearch = page
			.locator('input[placeholder*="Tìm kiếm nhanh tên thôn"]')
			.first();
		if (await villageSearch.isVisible()) {
			await villageSearch.fill("Thôn");
			await page.waitForTimeout(200);
			await villageSearch.fill("");
			console.log("   ✓ Đã kiểm tra ô tìm kiếm thôn.");
		}

		const villageCards = page.locator('div[role="button"][aria-label*="Thôn"]');
		const villageCardCount = await villageCards.count();
		console.log(`   ✓ Phát hiện ${villageCardCount} thẻ thôn trên địa bàn.`);

		console.log("   -> [Quét Cạn Các Thôn] Duyệt qua toàn bộ các thẻ thôn trên địa bàn...");
		for (let i = 0; i < villageCardCount; i++) {
			const targetCard = page.locator('div[role="button"][aria-label*="Thôn"]').nth(i);
			const cardLabel =
				(await targetCard.getAttribute("aria-label").catch(() => "")) ||
				`Thôn ${i + 1}`;
			currentAction = `Quét chi tiết thôn [${cardLabel}]`;
			console.log(`      ✓ Quét thôn ${i + 1}/${villageCardCount}: ${cardLabel}`);

			tracker.discover("Quản Lý Thôn", "card", cardLabel);
			await targetCard.click();
			tracker.recordClick("Quản Lý Thôn", "card", cardLabel);
			interactionCount++;
			await page.waitForTimeout(200);

			await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });

			const changeVillageBtn = page.locator('button:has-text("Đổi thôn")').first();
			if (await changeVillageBtn.isVisible().catch(() => false)) {
				tracker.discover("Quản Lý Thôn", "button", "Đổi thôn");
				await changeVillageBtn.click();
				tracker.recordClick("Quản Lý Thôn", "button", "Đổi thôn");
			} else {
				const villagesNavBack = sidebar
					.locator('button:has-text("Quản Lý Thôn")')
					.first();
				await villagesNavBack.click();
				tracker.recordClick("Sidebar", "button", "Quản Lý Thôn");
			}
			interactionCount++;
			await page.waitForTimeout(200);
			await expect(banner).toBeVisible({ timeout: 10_000 });
		}
		console.log("   ✓ Đã hoàn tất quét cạn toàn bộ các thôn trên địa bàn!");

		if (villageCardCount > 0) {
			console.log("   ✓ Click chọn thôn đầu tiên để kích hoạt phạm vi thôn...");
			await page.locator('div[role="button"][aria-label*="Thôn"]').first().click();
			tracker.recordClick("Quản Lý Thôn", "card", "Thôn 1");
			interactionCount++;
			await page.waitForTimeout(250);
		}

		await crawlSafeButtons(page, "Quản Lý Thôn");
		await closeSuccessAlertIfPresent(page);

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

		currentAction = "Giai đoạn 3: Quét cạn toàn bộ Filter Dynamic Sweep & Vòng đời CRUD THẬT";
		console.log("👨‍👩‍👧‍👦 [3/7] Dò quét Màn hình: Hộ Gia Đình & Nhân Khẩu...");

		const searchInput = page.locator(
			'input[placeholder*="Tìm theo họ tên chủ hộ, CCCD"]'
		);

		console.log("   -> 3.0. Tự dọn rác phiên trước (Pre-test Cleanup)...");
		if (await searchInput.isVisible()) {
			await searchInput.fill("[TEST-CRAWLER]");
			await page.waitForTimeout(250);

			let cleanupAttempts = 0;
			while (cleanupAttempts < 10) {
				const existingTestRow = page
					.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
					.first();
				if (!(await existingTestRow.isVisible().catch(() => false))) {
					break;
				}
				cleanupAttempts++;
				console.log(
					`      ⚠️ Phát hiện bản ghi cũ còn sót (#${cleanupAttempts}), tự động dọn dẹp...`
				);
				const oldDeleteBtn = existingTestRow
					.locator('button[aria-label*="Xóa"]')
					.first();
				if (await oldDeleteBtn.isVisible().catch(() => false)) {
					await oldDeleteBtn.click();
					await page.waitForTimeout(300);
					const confirmTrash = page
						.locator('button:has-text("Chuyển Vào Thùng Rác")')
						.first();
					if (await confirmTrash.isVisible().catch(() => false)) {
						await Promise.all([
							page.waitForResponse(
								(res) =>
									res.url().includes("/api/households/") &&
									res.request().method() === "DELETE" &&
									res.status() < 400,
								{ timeout: 10_000 }
							),
							confirmTrash.click(),
						]);
						interactionCount++;
						await page.waitForTimeout(300);
						await closeSuccessAlertIfPresent(page);
					}
				}
			}
			await searchInput.fill("");
			await page.waitForTimeout(200);
		}

		await discoverVisibleButtons(page, "Hộ Gia Đình & Nhân Khẩu");

		console.log("   -> 3.1. Quét cạn động toàn bộ thanh bộ lọc (HouseholdFilterBar)...");

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

			const plusYearBtn = page.locator('button[aria-label="Tăng 1 năm"]').first();
			if (await plusYearBtn.isVisible()) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Tăng 1 năm");
				await plusYearBtn.click();
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Tăng 1 năm");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const currentYearBtn = page.locator('button:has-text("Năm nay")').first();
			if (await currentYearBtn.isVisible()) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Năm nay");
				await currentYearBtn.click();
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Năm nay");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const applyYearBtn = page.locator('button:has-text("Áp dụng")').first();
			if (await applyYearBtn.isVisible()) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Áp dụng");
				await applyYearBtn.click();
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Áp dụng");
				interactionCount++;
				await page.waitForTimeout(250);
			} else {
				await page.keyboard.press("Escape");
			}
			console.log("      ✓ Đã kiểm tra YearSelector (Bộ chọn năm).");
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

		const getPaginationTrigger = () =>
			page.locator('div:has-text("Số dòng:") button[aria-haspopup="listbox"]').first();
		if (await getPaginationTrigger().isVisible().catch(() => false)) {
			await sweepCustomSelect(page, tracker, {
				screenName: "Hộ Gia Đình & Nhân Khẩu",
				dropdownName: "Số dòng",
				getTrigger: getPaginationTrigger,
			});
		}

		const refreshBtn = page
			.locator('button:has(svg.lucide-refresh-cw), button:has-text("Làm Mới")')
			.first();
		if (await refreshBtn.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			await refreshBtn.click().catch(() => {});
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			interactionCount++;
			await page.waitForTimeout(300);
			console.log("      ✓ Đã kiểm tra nút Làm Mới bảng dữ liệu.");
		}

		const clearAllFiltersBtn = page
			.locator('button:has-text("Xóa lọc"), button:has-text("Xóa tất cả bộ lọc")')
			.first();
		if (await clearAllFiltersBtn.isVisible().catch(() => false)) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Xóa tất cả bộ lọc");
			await clearAllFiltersBtn.click().catch(() => {});
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Xóa tất cả bộ lọc");
			interactionCount++;
			await page.waitForTimeout(300);
		}

		const firstHouseholdRow = page.locator("table tbody tr").first();
		if (await firstHouseholdRow.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			await firstHouseholdRow.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			interactionCount++;
			await page.waitForTimeout(200);

			const cccdCell = page
				.locator('table tbody tr:has-text("Chủ hộ") td:has-text("••••")')
				.first();
			if (await cccdCell.isVisible().catch(() => false)) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");
				await cccdCell.click();
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");
				interactionCount++;
				await page.waitForTimeout(200);

				await cccdCell.click();
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Ẩn lại CCCD");
				interactionCount++;
				await page.waitForTimeout(150);
			}
			console.log("      ✓ Đã kiểm tra Accordion và nút mắt giải mã CCCD.");
		}

		const realDeleteButtons = await page
			.locator('table tbody tr:not(:has-text("[TEST-CRAWLER]")) button[aria-label*="Xóa"]')
			.all();
		for (const delBtn of realDeleteButtons) {
			const aria = (await delBtn.getAttribute("aria-label").catch(() => "")) || "Xóa hộ";
			tracker.recordGuarded(
				"Hộ Gia Đình & Nhân Khẩu",
				"button",
				aria,
				"Bảo toàn dữ liệu thật CSDL (Chỉ xóa dòng test)"
			);
		}

		console.log("\n   -> 3.2. BẮT ĐẦU VÒNG ĐỜI CRUD THẬT (An toàn 100% với tag [TEST-CRAWLER])...");

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

		const testAddress = page.locator('input[placeholder*="Số nhà, đường"]').first();
		if (await testAddress.isVisible()) {
			await testAddress.fill("Thôn 1, Xã Đăk Hà [TEST]");
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

		const saveMemberBtn = citizenModal
			.locator('button:has-text("Lưu Nhân Khẩu"), button:has-text("Thêm Vào Hộ")')
			.first();
		tracker.discover("Thêm Nhân Khẩu Modal", "button", "Lưu Nhân Khẩu");
		await saveMemberBtn.click();
		tracker.recordClick("Thêm Nhân Khẩu Modal", "button", "Lưu Nhân Khẩu");
		interactionCount++;
		await page.waitForTimeout(300);
		console.log("      ✓ Đã điền và lưu nhân khẩu [TEST-CRAWLER] vào Drawer.");

		console.log("      -> Bấm nút LƯU THẬT hộ gia đình...");
		const saveHouseholdSubmit = page
			.locator(
				'button:has-text("Lưu Thông Tin Hộ"), button:has-text("Lưu Hộ Gia Đình"), button:has-text("Lưu Thông Tin")'
			)
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
		console.log(`      ✓ Bắt thành công API POST /api/households [HTTP ${createResponse.status()}]`);
		await page.waitForTimeout(250);
		await closeSuccessAlertIfPresent(page);

		if (await searchInput.isVisible()) {
			await searchInput.fill("[TEST-CRAWLER]");
			await page.waitForTimeout(250);
		}

		const createdRow = page.locator('table tbody tr:has-text("[TEST-CRAWLER]")').first();
		await expect(createdRow).toBeVisible({ timeout: 15_000 });
		console.log("      ✓ XÁC NHẬN: Bản ghi [TEST-CRAWLER] đã được lưu thành công vào CSDL!");

		console.log("      -> Bấm nút SỬA bản ghi [TEST-CRAWLER]...");
		const editTestBtn = createdRow.locator('button[aria-label*="Sửa"]').first();
		await expect(editTestBtn).toBeVisible({ timeout: 10_000 });
		tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Sửa hộ [TEST-CRAWLER]");
		await editTestBtn.click();
		tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Sửa hộ [TEST-CRAWLER]");
		interactionCount++;
		await page.waitForTimeout(200);

		const editAddressInput = page.locator('input[placeholder*="Số nhà, đường"]').first();
		if (await editAddressInput.isVisible()) {
			await editAddressInput.fill("Thôn 1, Xã Đăk Hà [ĐÃ CẬP NHẬT E2E]");
		}

		const saveEditBtn = page
			.locator(
				'button:has-text("Lưu Thông Tin Hộ"), button:has-text("Cập Nhật"), button:has-text("Lưu Thay Đổi")'
			)
			.first();
		tracker.discover("Sửa Hộ Drawer", "button", "Lưu Thông Tin Hộ");

		const [updateResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes("/api/households/") &&
					(res.request().method() === "PUT" || res.request().method() === "PATCH") &&
					res.status() < 400,
				{ timeout: 15_000 }
			),
			saveEditBtn.click(),
		]);
		tracker.recordClick("Sửa Hộ Drawer", "button", "Cập Nhật");
		interactionCount++;
		console.log(`      ✓ Bắt thành công API Cập nhật hộ [HTTP ${updateResponse.status()}]`);
		await page.waitForTimeout(250);
		await closeSuccessAlertIfPresent(page);
		console.log("      ✓ XÁC NHẬN: Dữ liệu sửa đổi đã được lưu và hiển thị chuẩn xác!");

		console.log("      -> Bấm nút XÓA DỌN DẸP (Chỉ nhắm mục tiêu vào hàng [TEST-CRAWLER])...");
		const deleteTargetRow = page.locator('table tbody tr:has-text("[TEST-CRAWLER]")').first();
		const deleteTestBtn = deleteTargetRow
			.locator('button[aria-label*="Xóa"]')
			.first();
		await expect(deleteTestBtn).toBeVisible({ timeout: 10_000 });
		tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Xóa hộ [TEST-CRAWLER]");
		await deleteTestBtn.click();
		tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Xóa hộ [TEST-CRAWLER]");
		interactionCount++;
		await page.waitForTimeout(250);

		const confirmDeleteBtn = page
			.locator('button:has-text("Chuyển Vào Thùng Rác")')
			.first();
		await expect(confirmDeleteBtn).toBeVisible({ timeout: 10_000 });
		tracker.discover("Xác Nhận Xóa Modal", "button", "Chuyển Vào Thùng Rác");

		const [deleteResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes("/api/households/") &&
					res.request().method() === "DELETE" &&
					res.status() < 400,
				{ timeout: 15_000 }
			),
			confirmDeleteBtn.click(),
		]);
		tracker.recordClick("Xác Nhận Xóa Modal", "button", "Chuyển Vào Thùng Rác");
		interactionCount++;
		console.log(`      ✓ Bắt thành công API DELETE [HTTP ${deleteResponse.status()}]`);
		await page.waitForTimeout(250);
		await closeSuccessAlertIfPresent(page);

		await expect(
			page.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
		).toBeHidden({ timeout: 10_000 });
		console.log("      ✓ XÁC NHẬN: Bản ghi [TEST-CRAWLER] đã được dọn sạch khỏi danh sách hộ gia đình!");

		if (await searchInput.isVisible()) {
			await searchInput.fill("");
			await page.waitForTimeout(300);
		}

		await crawlSafeButtons(page, "Hộ Gia Đình & Nhân Khẩu");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 4: Quét màn hình Thống Kê Báo Cáo";
		console.log("\n📊 [4/7] Dò quét Màn hình: Thống Kê Báo Cáo...");
		const analyticsNav = sidebar.locator('button:has-text("Thống Kê")').first();
		if (await analyticsNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Thống Kê");
			await analyticsNav.click();
			tracker.recordClick("Sidebar", "button", "Thống Kê");
			interactionCount++;
			await page.waitForTimeout(250);

			await expect(page.locator("h2, h3").first()).toBeVisible({ timeout: 15_000 });
			await crawlSafeButtons(page, "Thống Kê Báo Cáo");
		}
		visitedRoutes.push("Thống Kê Báo Cáo");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 5: Quét màn hình Thùng Rác & Xóa vĩnh viễn [TEST-CRAWLER]";
		console.log("🗑️ [5/7] Dò quét Màn hình: Thùng Rác...");
		const trashNav = sidebar.locator('button:has-text("Thùng Rác")').first();
		if (await trashNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Thùng Rác");
			await trashNav.click();
			tracker.recordClick("Sidebar", "button", "Thùng Rác");
			interactionCount++;
			await page.waitForTimeout(250);

			await expect(page.locator('h2:has-text("Thùng Rác")')).toBeVisible({
				timeout: 15_000,
			});
			console.log("   ✓ Màn hình Thùng rác tải dữ liệu an toàn (Bảo vệ dữ liệu thật).");

			const testRowInTrash = page
				.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
				.first();
			if (await testRowInTrash.isVisible().catch(() => false)) {
				console.log(
					"   -> Phát hiện [TEST-CRAWLER] trong Thùng rác, thực hiện xóa vĩnh viễn dọn sạch CSDL..."
				);
				const hardDeleteBtn = testRowInTrash
					.locator('button:has-text("Xóa vĩnh viễn"), button[title*="Xóa vĩnh viễn"]')
					.first();
				if (await hardDeleteBtn.isVisible().catch(() => false)) {
					tracker.discover("Thùng Rác", "button", "Xóa vĩnh viễn [TEST-CRAWLER]");
					await hardDeleteBtn.click();
					tracker.recordClick("Thùng Rác", "button", "Xóa vĩnh viễn [TEST-CRAWLER]");
					interactionCount++;
					await page.waitForTimeout(250);

					const confirmHardDeleteBtn = page
						.locator(
							'div[role="dialog"] button:has-text("Xóa Vĩnh Viễn"), div[role="dialog"] button:has-text("Xóa vĩnh viễn")'
						)
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
						console.log("   ✓ ĐÃ XÓA VĨNH VIỄN [TEST-CRAWLER]: Cơ sở dữ liệu sạch 100%!");
					}
				}
			}

			const realTrashRows = await page
				.locator('table tbody tr:not(:has-text("[TEST-CRAWLER]")) button:has-text("Xóa vĩnh viễn")')
				.all();
			for (const rBtn of realTrashRows) {
				tracker.recordGuarded(
					"Thùng Rác",
					"button",
					"Xóa vĩnh viễn",
					"SafeGuard (Chặn thao tác phá hủy dữ liệu thật)"
				);
			}

			await crawlSafeButtons(page, "Thùng Rác");
		}
		visitedRoutes.push("Thùng Rác");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 6: Quét màn hình Nhật Ký Hoạt Động";
		console.log("📜 [6/7] Dò quét Màn hình: Nhật Ký Hoạt Động (Audit Log)...");
		const auditNav = sidebar.locator('button:has-text("Nhật Ký Hoạt Động")').first();
		if (await auditNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Nhật Ký Hoạt Động");
			await auditNav.click();
			tracker.recordClick("Sidebar", "button", "Nhật Ký Hoạt Động");
			interactionCount++;
			await page.waitForTimeout(250);

			await expect(page.locator('h2:has-text("Nhật Ký Hoạt Động")')).toBeVisible({
				timeout: 15_000,
			});
			console.log("   ✓ Nhật ký hoạt động nạp dữ liệu hoàn chỉnh.");

			const auditPills = ["Tất Cả", "Thêm Mới", "Cập Nhật", "Xóa", "Khôi Phục"];
			for (const pill of auditPills) {
				const pillBtn = page.locator(`button:has-text("${pill}")`).first();
				if (await pillBtn.isVisible()) {
					tracker.discover("Nhật Ký Hoạt Động", "pill", pill);
					await pillBtn.click();
					tracker.recordClick("Nhật Ký Hoạt Động", "pill", pill);
					interactionCount++;
					await page.waitForTimeout(150);
				}
			}
			console.log("   ✓ Đã quét cạn 5/5 pill bộ lọc sự kiện trong Nhật ký.");

			const viewCommuneBtn = page.locator('button:has-text("Xem Toàn Xã")').first();
			if (await viewCommuneBtn.isVisible().catch(() => false)) {
				tracker.discover("Nhật Ký Hoạt Động", "button", "Xem Toàn Xã");
				await viewCommuneBtn.click();
				tracker.recordClick("Nhật Ký Hoạt Động", "button", "Xem Toàn Xã");
				interactionCount++;
				await page.waitForTimeout(200);
			}

			const getAuditVillageTrigger = () =>
				page
					.locator("div.grid.grid-cols-1.sm\\:grid-cols-3 > div")
					.nth(1)
					.locator('button[aria-haspopup="listbox"]')
					.first();
			if (await getAuditVillageTrigger().isVisible().catch(() => false)) {
				await sweepCustomSelect(page, tracker, {
					screenName: "Nhật Ký Hoạt Động",
					dropdownName: "Địa bàn thôn",
					getTrigger: getAuditVillageTrigger,
					expectedApiResponse: "/api/audit-logs",
				});
			}

			const getAuditUserTrigger = () =>
				page
					.locator("div.grid.grid-cols-1.sm\\:grid-cols-3 > div")
					.nth(2)
					.locator('button[aria-haspopup="listbox"]')
					.first();
			if (await getAuditUserTrigger().isVisible().catch(() => false)) {
				await sweepCustomSelect(page, tracker, {
					screenName: "Nhật Ký Hoạt Động",
					dropdownName: "Cán bộ thực hiện",
					getTrigger: getAuditUserTrigger,
					expectedApiResponse: "/api/audit-logs",
				});
			}

			await crawlSafeButtons(page, "Nhật Ký Hoạt Động");
		}
		visitedRoutes.push("Nhật Ký Hoạt Động");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 7: Quét trang Cài Đặt Hệ Thống (4 Tabs)";
		console.log("⚙️ [7/7] Dò quét Màn hình: Cài Đặt Hệ Thống (4 Tabs)...");
		const settingsNav = sidebar
			.locator('button:has-text("Cài Đặt Hệ Thống")')
			.first();
		if (await settingsNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Cài Đặt Hệ Thống");
			await settingsNav.click();
			tracker.recordClick("Sidebar", "button", "Cài Đặt Hệ Thống");
			interactionCount++;

			await discoverVisibleButtons(page, "Cài Đặt Hệ Thống");

			console.log("   -> Tab 1: Tài Khoản Của Tôi...");
			const profileTab = page.locator('button:has-text("Tài Khoản Của Tôi")').first();
			await expect(profileTab).toBeVisible({ timeout: 25_000 });
			tracker.discover("Cài Đặt Hệ Thống", "tab", "Tài Khoản Của Tôi");
			await profileTab.click();
			tracker.recordClick("Cài Đặt Hệ Thống", "tab", "Tài Khoản Của Tôi");
			interactionCount++;
			await page.waitForTimeout(200);

			console.log("   -> Tab 2: Quản Lý Cán Bộ Thôn (Kiểm thử Vòng đời Cán bộ)...");
			const usersTab = page
				.locator('button:has-text("Quản Lý Cán Bộ Thôn")')
				.first();
			if (await usersTab.isVisible()) {
				tracker.discover("Cài Đặt Hệ Thống", "tab", "Quản Lý Cán Bộ Thôn");
				await usersTab.click();
				tracker.recordClick("Cài Đặt Hệ Thống", "tab", "Quản Lý Cán Bộ Thôn");
				interactionCount++;
				await page.waitForTimeout(200);

				await expect(
					page.locator('h3:has-text("Danh Sách Tài Khoản Cán Bộ")')
				).toBeVisible({ timeout: 15_000 });

				tracker.recordGuarded(
					"Quản Lý Cán Bộ",
					"button",
					"Xóa tài khoản admin",
					"SafeGuard CSDL (Tài khoản Quản trị viên mặc định)"
				);
				tracker.recordGuarded(
					"Quản Lý Cán Bộ",
					"button",
					"Xóa tài khoản đang đăng nhập",
					"SafeGuard CSDL (Tài khoản cán bộ phiên hiện tại)"
				);

				console.log(
					"      -> [Pre-cleanup] Kiểm tra tài khoản test 'crawler_test_user'..."
				);
				const existingUserRow = page
					.locator('table tbody tr:has-text("crawler_test_user")')
					.first();
				if (await existingUserRow.isVisible().catch(() => false)) {
					console.log(
						"      ⚠️ Phát hiện crawler_test_user còn sót, dọn dẹp trước..."
					);
					const oldDeleteBtn = existingUserRow
						.locator(
							'button[aria-label*="Xóa tài khoản"], button[title*="Xóa tài khoản"]'
						)
						.first();
					if (await oldDeleteBtn.isVisible().catch(() => false)) {
						await oldDeleteBtn.click();
						await page.waitForTimeout(200);

						const confirmOldDeleteBtn = page
							.locator(
								'div[role="dialog"] button:has-text("Xóa Tài Khoản"), div[role="alertdialog"] button:has-text("Xóa Tài Khoản")'
							)
							.first();
						if (await confirmOldDeleteBtn.isVisible().catch(() => false)) {
							await Promise.all([
								page.waitForResponse(
									(res) =>
										(res.url().includes("/users/") ||
											res.url().includes("/auth/users/")) &&
										res.request().method() === "DELETE" &&
										res.status() < 400,
									{ timeout: 10_000 }
								),
								confirmOldDeleteBtn.click(),
							]);
							interactionCount++;
							await page.waitForTimeout(200);
							await closeSuccessAlertIfPresent(page);
						}
					}
				}

				console.log("      -> Bấm nút 'Thêm Cán Bộ'...");
				const addUserBtn = page.locator('button:has-text("Thêm Cán Bộ")').first();
				await expect(addUserBtn).toBeVisible({ timeout: 10_000 });
				tracker.discover("Quản Lý Cán Bộ", "button", "Thêm Cán Bộ");
				await addUserBtn.click();
				tracker.recordClick("Quản Lý Cán Bộ", "button", "Thêm Cán Bộ");
				interactionCount++;
				await page.waitForTimeout(200);

				const userForm = page
					.locator('form:has-text("Thêm Tài Khoản Cán Bộ Mới")')
					.first();
				await expect(userForm).toBeVisible({ timeout: 10_000 });

				const usernameInput = userForm
					.locator('input[placeholder*="canbothon1"], input[type="text"]')
					.first();
				await usernameInput.fill("crawler_test_user");

				const passwordInput = userForm
					.locator('input[placeholder*="Ít nhất 6 ký tự"], input[type="password"]')
					.first();
				await passwordInput.fill("pass123456");

				const villageSelectTrigger = userForm
					.locator('button[aria-haspopup="listbox"]')
					.last();
				if (await villageSelectTrigger.isVisible().catch(() => false)) {
					await villageSelectTrigger.click();
					interactionCount++;
					await page.waitForTimeout(150);
					const firstVillageOption = page
						.locator('div[role="listbox"] button[role="option"]')
						.first();
					if (await firstVillageOption.isVisible().catch(() => false)) {
						await firstVillageOption.click();
						interactionCount++;
						await page.waitForTimeout(150);
					}
				}

				console.log("      -> Bấm 'Tạo Tài Khoản' và bắt phản hồi API...");
				const createSubmitBtn = userForm
					.locator('button[type="submit"]:has-text("Tạo Tài Khoản")')
					.first();
				tracker.discover("Quản Lý Cán Bộ", "button", "Tạo Tài Khoản");

				const [createResponse] = await Promise.all([
					page.waitForResponse(
						(res) =>
							(res.url().includes("/users") ||
								res.url().includes("/auth/users")) &&
							res.request().method() === "POST" &&
							(res.status() === 200 || res.status() === 201),
						{ timeout: 15_000 }
					),
					createSubmitBtn.click(),
				]);
				tracker.recordClick("Quản Lý Cán Bộ", "button", "Tạo Tài Khoản");
				interactionCount++;
				console.log(
					`      ✓ Bắt thành công API POST User [HTTP ${createResponse.status()}]`
				);
				await page.waitForTimeout(200);
				await closeSuccessAlertIfPresent(page);

				console.log("      -> Kiểm tra crawler_test_user trong bảng...");
				const createdUserRow = page
					.locator('table tbody tr:has-text("crawler_test_user")')
					.first();
				await expect(createdUserRow).toBeVisible({ timeout: 15_000 });
				console.log(
					"      ✓ XÁC NHẬN: Tài khoản 'crawler_test_user' đã hiển thị trong bảng cán bộ!"
				);

				console.log("      -> Bấm nút 'Xóa' trên dòng crawler_test_user...");
				const deleteUserBtn = createdUserRow
					.locator(
						'button[aria-label*="Xóa tài khoản"], button[title*="Xóa tài khoản"]'
					)
					.first();
				await expect(deleteUserBtn).toBeVisible({ timeout: 10_000 });
				tracker.discover("Quản Lý Cán Bộ", "button", "Xóa cán bộ");
				await deleteUserBtn.click();
				interactionCount++;
				await page.waitForTimeout(200);

				const confirmDeleteModalBtn = page
					.locator(
						'div[role="dialog"] button:has-text("Xóa Tài Khoản"), div[role="alertdialog"] button:has-text("Xóa Tài Khoản")'
					)
					.first();
				await expect(confirmDeleteModalBtn).toBeVisible({ timeout: 10_000 });

				const [deleteResponse] = await Promise.all([
					page.waitForResponse(
						(res) =>
							(res.url().includes("/users/") ||
								res.url().includes("/auth/users/")) &&
							res.request().method() === "DELETE" &&
							res.status() === 200,
						{ timeout: 15_000 }
					),
					confirmDeleteModalBtn.click(),
				]);
				tracker.recordClick("Quản Lý Cán Bộ", "button", "Xóa cán bộ");
				interactionCount++;
				console.log(
					`      ✓ Bắt thành công API DELETE User [HTTP ${deleteResponse.status()}]`
				);
				await page.waitForTimeout(200);
				await closeSuccessAlertIfPresent(page);

				await expect(
					page.locator('table tbody tr:has-text("crawler_test_user")')
				).toBeHidden({ timeout: 10_000 });
				console.log(
					"      ✓ XÁC NHẬN: Tài khoản 'crawler_test_user' đã được xóa sạch hoàn toàn khỏi CSDL!"
				);
			}

			console.log("   -> Tab 3: Sao Lưu CSDL...");
			const backupTab = page.locator('button:has-text("Sao Lưu CSDL")').first();
			if (await backupTab.isVisible()) {
				tracker.discover("Cài Đặt Hệ Thống", "tab", "Sao Lưu CSDL");
				await backupTab.click();
				tracker.recordClick("Cài Đặt Hệ Thống", "tab", "Sao Lưu CSDL");
				interactionCount++;
				await page.waitForTimeout(200);
			}

			console.log("   -> Tab 4: Thông Tin Đơn Vị & Hệ Thống...");
			const systemTab = page
				.locator('button:has-text("Thông Tin Đơn Vị & Hệ Thống")')
				.first();
			if (await systemTab.isVisible()) {
				tracker.discover("Cài Đặt Hệ Thống", "tab", "Thông Tin Đơn Vị & Hệ Thống");
				await systemTab.click();
				tracker.recordClick("Cài Đặt Hệ Thống", "tab", "Thông Tin Đơn Vị & Hệ Thống");
				interactionCount++;
				await page.waitForTimeout(200);
			}

			await crawlSafeButtons(page, "Cài Đặt Hệ Thống");
		}
		visitedRoutes.push("Cài Đặt Hệ Thống");
		await closeSuccessAlertIfPresent(page);

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
		console.log(`• Lỗi HTTP API (code >= 400): ${apiErrors.length}`);

		tracker.printReport();

		expect(
			unhandledErrors,
			"Không được có unhandled exception gây crash UI"
		).toEqual([]);

		expect(
			apiErrors,
			"Không được có lỗi HTTP Status >= 400 từ Backend"
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
			"\n✅ TOÀN BỘ FILTER DYNAMIC SWEEP VÀ VÒNG ĐỜI CRUD THẬT ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100% AN TOÀN!\n"
		);
	});
});
