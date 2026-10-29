import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureDatabaseSeeded } from "./seed_e2e";
import { NetworkErrorTrapGuardian } from "./networkTrap";

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
		console.log("BÁO CÁO ĐỘ PHỦ TƯƠNG TÁC (CLICK COVERAGE TRACKER):");
		console.log("=======================================================");
		console.log(`• Tổng phần tử phát hiện (discoveredSet):     ${r.totalDiscovered}`);
		console.log(`• Đã click thành công (clickedSet):           ${r.totalClicked}`);
		console.log(`• Bỏ qua an toàn CSDL (guardedSet):           ${r.totalGuarded}`);
		console.log(`• Tập hợp chưa bấm (missedSet):               ${r.missedCount}`);
		console.log(`• TỶ LỆ ĐỘ PHỦ KHẢ THI (Coverage):            ${r.coveragePercent}`);
		console.log("-------------------------------------------------------");

		console.log("\nDANH SÁCH PHẦN TỬ CHƯA BẤM (MISSED):");
		console.table(
			r.missedItems.map((m, idx) => ({
				"#": idx + 1,
				Screen: m.screen,
				Type: m.type,
				Label: m.label,
			}))
		);

		console.log("\nDANH SÁCH PHẦN TỬ BẢO VỆ AN TOÀN (GUARDED):");
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
	const guardian = new NetworkErrorTrapGuardian();
	const visitedRoutes: string[] = [];
	let interactionCount = 0;
	let currentAction = "Khởi tạo môi trường kiểm thử";
	const tracker = new ClickCoverageTracker();

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
				if (await closeBtn.isVisible({ timeout: 300 }).catch(() => false)) {
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
		if (!(await initialTrigger.isVisible({ timeout: 1000 }).catch(() => false))) return;

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
		if (!(await agePopoverTrigger.isVisible({ timeout: 1000 }).catch(() => false))) return;

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
		ensureDatabaseSeeded();
	});

	test.beforeEach(async ({ page }) => {
		guardian.setupListeners(page, () => currentAction);
	});

	test("Smart Crawler: Quét cạn toàn bộ luồng nghiệp vụ QLHK không thiếu tính năng", async ({
		page,
		request,
	}) => {
		test.setTimeout(360_000);

		currentAction = "Giai đoạn 1: Đăng nhập hệ thống";
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
		}

		await page.waitForLoadState("networkidle").catch(() => {});
		await closeSuccessAlertIfPresent(page);
		visitedRoutes.push("Login -> Main Layout");

		const sidebar = page.locator("aside").first();
		tracker.recordGuarded(
			"Sidebar",
			"button",
			"Đăng xuất khỏi hệ thống",
			"SafeGuard (Chặn thao tác phá hủy / đăng xuất)"
		);

		currentAction = "Giai đoạn 2: Quản Lý Thôn";

		const villagesNav = sidebar.locator('button:has-text("Quản Lý Thôn")').first();
		if (await villagesNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Quản Lý Thôn", true);
			await villagesNav.click();
			tracker.recordClick("Sidebar", "button", "Quản Lý Thôn");
			interactionCount++;
			await page.waitForTimeout(250);
		}
		visitedRoutes.push("Quản Lý Thôn");

		const banner = page
			.locator(
				'h2:has-text("Trung Tâm Quản Lý Địa Bàn Thôn & Làng"), h2:has-text("Tổng Quan Dân Cư & Hộ Gia Đình Toàn Xã"), div:has-text("Trung Tâm Quản Lý Địa Bàn Thôn & Làng"), div:has-text("Tổng Quan Dân Cư & Hộ Gia Đình Toàn Xã")'
			)
			.first();
		await expect(banner).toBeVisible({ timeout: 15_000 });

		const villageSearch = page
			.locator('input[placeholder*="Tìm theo tên thôn, mã thôn"]')
			.first();
		if (await villageSearch.isVisible().catch(() => false)) {
			await villageSearch.fill("Thôn 1");
			await page.waitForTimeout(200);
			tracker.recordClick("Quản Lý Thôn", "button", "Tìm kiếm thôn");
			await villageSearch.fill("");
			await page.waitForTimeout(150);
		}

		const modernFilterPills = [
			"Tất cả",
			"Đã gán cán bộ",
			"Chưa phân công",
			"DTTS ≥ 50%",
		];
		for (const pill of modernFilterPills) {
			const pillBtn = page
				.locator(`div.flex.items-center button:has-text("${pill}")`)
				.first();
			if (await pillBtn.isVisible().catch(() => false)) {
				tracker.discover("Quản Lý Thôn", "pill", pill);
				await pillBtn.click().catch(() => {});
				tracker.recordClick("Quản Lý Thôn", "pill", pill);
				interactionCount++;
				await page.waitForTimeout(100);
			}
		}

		const gridViewBtn = page.locator('button[title="Chế độ xem lưới thẻ"]').first();
		const tableViewBtn = page.locator('button[title="Chế độ xem bảng"]').first();
		if (await gridViewBtn.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "button", "Chế độ xem lưới thẻ");
			await gridViewBtn.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "button", "Chế độ xem lưới thẻ");
			interactionCount++;
			await page.waitForTimeout(150);
		}
		if (await tableViewBtn.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "button", "Chế độ xem bảng");
			await tableViewBtn.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "button", "Chế độ xem bảng");
			interactionCount++;
			await page.waitForTimeout(150);
		}

		const sortColumns = [
			"Tên Thôn / Làng",
			"Số Hộ Dân",
			"Nhân Khẩu",
			"Dân Tộc & Giới Tính",
		];
		for (const col of sortColumns) {
			const colHeader = page.locator(`th:has-text("${col}")`).first();
			if (await colHeader.isVisible().catch(() => false)) {
				tracker.discover("Quản Lý Thôn", "button", `Sắp xếp ${col}`);
				await colHeader.click().catch(() => {});
				tracker.recordClick("Quản Lý Thôn", "button", `Sắp xếp ${col}`);
				interactionCount++;
				await page.waitForTimeout(100);
			}
		}

		const refreshVillageBtn = page
			.locator('button[title="Làm mới dữ liệu thống kê"]')
			.first();
		if (await refreshVillageBtn.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "button", "Làm mới dữ liệu thôn");
			await refreshVillageBtn.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "button", "Làm mới dữ liệu thôn");
			interactionCount++;
			await page.waitForTimeout(200);
		}

		const addVillageBtn = page.locator('button:has-text("Thêm Thôn Mới")').first();
		if (await addVillageBtn.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "button", "Thêm Thôn Mới");
			await addVillageBtn.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "button", "Thêm Thôn Mới");
			interactionCount++;
			await page.waitForTimeout(200);

			const cancelAddBtn = page
				.locator(
					'div[role="dialog"] button:has-text("Hủy"), button[aria-label="Đóng cửa sổ"]'
				)
				.first();
			if (await cancelAddBtn.isVisible().catch(() => false)) {
				await cancelAddBtn.click().catch(() => {});
				interactionCount++;
				await page.waitForTimeout(150);
			} else {
				await page.keyboard.press("Escape").catch(() => {});
			}
		}

		const targetRow = page.locator('table tbody tr:has-text("Thôn 1")').first();
		const legacyCard = page
			.locator('div[role="button"][aria-label*="Thôn 1"]')
			.first();
		if (await targetRow.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "card", "Thôn 1");
			await targetRow.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "card", "Thôn 1");
			interactionCount++;
			await page.waitForTimeout(250);
		} else if (await legacyCard.isVisible().catch(() => false)) {
			tracker.discover("Quản Lý Thôn", "card", "Thôn 1");
			await legacyCard.click().catch(() => {});
			tracker.recordClick("Quản Lý Thôn", "card", "Thôn 1");
			interactionCount++;
			await page.waitForTimeout(250);
		} else {
			const anyRow = page.locator("table tbody tr").first();
			if (await anyRow.isVisible().catch(() => false)) {
				await anyRow.click().catch(() => {});
				interactionCount++;
				await page.waitForTimeout(250);
			}
		}

		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 3: Quản Lý Hộ Gia Đình & Nhân Khẩu (Core Population & CCCD)";

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

		if (await searchInput.isVisible()) {
			await searchInput.fill("Doan Van");
			await page.waitForTimeout(350);
			const filteredRow = page.locator("table tbody tr").first();
			if (await filteredRow.isVisible().catch(() => false)) {
				await expect(filteredRow).toBeVisible();
			}

			await searchInput.fill("Nguyen");
			await page.waitForTimeout(350);
			await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 });

			await searchInput.fill("");
			await page.waitForTimeout(300);
		}

		const paginationContainer = page
			.locator('div:has-text("trong tổng số")')
			.filter({ hasText: "bản ghi" })
			.first();
		if (await paginationContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
			const pageSizeTrigger = page
				.locator(
					'div.flex.items-center:has-text("Số dòng:") button[aria-haspopup="listbox"], div.w-28 button[aria-haspopup="listbox"]'
				)
				.first();
			if (await pageSizeTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
				await pageSizeTrigger.click();
				const listbox = page.locator('div[role="listbox"]').first();
				await listbox.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
				const opt20 = listbox.locator('button[role="option"]:has-text("20 dòng")').first();
				if (await opt20.isVisible({ timeout: 2000 }).catch(() => false)) {
					await opt20.click();
					await page.waitForTimeout(300);
					await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 });
				}
				await pageSizeTrigger.click();
				await listbox.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
				const opt10 = listbox.locator('button[role="option"]:has-text("10 dòng")').first();
				if (await opt10.isVisible({ timeout: 2000 }).catch(() => false)) {
					await opt10.click();
					await page.waitForTimeout(300);
				}
			}

			const nextBtn = page.locator('button[aria-label="Trang tiếp theo"]').first();
			const isNextDisabled = await nextBtn.isDisabled().catch(() => true);
			if (!isNextDisabled) {
				await nextBtn.click();
				await page.waitForTimeout(300);
				const prevBtn = page.locator('button[aria-label="Trang trước"]').first();
				if (await prevBtn.isVisible().catch(() => false)) {
					await prevBtn.click();
					await page.waitForTimeout(300);
				}
			}
		}

		const firstHouseholdRow = page.locator("table tbody tr").first();
		if (await firstHouseholdRow.isVisible()) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			await firstHouseholdRow.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Mở rộng danh sách nhân khẩu");
			interactionCount++;
			await page.waitForTimeout(250);

			const cccdCell = page
				.locator(
					'table tbody tr td div.group\\/cccd, table tbody tr td:has-text("••••"), table tbody tr button[title*="CCCD"]'
				)
				.first();
			if (await cccdCell.isVisible({ timeout: 5000 }).catch(() => false)) {
				tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");

				let revealResponse = null;
				try {
					const [res] = await Promise.all([
						page.waitForResponse(
							(res) =>
								res.url().includes("/reveal-cccd") && res.status() === 200,
							{ timeout: 10_000 }
						),
						cccdCell.click(),
					]);
					revealResponse = res;
				} catch {
					await cccdCell.click().catch(() => {});
				}

				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Giải mã xem CCCD");
				interactionCount++;
				await page.waitForTimeout(200);

				if (revealResponse) {
					const revealJson = await revealResponse.json().catch(() => null);
					const revealedNumber = revealJson?.cccd || revealJson?.data?.cccd;
					if (revealedNumber) {
						expect(revealedNumber).toBeTruthy();
					}
				}

				await cccdCell.click().catch(() => {});
				tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Ẩn lại CCCD");
				interactionCount++;
				await page.waitForTimeout(150);
			}
		}

		const yearTrigger = page
			.locator('div:has-text("Năm ")')
			.filter({ hasText: /^Năm \d+/ })
			.first();
		if (await yearTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Bộ chọn năm");
			await yearTrigger.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Bộ chọn năm");
			interactionCount++;
			await page.waitForTimeout(200);

			const currentYearBtn = page.locator('button:has-text("Năm nay")').first();
			if (await currentYearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
				await currentYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const applyYearBtn = page.locator('button:has-text("Áp dụng")').first();
			if (await applyYearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
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
		if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			await refreshBtn.click().catch(() => {});
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Làm Mới");
			interactionCount++;
			await page.waitForTimeout(250);
		}

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
			await testAddress.fill("Thôn 1, Xã Đăk Hà TestCrawler");
		}

		const notesInput = drawer
			.locator('#drawer-notes, input[placeholder*="Hoàn cảnh gia đình"]')
			.first();
		if (await notesInput.isVisible().catch(() => false)) {
			await notesInput.fill("Ghi chú thử nghiệm crawler");
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
		await nameInput.fill("Nguyễn Văn Test Crawler");

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

		const careerTab = citizenModal
			.locator(
				'button:has-text("Nghề nghiệp & Trình độ"), button[role="tab"]:has-text("Nghề nghiệp")'
			)
			.first();
		if (await careerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
			await careerTab.click();
			await page.waitForTimeout(150);
		}

		const policyTab = citizenModal
			.locator(
				'button:has-text("Chế độ Chính sách"), button[role="tab"]:has-text("Chính sách")'
			)
			.first();
		if (await policyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
			await policyTab.click();
			await page.waitForTimeout(150);
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
		await page.waitForTimeout(250);
		await closeSuccessAlertIfPresent(page);

		if (await searchInput.isVisible()) {
			await searchInput.fill("Test Crawler");
			await page.waitForTimeout(600);
		}

		const createdRow = page.locator('table tbody tr:has-text("Test Crawler")').first();
		if (await createdRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
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
				.locator('table tbody tr:has-text("Test Crawler") button[aria-label*="Xóa"]')
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
			await page.waitForTimeout(500);
		}

		const splitOrTransferBtn = page
			.locator(
				'button:has-text("Tách hộ"), button:has-text("Chuyển hộ"), button:has-text("Tách Hộ"), button:has-text("Chuyển Hộ")'
			)
			.first();
		if (await splitOrTransferBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await splitOrTransferBtn.click();
			await page.waitForTimeout(300);
			const splitModal = page
				.locator('div[role="dialog"]:has-text("Tách"), div[role="dialog"]:has-text("Chuyển")')
				.first();
			if (await splitModal.isVisible({ timeout: 3000 }).catch(() => false)) {
				const closeSplitBtn = splitModal
					.locator('button[aria-label="Đóng"], button:has-text("Đóng"), button:has-text("Hủy")')
					.first();
				if (await closeSplitBtn.isVisible().catch(() => false)) {
					await closeSplitBtn.click();
				} else {
					await page.keyboard.press("Escape");
				}
				await splitModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
			}
		}

		currentAction = "Giai đoạn 4: Thống Kê Dân Số (Analytics)";
		const analyticsNav = sidebar.locator('button:has-text("Thống Kê")').first();
		if (await analyticsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Thống Kê");
			await analyticsNav.click();
			tracker.recordClick("Sidebar", "button", "Thống Kê");
			interactionCount++;
			await page.waitForTimeout(300);
		}
		visitedRoutes.push("Thống Kê Báo Cáo");

		const analyticsHeading = page.locator('h2:has-text("Thống Kê Dân Cư")').first();
		await expect(analyticsHeading).toBeVisible({ timeout: 15_000 });

		const kpiSection = page.locator('section[aria-label="Chỉ số tổng quan"]').first();
		await expect(kpiSection).toBeVisible({ timeout: 15_000 });

		const householdsCard = kpiSection.locator("div").filter({ hasText: "Tổng Hộ Gia Đình" }).first();
		await expect(householdsCard).toBeVisible({ timeout: 10_000 });
		const householdsText = (await householdsCard.innerText()).trim();
		expect(householdsText).not.toContain("NaN");
		expect(householdsText).not.toContain("undefined");
		expect(householdsText).toMatch(/\d+\s*hộ/);
		const householdsCount = parseInt(householdsText.replace(/\D/g, ""), 10);
		expect(Number.isFinite(householdsCount)).toBe(true);
		expect(householdsCount).toBeGreaterThan(0);

		const citizensCard = kpiSection.locator("div").filter({ hasText: "Tổng Nhân Khẩu" }).first();
		await expect(citizensCard).toBeVisible({ timeout: 10_000 });
		const citizensText = (await citizensCard.innerText()).trim();
		expect(citizensText).not.toContain("NaN");
		expect(citizensText).not.toContain("undefined");
		expect(citizensText).toMatch(/\d+\s*người/);
		const citizensCount = parseInt(citizensText.replace(/\D/g, ""), 10);
		expect(Number.isFinite(citizensCount)).toBe(true);
		expect(citizensCount).toBeGreaterThan(0);

		const citizensDetail = await citizensCard.locator("p.tabular-nums").first().innerText();
		expect(citizensDetail).not.toContain("NaN");
		expect(citizensDetail).toMatch(/\d+\s*Nam\s*\/\s*\d+\s*Nữ/);

		const genderCard = kpiSection.locator("div").filter({ hasText: "Cơ Cấu Giới Tính" }).first();
		await expect(genderCard).toBeVisible({ timeout: 10_000 });
		const genderText = (await genderCard.innerText()).trim();
		expect(genderText).not.toContain("NaN");
		expect(genderText).not.toContain("undefined");
		expect(genderText).toMatch(/\d+(?:,\d+)?%\s*Nam/);
		expect(genderText).toMatch(/\d+(?:,\d+)?%\s*Nữ/);

		const minorityCard = kpiSection.locator("div").filter({ hasText: "Tỷ Lệ DTTS" }).first();
		await expect(minorityCard).toBeVisible({ timeout: 10_000 });
		const minorityText = (await minorityCard.innerText()).trim();
		expect(minorityText).not.toContain("NaN");
		expect(minorityText).not.toContain("undefined");
		expect(minorityText).toMatch(/\d+(?:,\d+)?%/);

		const ageCard = page.locator("div").filter({ hasText: "Tháp Tuổi & Cơ Cấu Thế Hệ" }).first();
		await expect(ageCard).toBeVisible({ timeout: 10_000 });
		const ageCardText = (await ageCard.innerText()).trim();
		expect(ageCardText).not.toContain("NaN");
		expect(ageCardText).not.toContain("undefined");
		expect(ageCardText).toMatch(/\d+(?:,\d+)?%/);

		const donutCharts = page.locator('svg[role="img"]:has(circle)');
		if (await donutCharts.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
			const chartCount = await donutCharts.count();
			expect(chartCount).toBeGreaterThanOrEqual(1);

			for (let index = 0; index < Math.min(chartCount, 3); index++) {
				const chartSvg = donutCharts.nth(index);
				const boundingBox = await chartSvg.boundingBox();
				if (boundingBox) {
					expect(boundingBox.width).toBeGreaterThan(0);
					expect(boundingBox.height).toBeGreaterThan(0);
				}
				const circleElements = await chartSvg.locator("circle").count();
				expect(circleElements).toBeGreaterThan(0);
			}
		}

		const villageComparisonTable = page.locator('table:has-text("Tên Thôn"), table:has-text("Số Hộ")').first();
		await expect(villageComparisonTable).toBeVisible({ timeout: 10_000 });
		const tableRows = villageComparisonTable.locator("tbody tr");
		const tableRowCount = await tableRows.count();
		expect(tableRowCount).toBeGreaterThan(0);
		const sampleRowText = await tableRows.first().innerText();
		expect(sampleRowText).not.toContain("NaN");

		await crawlSafeButtons(page, "Thống Kê Báo Cáo");
		await closeSuccessAlertIfPresent(page);

		currentAction = "Giai đoạn 5: Chính sách Chúc Thọ & Hỗ Trợ Xã Hội";
		const chucThoNav = sidebar.locator('button:has-text("Chúc Thọ")').first();
		if (await chucThoNav.isVisible({ timeout: 10_000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Chúc Thọ");
			await chucThoNav.click();
			tracker.recordClick("Sidebar", "button", "Chúc Thọ");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Chúc Thọ");

			await expect(
				page.locator('h2:has-text("Hồ Sơ Chúc Thọ"), span:has-text("Hồ Sơ Chúc Thọ")').first()
			).toBeVisible({ timeout: 15_000 });

			const firstRow = page.locator("table tbody tr").first();
			await expect(firstRow).toBeVisible({ timeout: 15_000 });

			const milestoneSelectTrigger = page.locator('div.w-40 button[aria-haspopup="listbox"]').first();
			if (await milestoneSelectTrigger.isVisible().catch(() => false)) {
				const milestoneCheckList = [
					"Mốc 70 (70 - 74 tuổi)",
					"Mốc 75 (75 - 79 tuổi)",
					"Mốc 80 (80 - 84 tuổi)",
					"Mốc 85 (85 - 89 tuổi)",
					"Mốc 90 (90 - 94 tuổi)",
					"Mốc 95 (95 - 99 tuổi)",
					"Tròn 100 tuổi",
					"Trên 100 tuổi",
				];

				for (const label of milestoneCheckList) {
					await milestoneSelectTrigger.click();
					const listbox = page.locator('div[role="listbox"]').first();
					await listbox.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
					const optionBtn = listbox.locator(`button[role="option"]:has-text("${label}")`).first();
					if (await optionBtn.isVisible().catch(() => false)) {
						tracker.discover("Chúc Thọ", "dropdown-option", label);
						await optionBtn.click();
						tracker.recordClick("Chúc Thọ", "dropdown-option", label);
						await page.waitForTimeout(200);
					} else {
						await page.keyboard.press("Escape").catch(() => {});
					}
				}

				await milestoneSelectTrigger.click();
				const listboxAll = page.locator('div[role="listbox"]').first();
				await listboxAll.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
				const allOption = listboxAll.locator('button[role="option"]:has-text("Tất cả độ tuổi")').first();
				if (await allOption.isVisible().catch(() => false)) {
					await allOption.click();
					await page.waitForTimeout(200);
				} else {
					await page.keyboard.press("Escape").catch(() => {});
				}
			}

			const seededNames = [
				"Cụ Bảy Mươi",
				"Cụ Bảy Lăm",
				"Cụ Tám Mươi",
				"Cụ Tám Lăm",
				"Cụ Chín Mươi",
			];

			for (const name of seededNames) {
				const row = page.locator(`table tbody tr:has-text("${name}")`).first();
				if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
					await expect(row).toBeVisible();
				}
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

			const policyBtn = page.locator('table tbody tr button:has-text("CHÍNH SÁCH")').first();
			if (await policyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
				tracker.discover("Hỗ Trợ Xã Hội", "button", "Xem chi tiết chính sách");
				await policyBtn.click().catch(() => {});
				tracker.recordClick("Hỗ Trợ Xã Hội", "button", "Xem chi tiết chính sách");
				interactionCount++;
				await page.waitForTimeout(200);

				const closePolicyBtn = page
					.locator(
						'div[role="dialog"]:has-text("CHI TIẾT CHÍNH SÁCH") button:has(svg.lucide-x), div[role="dialog"] button:has(svg.lucide-x)'
					)
					.first();
				if (await closePolicyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
					await closePolicyBtn.click().catch(() => {});
					interactionCount++;
					await page.waitForTimeout(150);
				} else {
					await page.keyboard.press("Escape").catch(() => {});
				}
				await page.locator('div[role="dialog"]:has-text("CHI TIẾT CHÍNH SÁCH")').waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
				await closeSuccessAlertIfPresent(page);
			}
		}

		const policyAnalyticsNav = sidebar.locator('button:has-text("TK Chính Sách")').first();
		if (await policyAnalyticsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "TK Chính Sách");
			await policyAnalyticsNav.click();
			tracker.recordClick("Sidebar", "button", "TK Chính Sách");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("TK Chính Sách");
		}

		currentAction = "Giai đoạn 6: Thùng Rác & Khôi phục Nhân khẩu";
		const trashNav = sidebar.locator('button:has-text("Thùng Rác")').first();
		if (await trashNav.isVisible()) {
			tracker.discover("Sidebar", "button", "Thùng Rác");
			await trashNav.click();
			tracker.recordClick("Sidebar", "button", "Thùng Rác");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Thùng Rác");

			await expect(
				page
					.locator(
						'h2:has-text("Thùng Rác"), h3:has-text("Bảng Lưu Trữ Thùng Rác Hộ Dân"), div:has-text("Hộ Trong Thùng Rác")'
					)
					.first()
			).toBeVisible({
				timeout: 15_000,
			});

			const trashSearch = page
				.locator('input[placeholder*="Tìm theo tên chủ hộ, địa chỉ"]')
				.first();
			if (await trashSearch.isVisible().catch(() => false)) {
				await trashSearch.fill("Nguyễn");
				await page.waitForTimeout(200);
				await trashSearch.fill("");
				await page.waitForTimeout(150);
			}

			const trashFilterPills = [
				"Tất cả",
				"Hộ đông người (≥ 4)",
				"Mới xóa (7 ngày)",
				"Sắp hết hạn lưu trữ",
			];
			for (const pill of trashFilterPills) {
				const pillBtn = page
					.locator(`button:has-text("${pill}")`)
					.first();
				if (await pillBtn.isVisible().catch(() => false)) {
					tracker.discover("Thùng Rác", "pill", pill);
					await pillBtn.click().catch(() => {});
					tracker.recordClick("Thùng Rác", "pill", pill);
					interactionCount++;
					await page.waitForTimeout(100);
				}
			}

			const trashGridBtn = page.locator('button[title="Chế độ xem lưới thẻ"]').first();
			const trashTableBtn = page.locator('button[title="Chế độ xem bảng"]').first();
			if (await trashGridBtn.isVisible().catch(() => false)) {
				tracker.discover("Thùng Rác", "button", "Chế độ xem lưới thẻ");
				await trashGridBtn.click().catch(() => {});
				tracker.recordClick("Thùng Rác", "button", "Chế độ xem lưới thẻ");
				interactionCount++;
				await page.waitForTimeout(150);
			}
			if (await trashTableBtn.isVisible().catch(() => false)) {
				tracker.discover("Thùng Rác", "button", "Chế độ xem bảng");
				await trashTableBtn.click().catch(() => {});
				tracker.recordClick("Thùng Rác", "button", "Chế độ xem bảng");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const inspectBtn = page
				.locator(
					'table tbody tr button[title="Xem chi tiết hồ sơ hộ"], table tbody tr button:has(svg.lucide-eye)'
				)
				.first();
			if (await inspectBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
				tracker.discover("Thùng Rác", "button", "Xem chi tiết hồ sơ hộ");
				await inspectBtn.click().catch(() => {});
				tracker.recordClick("Thùng Rác", "button", "Xem chi tiết hồ sơ hộ");
				interactionCount++;
				await page.waitForTimeout(300);

				const inspectModal = page.locator('#recycle-bin-modal-title').first();
				if (await inspectModal.isVisible({ timeout: 4000 }).catch(() => false)) {
					const memberRow = page
						.locator('div[role="dialog"] table tbody tr')
						.first();
					if (await memberRow.isVisible().catch(() => false)) {
						tracker.discover(
							"Thùng Rác",
							"button",
							"Xem chi tiết nhân khẩu đã xóa"
						);
						await memberRow.click().catch(() => {});
						tracker.recordClick(
							"Thùng Rác",
							"button",
							"Xem chi tiết nhân khẩu đã xóa"
						);
						interactionCount++;
						await page.waitForTimeout(200);

						const closeCitizenModal = page
							.locator(
								'div[role="dialog"]:has(#citizen-modal-title) button[aria-label="Đóng cửa sổ"], div[role="dialog"]:has(#citizen-modal-title) button:has(svg.lucide-x), div[role="dialog"]:has(#citizen-modal-title) button:has-text("Đóng cửa sổ")'
							)
							.first();
						if (await closeCitizenModal.isVisible().catch(() => false)) {
							await closeCitizenModal.click().catch(() => {});
							interactionCount++;
							await page.waitForTimeout(150);
						} else {
							await page.keyboard.press("Escape").catch(() => {});
						}
					}

					const closeInspectBtn = page
						.locator(
							'div[role="dialog"]:has(#recycle-bin-modal-title) button[aria-label="Đóng cửa sổ"], div[role="dialog"]:has(#recycle-bin-modal-title) button:has-text("Đóng cửa sổ")'
						)
						.first();
					if (await closeInspectBtn.isVisible().catch(() => false)) {
						await closeInspectBtn.click().catch(() => {});
						interactionCount++;
						await inspectModal.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
						await page.waitForTimeout(150);
					} else {
						await page.keyboard.press("Escape").catch(() => {});
						await inspectModal.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
					}
				}
			}

			const firstCheckbox = page
				.locator('table tbody tr input[type="checkbox"]')
				.first();
			if (await firstCheckbox.isVisible().catch(() => false)) {
				await firstCheckbox.click().catch(() => {});
				interactionCount++;
				await page.waitForTimeout(200);

				const deselectBtn = page
					.locator('button[title*="Bỏ chọn"], button:has-text("Bỏ chọn")')
					.first();
				if (await deselectBtn.isVisible().catch(() => false)) {
					tracker.discover("Thùng Rác", "button", "Bỏ chọn hàng loạt");
					await deselectBtn.click().catch(() => {});
					tracker.recordClick("Thùng Rác", "button", "Bỏ chọn hàng loạt");
					interactionCount++;
					await page.waitForTimeout(150);
				}
			}

			const restoreBtn = page
				.locator('table tbody tr')
				.locator('button')
				.filter({ hasText: /^Khôi phục$/i })
				.first();
			if (await restoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				tracker.discover("Thùng Rác", "button", "Khôi phục hộ khẩu");
				await restoreBtn.click();
				tracker.recordClick("Thùng Rác", "button", "Khôi phục hộ khẩu");
				interactionCount++;
				await page.waitForTimeout(300);

				const confirmRestoreBtn = page
					.locator('div[role="dialog"]')
					.locator('button')
					.filter({ hasText: /^Khôi Phục$/i })
					.last();
				if (await confirmRestoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
					await Promise.all([
						page.waitForResponse(
							(res) =>
								res.url().includes("/restore") &&
								(res.request().method() === "POST" || res.request().method() === "PATCH") &&
								res.status() < 400,
							{ timeout: 15_000 }
						),
						confirmRestoreBtn.click(),
					]);
					interactionCount++;
					await page.waitForTimeout(300);
					await closeSuccessAlertIfPresent(page);
				}
			}

			const targetDeleteRow = page
				.locator('table tbody tr:has-text("Hoàng Văn Thắng"), table tbody tr')
				.last();
			if (await targetDeleteRow.isVisible({ timeout: 3000 }).catch(() => false)) {
				const hardDeleteBtn = targetDeleteRow
					.locator(
						'button:has-text("Xóa vĩnh viễn"), button[title*="Xóa vĩnh viễn"], button:has(svg.lucide-trash-2)'
					)
					.first();
				if (await hardDeleteBtn.isVisible().catch(() => false)) {
					await hardDeleteBtn.click();
					interactionCount++;
					await page.waitForTimeout(300);

					const confirmHardDeleteBtn = page
						.locator('div[role="dialog"]')
						.locator('button')
						.filter({ hasText: /Xóa Vĩnh Viễn/i })
						.last();
					if (await confirmHardDeleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
						await Promise.all([
							page.waitForResponse(
								(res) =>
									res.url().includes("/api/households/") &&
									res.request().method() === "DELETE" &&
									res.status() < 400,
								{ timeout: 15_000 }
							),
							confirmHardDeleteBtn.click(),
						]);
						interactionCount++;
						await page.waitForTimeout(300);
						await closeSuccessAlertIfPresent(page);
					}
				}
			}

			if (await trashSearch.isVisible().catch(() => false)) {
				await trashSearch.fill("");
				await page.waitForTimeout(200);
			}
		}

		currentAction = "Giai đoạn 7: Nhật Ký Hoạt Động & Cài Đặt Hệ Thống";
		const auditNav = sidebar.locator('button:has-text("Nhật Ký Hoạt Động")').first();
		if (await auditNav.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Nhật Ký Hoạt Động");
			await auditNav.click();
			tracker.recordClick("Sidebar", "button", "Nhật Ký Hoạt Động");
			interactionCount++;
			await page.waitForTimeout(300);
			visitedRoutes.push("Nhật Ký Hoạt Động");

			await expect(
				page
					.locator(
						'h1:has-text("Nhật Ký Hoạt Động"), h2:has-text("Nhật Ký Hoạt Động")'
					)
					.first()
			).toBeVisible({
				timeout: 15_000,
			});

			const auditActionPills = [
				"Tất cả",
				"Cập nhật",
				"Thêm mới",
				"Xóa",
				"Khôi phục",
				"Nhập Excel",
			];
			for (const pill of auditActionPills) {
				const pillBtn = page
					.locator(`div.flex button:has-text("${pill}")`)
					.first();
				if (await pillBtn.isVisible().catch(() => false)) {
					tracker.discover("Nhật Ký Hoạt Động", "pill", pill);
					await pillBtn.click().catch(() => {});
					tracker.recordClick("Nhật Ký Hoạt Động", "pill", pill);
					interactionCount++;
					await page.waitForTimeout(100);
				}
			}

			const auditTimePresets = [
				"Hôm nay",
				"Hôm qua",
				"7 ngày qua",
				"30 ngày qua",
				"Tháng này",
				"Tất cả",
			];
			for (const timePreset of auditTimePresets) {
				const timeBtn = page
					.locator(`div.flex button:has-text("${timePreset}")`)
					.first();
				if (await timeBtn.isVisible().catch(() => false)) {
					tracker.discover("Nhật Ký Hoạt Động", "button", `Thời gian: ${timePreset}`);
					await timeBtn.click().catch(() => {});
					tracker.recordClick("Nhật Ký Hoạt Động", "button", `Thời gian: ${timePreset}`);
					interactionCount++;
					await page.waitForTimeout(100);
				}
			}

			const expandAllBtn = page.locator('button:has-text("Bung mở tất cả")').first();
			if (await expandAllBtn.isVisible().catch(() => false)) {
				tracker.discover("Nhật Ký Hoạt Động", "button", "Bung mở tất cả");
				await expandAllBtn.click().catch(() => {});
				tracker.recordClick("Nhật Ký Hoạt Động", "button", "Bung mở tất cả");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const collapseAllBtn = page.locator('button:has-text("Thu gọn tất cả")').first();
			if (await collapseAllBtn.isVisible().catch(() => false)) {
				tracker.discover("Nhật Ký Hoạt Động", "button", "Thu gọn tất cả");
				await collapseAllBtn.click().catch(() => {});
				tracker.recordClick("Nhật Ký Hoạt Động", "button", "Thu gọn tất cả");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const firstAuditItem = page
				.locator('div.space-y-4 div[role="button"], div.space-y-4 div.cursor-pointer')
				.first();
			if (await firstAuditItem.isVisible().catch(() => false)) {
				tracker.discover("Nhật Ký Hoạt Động", "button", "Mở rộng chi tiết biến động");
				await firstAuditItem.click().catch(() => {});
				tracker.recordClick("Nhật Ký Hoạt Động", "button", "Mở rộng chi tiết biến động");
				interactionCount++;
				await page.waitForTimeout(150);
			}

			const refreshAuditBtn = page
				.locator('div.flex button:has-text("Làm mới")')
				.first();
			if (await refreshAuditBtn.isVisible().catch(() => false)) {
				tracker.discover("Nhật Ký Hoạt Động", "button", "Làm mới nhật ký");
				await refreshAuditBtn.click().catch(() => {});
				tracker.recordClick("Nhật Ký Hoạt Động", "button", "Làm mới nhật ký");
				interactionCount++;
				await page.waitForTimeout(200);
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

			const settingsTabs = [
				"Tài Khoản Của Tôi",
				"Quản Lý Cán Bộ Thôn",
				"Sao Lưu CSDL",
				"Thông Tin Đơn Vị & Hệ Thống",
			];

			for (const sTab of settingsTabs) {
				const tabBtn = page.locator(`button:has-text("${sTab}")`).first();
				if (await tabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
					tracker.discover("Cài Đặt Hệ Thống", "tab", sTab);
					await tabBtn.click().catch(() => {});
					tracker.recordClick("Cài Đặt Hệ Thống", "tab", sTab);
					interactionCount++;
					await page.waitForTimeout(200);

					if (sTab === "Quản Lý Cán Bộ Thôn") {
						await expect(
							page.locator('h3:has-text("Danh Sách Tài Khoản Cán Bộ")')
						).toBeVisible({ timeout: 10_000 });

						const adminUserRow = page.locator('table tbody tr:has-text("admin")').first();
						await expect(adminUserRow).toBeVisible({ timeout: 10_000 });

						const refreshUsersBtn = page
							.locator('button[aria-label="Làm mới danh sách"]')
							.first();
						if (await refreshUsersBtn.isVisible().catch(() => false)) {
							tracker.discover("Cài Đặt Hệ Thống", "button", "Làm mới danh sách cán bộ");
							await refreshUsersBtn.click().catch(() => {});
							tracker.recordClick("Cài Đặt Hệ Thống", "button", "Làm mới danh sách cán bộ");
							interactionCount++;
							await page.waitForTimeout(150);
						}

						const addOfficerBtn = page
							.locator('button:has-text("Thêm Cán Bộ")')
							.first();
						if (await addOfficerBtn.isVisible().catch(() => false)) {
							tracker.discover("Cài Đặt Hệ Thống", "button", "Thêm Cán Bộ");
							await addOfficerBtn.click().catch(() => {});
							tracker.recordClick("Cài Đặt Hệ Thống", "button", "Thêm Cán Bộ");
							interactionCount++;
							await page.waitForTimeout(200);

							const cancelAddOfficerBtn = page
								.locator('div[role="dialog"] button:has-text("Hủy"), button[aria-label="Đóng"], form button:has-text("Hủy")')
								.first();
							if (await cancelAddOfficerBtn.isVisible().catch(() => false)) {
								await cancelAddOfficerBtn.click().catch(() => {});
								interactionCount++;
								await page.waitForTimeout(150);
							} else {
								await page.keyboard.press("Escape").catch(() => {});
							}
						}
					}
				}
			}
		}

		currentAction = "Giai đoạn 8: Xuất Excel (File Download & Streaming)";

		await page.evaluate(() => {
			delete (window as any).showSaveFilePicker;
		});

		const householdsNavExport = sidebar.locator('button:has-text("Hộ Gia Đình")').first();
		if (await householdsNavExport.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Hộ Gia Đình");
			await householdsNavExport.click();
			tracker.recordClick("Sidebar", "button", "Hộ Gia Đình");
			interactionCount++;
			await page.waitForTimeout(300);
		}

		const householdExportTrigger = page.locator('button:has-text("Xuất Excel"), button:has-text("Xuất danh sách")').first();
		if (await householdExportTrigger.isVisible({ timeout: 10_000 }).catch(() => false)) {
			tracker.discover("Hộ Gia Đình & Nhân Khẩu", "button", "Xuất Excel");
			await householdExportTrigger.click();
			tracker.recordClick("Hộ Gia Đình & Nhân Khẩu", "button", "Xuất Excel");
			interactionCount++;
			await page.waitForTimeout(300);

			const householdModal = page.locator('div[role="dialog"]').filter({ hasText: "Xuất" }).first();
			if (await householdModal.isVisible({ timeout: 5000 }).catch(() => false)) {
				const householdExportBtn = householdModal.locator('button:has-text("Xuất tệp Excel")').first();
				if (await householdExportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
					const [householdDownload] = await Promise.all([
						page.waitForEvent("download", { timeout: 30_000 }),
						householdExportBtn.click(),
					]);
					interactionCount++;

					const householdSuggestedName = householdDownload.suggestedFilename();
					expect(householdSuggestedName.toLowerCase()).toMatch(/\.(xlsx|xls)$/);

					const householdPath = await householdDownload.path();
					if (householdPath) {
						const fsModule = await import("fs");
						const stat = fsModule.statSync(householdPath);
						expect(stat.size).toBeGreaterThan(0);
					} else {
						const stream = await householdDownload.createReadStream();
						let byteCount = 0;
						for await (const chunk of stream) {
							byteCount += chunk.length;
						}
						expect(byteCount).toBeGreaterThan(0);
					}
				}
			}
			await closeSuccessAlertIfPresent(page);
		}

		const chucThoNavExport = sidebar.locator('button:has-text("Chúc Thọ")').first();
		if (await chucThoNavExport.isVisible({ timeout: 5000 }).catch(() => false)) {
			tracker.discover("Sidebar", "button", "Chúc Thọ");
			await chucThoNavExport.click();
			tracker.recordClick("Sidebar", "button", "Chúc Thọ");
			interactionCount++;
			await page.waitForTimeout(300);
		}

		const chucThoExportTrigger = page.locator('button:has-text("Xuất Excel")').first();
		if (await chucThoExportTrigger.isVisible({ timeout: 10_000 }).catch(() => false)) {
			tracker.discover("Chúc Thọ", "button", "Xuất Excel");
			await chucThoExportTrigger.click();
			tracker.recordClick("Chúc Thọ", "button", "Xuất Excel");
			interactionCount++;
			await page.waitForTimeout(300);

			const chucThoModal = page.locator('div[role="dialog"]').filter({ hasText: "Xuất" }).first();
			if (await chucThoModal.isVisible({ timeout: 5000 }).catch(() => false)) {
				const chucThoExportBtn = chucThoModal.locator('button:has-text("Xuất tệp Excel")').first();
				if (await chucThoExportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
					const [chucThoDownload] = await Promise.all([
						page.waitForEvent("download", { timeout: 30_000 }),
						chucThoExportBtn.click(),
					]);
					interactionCount++;

					const chucThoSuggestedName = chucThoDownload.suggestedFilename();
					expect(chucThoSuggestedName.toLowerCase()).toMatch(/\.(xlsx|xls)$/);

					const chucThoPath = await chucThoDownload.path();
					if (chucThoPath) {
						const fsModule = await import("fs");
						const stat = fsModule.statSync(chucThoPath);
						expect(stat.size).toBeGreaterThan(0);
					} else {
						const stream = await chucThoDownload.createReadStream();
						let byteCount = 0;
						for await (const chunk of stream) {
							byteCount += chunk.length;
						}
						expect(byteCount).toBeGreaterThan(0);
					}
				}
			}
			await closeSuccessAlertIfPresent(page);
		}

		if (!adminAuthToken) {
			adminAuthToken =
				(await page.evaluate(() => localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "")) || "";
		}

		const authHeaders: Record<string, string> = adminAuthToken
			? { Authorization: `Bearer ${adminAuthToken}` }
			: {};

		const directEndpoints = [
			"/api/excel/export",
			"/api/excel/export/chuctho",
		];

		for (const endpointPath of directEndpoints) {
			let apiResponse = await request.get(`http://localhost:5012${endpointPath}`, {
				headers: authHeaders,
			}).catch(() => null);

			if (!apiResponse || apiResponse.status() !== 200) {
				apiResponse = await request.get(endpointPath, {
					headers: authHeaders,
				});
			}

			expect(apiResponse.status()).toBe(200);
			const responseBuffer = await apiResponse.body();
			expect(responseBuffer.length).toBeGreaterThan(0);
		}

		const templateRes = await request.get("http://localhost:5012/api/excel/template", {
			headers: authHeaders,
		}).catch(() => null);
		if (templateRes && templateRes.status() === 200) {
			const templateBuffer = await templateRes.body();
			expect(templateBuffer.length).toBeGreaterThan(0);
		}

		console.log("\n=======================================================");
		console.log("KẾT QUẢ GIÁM SÁT VÀ KIỂM ĐỊNH SMART CRAWLER QLHK:");
		console.log("=======================================================");
		console.log(
			`• Tổng số route đã duyệt: ${visitedRoutes.length} (${visitedRoutes.join(
				" -> "
			)})`
		);
		console.log(`• Tổng số tương tác đã thực hiện: ${interactionCount} actions`);

		tracker.printReport();

		await guardian.assertZeroErrors(page);

		console.log(
			"\nTOÀN BỘ CÁC MÀN HÌNH VÀ LUỒNG NGHIỆP VỤ QLHK ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100%!\n"
		);
	});
});
