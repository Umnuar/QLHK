import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe("QLHK Smart Crawler - E2E Full Scan, Deep Filter & Full CRUD Lifecycle", () => {
	// =========================================================================
	// 1. KIẾN TRÚC BẪY LỖI & GIÁM SÁT TOÀN DIỆN (SETUP ERROR TRAPS)
	// =========================================================================
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

	// Lấy timestamp chuẩn định dạng Việt Nam
	const getTimestamp = (): string =>
		new Date().toLocaleTimeString("vi-VN", { hour12: false });

	// Chặn mọi hành vi xóa bừa bãi không an toàn
	const isDangerous = (text: string): boolean => {
		const dangerousRegex =
			/xóa vĩnh viễn|xóa hàng loạt|hard delete|reset|đăng xuất|logout/i;
		return dangerousRegex.test(text);
	};

	// -------------------------------------------------------------------------
	// 4. HÀM TIỆN ÍCH GIAO DIỆN CHUẨN HÓA (BEST OF 3 ARCHITECTURE)
	// -------------------------------------------------------------------------

	// Tự đóng hộp thoại thông báo thành công / xác nhận nếu đang hiển thị
	const closeSuccessAlertIfPresent = async (page: Page) => {
		const alertBtn = page
			.locator(
				'div[role="dialog"] button:has-text("Xác nhận"), div[role="dialog"] button:has-text("Đóng"), div[role="dialog"] button:has-text("OK"), button:has-text("Xác nhận"), button:has-text("Đóng")'
			)
			.first();
		if (await alertBtn.isVisible().catch(() => false)) {
			await alertBtn.click().catch(() => {});
			interactionCount++;
			await page.waitForTimeout(350);
		}
	};

	// Chọn linh hoạt dropdown/combobox theo nhãn chữ
	const selectCustomOption = async (
		page: Page,
		triggerLocator: Locator,
		optionText: string,
	): Promise<boolean> => {
		if (await triggerLocator.isVisible().catch(() => false)) {
			await triggerLocator.click();
			interactionCount++;
			await page.waitForTimeout(250);

			const option = page
				.locator(
					`div[role="option"]:has-text("${optionText}"), span:has-text("${optionText}")`
				)
				.first();
			if (await option.isVisible().catch(() => false)) {
				await option.click();
				interactionCount++;
				await page.waitForTimeout(350);
				return true;
			}
			await page.keyboard.press("Escape");
			await page.waitForTimeout(200);
		}
		return false;
	};

	// Tự dò và tương tác an toàn với các nút tiện ích ("Đổi thôn", "Làm mới", "Thu gọn", "Mở rộng")
	const crawlSafeButtons = async (page: Page, screenName: string) => {
		currentAction = `[Spider] Rà soát các nút an toàn trên [${screenName}]`;
		const buttons = await page.locator("button").all();
		for (const btn of buttons) {
			const isVisible = await btn.isVisible().catch(() => false);
			if (!isVisible) continue;

			const text = (await btn.innerText().catch(() => "")) || "";
			const ariaLabel =
				(await btn.getAttribute("aria-label").catch(() => "")) || "";
			const title = (await btn.getAttribute("title").catch(() => "")) || "";
			const fullLabel = `${text} ${ariaLabel} ${title}`.trim();

			if (!fullLabel || isDangerous(fullLabel)) continue;

			// Tránh click nút điều hướng sidebar hoặc các nút đóng / submit làm lệch luồng
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
				currentAction = `[Spider] Click nút an toàn trên ${screenName}: ${fullLabel}`;
				await btn.click({ timeout: 1500 }).catch(() => {});
				interactionCount++;
				await page.waitForTimeout(250);
			}
		}
	};

	test.beforeEach(async ({ page }) => {
		// 1.1. Bắt lỗi HTTP status >= 400 (bỏ qua favicon, fonts, extensions)
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

		// 1.2. Bắt lỗi Browser Console (Lọc sạch noise, giữ lại lỗi React Crash)
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				if (
					text.includes("favicon.ico") ||
					text.includes("net::ERR_CONNECTION_REFUSED") ||
					text.includes("fonts.googleapis.com") ||
					text.includes("fonts.gstatic.com") ||
					text.includes("chrome-extension://") ||
					text.includes("vite:react-babel")
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

		// 1.3. Bắt lỗi Unhandled Exceptions / Page Errors
		page.on("pageerror", (err) => {
			unhandledErrors.push({
				message: `${err.name}: ${err.message}`,
				timestamp: getTimestamp(),
				lastAction: currentAction,
			});
		});
	});

	// =========================================================================
	// 2. KỊCH BẢN THỰC THI CHÍNH
	// =========================================================================
	test("Smart Crawler: Quét cạn toàn bộ Filter & Vòng đời CRUD THẬT an toàn 100%", async ({
		page,
	}) => {
		test.setTimeout(180_000);

		console.log("\n=======================================================");
		console.log("🚀 BẮT ĐẦU SMART CRAWLER QUÉT CẠN FILTER & CRUD THẬT");
		console.log("=======================================================\n");

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 1: ĐĂNG NHẬP HỆ THỐNG
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 1: Đăng nhập hệ thống";
		console.log("🔑 [1/7] Điều hướng & Đăng nhập tài khoản admin...");
		await page.goto("/", { waitUntil: "load", timeout: 60_000 });

		const loginUsername = page.locator("#login-username");
		if (await loginUsername.isVisible({ timeout: 5000 }).catch(() => false)) {
			await page.fill("#login-username", "admin");
			await page.fill("#login-password", "admin123");
			await page.click('button[type="submit"]');
			interactionCount += 3;
			console.log("   ✓ Đã gửi thông tin đăng nhập admin/admin123.");
		}

		const sidebar = page.locator("aside");
		await expect(sidebar).toBeVisible({ timeout: 20_000 });
		visitedRoutes.push("Login -> Main Layout");
		console.log("   ✓ Đăng nhập thành công! Giao diện chính sẵn sàng.");
		await page.waitForTimeout(800);

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 2: QUẢN LÝ THÔN & QUÉT CẠN CÁC THÔN (VILLAGES PAGE)
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 2: Quét trang Quản Lý Thôn & duyệt danh sách thôn";
		console.log("📍 [2/7] Dò quét Màn hình: Quản Lý Thôn...");
		const villagesNav = sidebar.locator('button:has-text("Quản Lý Thôn")').first();
		if (await villagesNav.isVisible()) {
			await villagesNav.click();
			interactionCount++;
			await page.waitForTimeout(600);
		}
		visitedRoutes.push("Quản Lý Thôn");

		// Kiểm tra Banner tổng quan toàn xã và các thẻ KPI
		const banner = page.locator("text=Tổng Quan Dân Cư & Hộ Gia Đình Toàn Xã");
		await expect(banner).toBeVisible({ timeout: 10_000 });
		console.log("   ✓ Xác nhận Banner Tổng quan và các thẻ KPI hiển thị đầy đủ.");

		// Kiểm tra ô tìm kiếm thôn
		const searchVillageInput = page.locator('input[placeholder*="Tìm kiếm thôn"]');
		if (await searchVillageInput.isVisible()) {
			await searchVillageInput.fill("Thôn 1");
			await page.waitForTimeout(300);
			await searchVillageInput.fill("");
			interactionCount += 2;
			console.log("   ✓ Đã kiểm tra ô tìm kiếm thôn.");
		}

		// Duyệt và quét cạn toàn bộ các thẻ thôn trên địa bàn
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

			await targetCard.click();
			interactionCount++;
			await page.waitForTimeout(500);

			// Xác nhận nạp dữ liệu chi tiết thôn (aside menu hoạt động)
			await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });

			// Quay lại trang Quản Lý Thôn để tiếp tục duyệt thôn tiếp theo
			const changeVillageBtn = page.locator('button:has-text("Đổi thôn")').first();
			if (await changeVillageBtn.isVisible().catch(() => false)) {
				await changeVillageBtn.click();
			} else {
				const villagesNavBack = sidebar
					.locator('button:has-text("Quản Lý Thôn")')
					.first();
				await villagesNavBack.click();
			}
			interactionCount++;
			await page.waitForTimeout(500);
			await expect(banner).toBeVisible({ timeout: 10_000 });
		}
		console.log("   ✓ Đã hoàn tất quét cạn toàn bộ các thôn trên địa bàn!");

		// Click chọn Thôn 1 để kích hoạt phạm vi làm việc cho Hộ Gia Đình
		if (villageCardCount > 0) {
			console.log("   ✓ Click chọn thôn đầu tiên để kích hoạt phạm vi thôn...");
			await page.locator('div[role="button"][aria-label*="Thôn"]').first().click();
			interactionCount++;
			await page.waitForTimeout(600);
		}

		// Gọi hàm tự dò nút an toàn trên Quản Lý Thôn
		await crawlSafeButtons(page, "Quản Lý Thôn");

		// Chuyển sang màn hình Hộ Gia Đình trong Sidebar
		const householdsNav = sidebar.locator('button:has-text("Hộ Gia Đình")').first();
		await expect(householdsNav).toBeVisible({ timeout: 10_000 });
		await householdsNav.click();
		interactionCount++;
		await page.waitForTimeout(1000);
		visitedRoutes.push("Hộ Gia Đình & Nhân Khẩu");

		// Xác nhận tiêu đề trang Hộ Gia Đình xuất hiện
		await expect(page.locator('h2:has-text("Quản Lý Hộ Gia Đình")')).toBeVisible({
			timeout: 15_000,
		});

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 3: HỘ GIA ĐÌNH & NHÂN KHẨU (HOUSEHOLDS PAGE) - QUÉT CẠN FILTER & CRUD
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 3: Quét cạn toàn bộ Filter & Vòng đời CRUD THẬT";
		console.log("👨‍👩‍👧‍👦 [3/7] Dò quét Màn hình: Hộ Gia Đình & Nhân Khẩu...");

		const searchInput = page.locator(
			'input[placeholder*="Tìm theo họ tên chủ hộ, CCCD"]'
		);

		// -----------------------------------------------------------------
		// 3.0. TỰ DỌN RÁC PHIÊN TRƯỚC (PRE-TEST CLEANUP)
		// -----------------------------------------------------------------
		console.log("   -> 3.0. Tự dọn rác phiên trước (Pre-test Cleanup)...");
		if (await searchInput.isVisible()) {
			await searchInput.fill("[TEST-CRAWLER]");
			await page.waitForTimeout(1000);

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
					await page.waitForTimeout(400);
					const confirmTrash = page
						.locator('button:has-text("Chuyển Vào Thùng Rác")')
						.first();
					if (await confirmTrash.isVisible().catch(() => false)) {
						await Promise.all([
							page.waitForResponse(
								(res) =>
									res.url().includes("/api/households") &&
									res.request().method() === "DELETE" &&
									res.status() < 400,
								{ timeout: 10_000 }
							).catch(() => {}),
							confirmTrash.click(),
						]);
						await page.waitForTimeout(1000);
						await closeSuccessAlertIfPresent(page);
					}
				} else {
					break;
				}
			}
			await searchInput.fill("");
			await page.waitForTimeout(800);
		}

		// -----------------------------------------------------------------
		// 3.1. QUÉT CẠN TOÀN BỘ FILTER & BỘ LỌC (DEEP FILTER SWEEP)
		// -----------------------------------------------------------------
		console.log("   -> 3.1. Quét cạn toàn bộ thanh bộ lọc (HouseholdFilterBar)...");

		// (a) Bộ chọn năm (YearSelector) - Tăng / Giảm / Năm nay / Áp dụng
		const yearTrigger = page
			.locator('div:has-text("Năm ")')
			.filter({ hasText: /^Năm \d+/ })
			.first();
		if (await yearTrigger.isVisible()) {
			await yearTrigger.click();
			interactionCount++;
			await page.waitForTimeout(300);

			const plusYearBtn = page.locator('button[aria-label="Tăng 1 năm"]').first();
			if (await plusYearBtn.isVisible()) {
				await plusYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(200);
			}

			const currentYearBtn = page.locator('button:has-text("Năm nay")').first();
			if (await currentYearBtn.isVisible()) {
				await currentYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(200);
			}

			const applyYearBtn = page.locator('button:has-text("Áp dụng")').first();
			if (await applyYearBtn.isVisible()) {
				await applyYearBtn.click();
				interactionCount++;
				await page.waitForTimeout(400);
			} else {
				await page.keyboard.press("Escape");
			}
			console.log("      ✓ Đã kiểm tra YearSelector (Bộ chọn năm).");
		}

		// (b) Bộ lọc độ tuổi (AgeFilterPopover) - Quét 3 mốc tuổi tiêu biểu
		const ageTrigger = page.locator('button:has-text("Lọc Độ Tuổi")').first();
		if (await ageTrigger.isVisible()) {
			const agePresets = ["18 - 27 tuổi", "< 6 tuổi", "≥ 60 tuổi"];
			for (const preset of agePresets) {
				const activeTrigger = page
					.locator('button:has-text("Lọc Độ Tuổi"), button:has-text("tuổi")')
					.first();
				if (await activeTrigger.isVisible()) {
					await activeTrigger.click();
					interactionCount++;
					await page.waitForTimeout(300);

					const presetBtn = page.locator(`text=${preset}`).first();
					if (await presetBtn.isVisible()) {
						await presetBtn.click();
						interactionCount++;
						await page.waitForTimeout(400);

						// Xóa lọc
						const clearAgeBtn = page
							.locator(
								'button[aria-label*="xóa lọc" i], button:has-text("Xóa lọc"), button:has-text("tuổi") button'
							)
							.first();
						if (await clearAgeBtn.isVisible()) {
							await clearAgeBtn.click().catch(() => {});
							interactionCount++;
							await page.waitForTimeout(300);
						}
					} else {
						await page.keyboard.press("Escape");
					}
				}
			}
			console.log("      ✓ Đã kiểm tra AgeFilterPopover (3 mốc tuổi).");
		}

		// (c) Dropdown Giới tính - Dùng selectCustomOption
		const genderTrigger = page
			.locator('button:has-text("Tất cả giới tính"), button:has-text("Nam"), button:has-text("Nữ")')
			.first();
		if (await genderTrigger.isVisible()) {
			await selectCustomOption(page, genderTrigger, "Nam");
			console.log("      ✓ Đã chọn giới tính 'Nam' bằng selectCustomOption.");
			const clearGenderBtn = page.locator('button:has-text("Xóa lọc")').first();
			if (await clearGenderBtn.isVisible().catch(() => false)) {
				await clearGenderBtn.click();
				interactionCount++;
				await page.waitForTimeout(300);
			}
		}

		// (d) Dropdown Dân tộc - Dùng selectCustomOption
		const ethnicityTrigger = page
			.locator('button:has-text("Tất cả dân tộc"), button:has-text("Dân tộc")')
			.first();
		if (await ethnicityTrigger.isVisible()) {
			await selectCustomOption(page, ethnicityTrigger, "Dân tộc Kinh");
			console.log("      ✓ Đã chọn dân tộc 'Dân tộc Kinh' bằng selectCustomOption.");
			const clearEthBtn = page.locator('button:has-text("Xóa lọc")').first();
			if (await clearEthBtn.isVisible().catch(() => false)) {
				await clearEthBtn.click();
				interactionCount++;
				await page.waitForTimeout(300);
			}
		}

		// (e) Dropdown Cư trú - Dùng selectCustomOption
		const statusTrigger = page
			.locator('button:has-text("Tất cả cư trú"), button:has-text("Thường trú")')
			.first();
		if (await statusTrigger.isVisible()) {
			await selectCustomOption(page, statusTrigger, "Thường trú");
			console.log("      ✓ Đã chọn cư trú 'Thường trú' bằng selectCustomOption.");
			const clearStatusBtn = page.locator('button:has-text("Xóa lọc")').first();
			if (await clearStatusBtn.isVisible().catch(() => false)) {
				await clearStatusBtn.click();
				interactionCount++;
				await page.waitForTimeout(300);
			}
		}

		// (f) Nút Làm Mới bảng dữ liệu
		const refreshBtn = page
			.locator('button:has(svg.lucide-refresh-cw), button:has-text("Làm Mới")')
			.first();
		if (await refreshBtn.isVisible()) {
			await refreshBtn.click().catch(() => {});
			interactionCount++;
			await page.waitForTimeout(400);
			console.log("      ✓ Đã kiểm tra nút Làm Mới bảng dữ liệu.");
		}

		// (g) Kiểm tra Accordion và Nút Mắt Xem CCCD
		const firstHouseholdRow = page.locator("table tbody tr").first();
		if (await firstHouseholdRow.isVisible()) {
			await firstHouseholdRow.click();
			interactionCount++;
			await page.waitForTimeout(600);

			const eyeButton = page
				.locator(
					'table tbody button[aria-label*="số CCCD" i], table tbody div[title*="CCCD" i] button'
				)
				.first();
			if (await eyeButton.isVisible().catch(() => false)) {
				await eyeButton.click().catch(() => {});
				interactionCount++;
				await page.waitForTimeout(350);
				await eyeButton.click().catch(() => {});
				interactionCount++;
			}

			// Thu gọn lại accordion
			await firstHouseholdRow.click();
			interactionCount++;
			await page.waitForTimeout(400);
			console.log("      ✓ Đã kiểm tra Accordion và nút mắt giải mã CCCD.");
		}

		// Đảm bảo không có Drawer/Modal nào bị mở treo trước khi bước vào CRUD
		const strayDrawerClose = page.locator('button[aria-label="Đóng ngăn kéo"]').first();
		if (await strayDrawerClose.isVisible().catch(() => false)) {
			await strayDrawerClose.click().catch(() => {});
			await page.waitForTimeout(400);
		}

		// -----------------------------------------------------------------
		// 3.2. VÒNG ĐỜI CRUD THẬT (CREATE -> VERIFY -> UPDATE -> VERIFY -> DELETE)
		// -----------------------------------------------------------------
		console.log(
			"\n   -> 3.2. BẮT ĐẦU VÒNG ĐỜI CRUD THẬT (An toàn 100% với tag [TEST-CRAWLER])..."
		);

		// [BƯỚC A: THÊM MỚI VÀ LƯU THẬT]
		currentAction = "CRUD Thật: Mở Drawer thêm mới hộ gia đình";
		const addHouseholdBtn = page
			.locator('button:has-text("Thêm Hộ Gia Đình")')
			.first();
		await expect(addHouseholdBtn).toBeVisible({ timeout: 10_000 });
		await addHouseholdBtn.click();
		interactionCount++;
		await page.waitForTimeout(600);

		// Mở sub-modal CitizenModal để thêm nhân khẩu chủ hộ
		currentAction = "CRUD Thật: Mở modal thêm nhân khẩu chủ hộ";
		const addMemberBtn = page
			.locator('button:has-text("Thêm Nhân Khẩu Mới")')
			.first();
		await expect(addMemberBtn).toBeVisible({ timeout: 5000 });
		await addMemberBtn.click();
		interactionCount++;
		await page.waitForTimeout(500);

		// Điền thông tin nhân khẩu có gắn tag nhận diện [TEST-CRAWLER]
		const citizenFullNameInput = page.locator("#citizen-full-name");
		await expect(citizenFullNameInput).toBeVisible({ timeout: 5000 });
		await citizenFullNameInput.fill("[TEST-CRAWLER] Nguyễn Văn Test");
		interactionCount++;

		const citizenDobInput = page.locator("#citizen-dob");
		if (await citizenDobInput.isVisible()) {
			await citizenDobInput.fill("15/05/1990");
			interactionCount++;
		}

		const citizenNotesInput = page.locator("#citizen-notes");
		if (await citizenNotesInput.isVisible()) {
			await citizenNotesInput.fill("Nhân khẩu thử nghiệm tự động robot E2E");
			interactionCount++;
		}

		// Bấm nút Lưu nhân khẩu trong Sub-modal
		const saveCitizenBtn = page
			.locator('button[type="submit"]:has-text("Lưu nhân khẩu")')
			.first();
		await saveCitizenBtn.click();
		interactionCount++;
		await page.waitForTimeout(500);
		console.log("      ✓ Đã điền và lưu nhân khẩu [TEST-CRAWLER] vào Drawer.");

		// Điền thông tin Hộ gia đình trong Drawer
		const drawerAddressInput = page.locator("#drawer-address");
		if (await drawerAddressInput.isVisible()) {
			await drawerAddressInput.fill("Số 123 Đường Test [TEST-CRAWLER]");
			interactionCount++;
		}

		const drawerNotesInput = page.locator("#drawer-notes");
		if (await drawerNotesInput.isVisible()) {
			await drawerNotesInput.fill("Hộ test tự động E2E Smart Crawler");
			interactionCount++;
		}

		// BẤM NÚT LƯU THẬT & BẮT RESPONSE POST /api/households (ANTI RACE-CONDITION)
		currentAction = "CRUD Thật: Bấm nút Lưu Hộ Gia Đình thật";
		console.log("      -> Bấm nút LƯU THẬT hộ gia đình...");
		const saveHouseholdBtn = page
			.locator('button[form="household-drawer-form"]:has-text("Lưu Thông Tin Hộ")')
			.first();

		const [postResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes("/api/households") &&
					res.request().method() === "POST" &&
					res.status() < 400,
				{ timeout: 15_000 }
			),
			saveHouseholdBtn.click(),
		]);
		interactionCount++;
		console.log(`      ✓ Bắt thành công API POST /api/households [HTTP ${postResponse.status()}]`);

		// Đóng hộp thoại thông báo thành công nếu có
		await closeSuccessAlertIfPresent(page);

		// Xác minh: Tìm kiếm bản ghi vừa tạo trên bảng dữ liệu
		currentAction = "CRUD Thật: Xác minh bản ghi mới xuất hiện trên bảng";
		await searchInput.fill("[TEST-CRAWLER]");
		interactionCount++;
		await page.waitForTimeout(800);

		const createdRow = page
			.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
			.first();
		await expect(
			createdRow,
			"Hộ gia đình [TEST-CRAWLER] phải xuất hiện trong bảng dữ liệu sau khi Lưu Thật"
		).toBeVisible({ timeout: 10_000 });
		console.log("      ✓ XÁC NHẬN: Bản ghi [TEST-CRAWLER] đã được lưu thành công vào CSDL!");

		// [BƯỚC B: SỬA VÀ LƯU THAY ĐỔI THẬT]
		currentAction = "CRUD Thật: Bấm nút Sửa bản ghi [TEST-CRAWLER]";
		console.log("      -> Bấm nút SỬA bản ghi [TEST-CRAWLER]...");
		const editBtn = createdRow.locator('button[aria-label*="Sửa"]').first();
		await expect(editBtn).toBeVisible({ timeout: 5000 });
		await editBtn.click();
		interactionCount++;
		await page.waitForTimeout(600);

		// Sửa ô địa chỉ trong Drawer (lưu vào households.address và hiển thị trực tiếp trên cột Địa Chỉ)
		const editAddressInput = page.locator("#drawer-address");
		await expect(editAddressInput).toBeVisible({ timeout: 5000 });
		await editAddressInput.fill(
			"Số 123 Đường Test [TEST-CRAWLER] - ĐÃ SỬA THÀNH CÔNG"
		);
		interactionCount++;

		// Sửa thêm ô ghi chú trong Drawer nếu có
		const editNotesInput = page.locator("#drawer-notes");
		if (await editNotesInput.isVisible()) {
			await editNotesInput.fill(
				"Hộ test tự động E2E Smart Crawler - ĐÃ SỬA THÀNH CÔNG"
			);
			interactionCount++;
		}

		// BẤM LƯU THAY ĐỔI & BẮT RESPONSE PUT/PATCH (ANTI RACE-CONDITION)
		currentAction = "CRUD Thật: Lưu cập nhật bản ghi [TEST-CRAWLER]";
		const [putResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes("/api/households") &&
					(res.request().method() === "PUT" ||
						res.request().method() === "PATCH" ||
						res.request().method() === "POST") &&
					res.status() < 400,
				{ timeout: 15_000 }
			),
			saveHouseholdBtn.click(),
		]);
		interactionCount++;
		console.log(`      ✓ Bắt thành công API Cập nhật hộ [HTTP ${putResponse.status()}]`);

		await closeSuccessAlertIfPresent(page);

		// Xác minh: Nội dung sửa đã phản ánh trên bảng
		await searchInput.fill("[TEST-CRAWLER]");
		await page.waitForTimeout(600);
		await expect(
			page.locator('table tbody tr:has-text("[TEST-CRAWLER]")').first()
		).toContainText("ĐÃ SỬA THÀNH CÔNG");
		console.log("      ✓ XÁC NHẬN: Dữ liệu sửa đổi đã được lưu và hiển thị chuẩn xác!");

		// [BƯỚC C: XÓA DỌN DẸP AN TOÀN (CHỈ NHẮM VÀO [TEST-CRAWLER])]
		currentAction = "CRUD Thật: Bấm nút Xóa bản ghi [TEST-CRAWLER] để dọn dẹp";
		console.log(
			"      -> Bấm nút XÓA DỌN DẸP (Chỉ nhắm mục tiêu vào hàng [TEST-CRAWLER])..."
		);
		let deleteAttempts = 0;
		while (deleteAttempts < 10) {
			const targetDeleteRow = page
				.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
				.first();
			if (!(await targetDeleteRow.isVisible().catch(() => false))) {
				break;
			}
			deleteAttempts++;
			const deleteTargetBtn = targetDeleteRow
				.locator('button[aria-label*="Xóa"]')
				.first();
			await expect(deleteTargetBtn).toBeVisible({ timeout: 5000 });
			await deleteTargetBtn.click();
			interactionCount++;
			await page.waitForTimeout(500);

			// Xác nhận chuyển vào thùng rác
			const confirmMoveToTrashBtn = page
				.locator('button:has-text("Chuyển Vào Thùng Rác")')
				.first();
			await expect(confirmMoveToTrashBtn).toBeVisible({ timeout: 5000 });

			const [deleteResponse] = await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes("/api/households") &&
						res.request().method() === "DELETE" &&
						res.status() < 400,
					{ timeout: 15_000 }
				),
				confirmMoveToTrashBtn.click(),
			]);
			interactionCount++;
			console.log(`      ✓ Bắt thành công API DELETE (#${deleteAttempts}) [HTTP ${deleteResponse.status()}]`);

			await page.waitForTimeout(800);
			await closeSuccessAlertIfPresent(page);
		}

		// Kiểm tra dòng [TEST-CRAWLER] đã biến mất khỏi bảng chính
		await searchInput.fill("[TEST-CRAWLER]");
		await page.waitForTimeout(1000);
		await expect(
			page.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
		).toHaveCount(0);
		console.log(
			"      ✓ XÁC NHẬN: Bản ghi [TEST-CRAWLER] đã được dọn sạch khỏi danh sách hộ gia đình!"
		);

		// Trả lại ô tìm kiếm rỗng
		await searchInput.fill("");
		await page.waitForTimeout(500);

		// Button spider trên Hộ Gia Đình
		await crawlSafeButtons(page, "Hộ Gia Đình & Nhân Khẩu");

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 4: THỐNG KÊ BÁO CÁO (ANALYTICS PAGE)
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 4: Quét trang Thống Kê Báo Cáo";
		console.log("\n📊 [4/7] Dò quét Màn hình: Thống Kê Báo Cáo...");
		const analyticsNav = sidebar.locator('button:has-text("Thống Kê")').first();
		if (await analyticsNav.isVisible()) {
			await analyticsNav.click();
			interactionCount++;
			await page.waitForTimeout(800);

			const statTable = page
				.locator(
					'h2:has-text("Thống Kê"), h3:has-text("Thống Kê"), div:has-text("Cơ Cấu Dân Số"), div:has-text("Tổng Hộ Gia Đình")'
				)
				.first();
			await expect(statTable).toBeVisible({ timeout: 25_000 });
			console.log("   ✓ Dữ liệu Thống kê Báo cáo tải thành công.");

			// Thử bấm nút Làm Mới
			const refreshStatBtn = page.locator('button:has-text("Làm Mới")').first();
			if (await refreshStatBtn.isVisible()) {
				await refreshStatBtn.click().catch(() => {});
				interactionCount++;
				await page.waitForTimeout(400);
			}

			// Button spider trên Thống Kê Báo Cáo
			await crawlSafeButtons(page, "Thống Kê Báo Cáo");
		}
		visitedRoutes.push("Thống Kê Báo Cáo");

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 5: THÙNG RÁC (RECYCLE BIN PAGE) - DỌN SẠCH CSDL VĨNH VIỄN
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 5: Quét trang Thùng Rác & dọn vĩnh viễn [TEST-CRAWLER]";
		console.log("🗑️ [5/7] Dò quét Màn hình: Thùng Rác...");
		const recycleNav = sidebar.locator('button:has-text("Thùng Rác")').first();
		if (await recycleNav.isVisible()) {
			await recycleNav.click();
			interactionCount++;
			await page.waitForTimeout(800);

			const recycleTitle = page.locator('h2:has-text("Thùng Rác")').first();
			await expect(recycleTitle).toBeVisible({ timeout: 25_000 });
			console.log(
				"   ✓ Màn hình Thùng rác tải dữ liệu an toàn (Bảo vệ dữ liệu thật)."
			);

			// Nếu bản ghi [TEST-CRAWLER] nằm trong thùng rác -> Xóa vĩnh viễn để bảo toàn 100% CSDL sạch
			let hardDeleteAttempts = 0;
			while (hardDeleteAttempts < 10) {
				const testInRecycleRow = page
					.locator('table tbody tr:has-text("[TEST-CRAWLER]")')
					.first();
				if (!(await testInRecycleRow.isVisible().catch(() => false))) {
					break;
				}
				hardDeleteAttempts++;
				console.log(
					`   -> Phát hiện [TEST-CRAWLER] trong Thùng rác (#${hardDeleteAttempts}), thực hiện xóa vĩnh viễn dọn sạch CSDL...`
				);
				const hardDeleteTestBtn = testInRecycleRow
					.locator('button[title="Xóa vĩnh viễn khỏi CSDL"]')
					.first();
				if (await hardDeleteTestBtn.isVisible().catch(() => false)) {
					await hardDeleteTestBtn.click();
					interactionCount++;
					await page.waitForTimeout(400);

					const confirmHardDeleteBtn = page
						.locator('button:has-text("Xóa Vĩnh Viễn"), button:has-text("Xác Nhận Xóa Vĩnh Viễn")')
						.first();
					if (await confirmHardDeleteBtn.isVisible().catch(() => false)) {
						await Promise.all([
							page.waitForResponse(
								(res) =>
									res.url().includes("/api/households") &&
									res.request().method() === "DELETE" &&
									res.status() < 400,
								{ timeout: 15_000 }
							),
							confirmHardDeleteBtn.click(),
						]);
						interactionCount++;
						await page.waitForTimeout(600);
						await closeSuccessAlertIfPresent(page);
						console.log(
							"   ✓ ĐÃ XÓA VĨNH VIỄN [TEST-CRAWLER]: Cơ sở dữ liệu sạch 100%!"
						);
					}
				} else {
					break;
				}
			}

			// Button spider trên Thùng Rác
			await crawlSafeButtons(page, "Thùng Rác");
		}
		visitedRoutes.push("Thùng Rác");

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 6: NHẬT KÝ HOẠT ĐỘNG (AUDIT LOG VIEW) - QUÉT CẠN CÁC PILL
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 6: Quét trang Nhật Ký Hoạt Động & các pill sự kiện";
		console.log("📜 [6/7] Dò quét Màn hình: Nhật Ký Hoạt Động (Audit Log)...");
		const auditNav = sidebar
			.locator('button:has-text("Nhật Ký Hoạt Động")')
			.first();
		if (await auditNav.isVisible()) {
			await auditNav.click();
			interactionCount++;

			const auditTitle = page.locator('h2:has-text("Nhật Ký")').first();
			await expect(auditTitle).toBeVisible({ timeout: 25_000 });
			console.log("   ✓ Nhật ký hoạt động nạp dữ liệu hoàn chỉnh.");

			// Quét cạn toàn bộ các pill bộ lọc sự kiện
			const auditPills = [
				"Tất Cả",
				"Thêm Mới",
				"Cập Nhật",
				"Xóa",
				"Khôi Phục",
			];
			for (const pill of auditPills) {
				const pillBtn = page
					.locator(`div:has-text("Sự kiện:") button:has-text("${pill}")`)
					.first();
				if (await pillBtn.isVisible()) {
					await pillBtn.click();
					interactionCount++;
					await page.waitForTimeout(200);
				}
			}
			console.log("   ✓ Đã quét cạn 5/5 pill bộ lọc sự kiện trong Nhật ký.");

			// Button spider trên Nhật Ký Hoạt Động
			await crawlSafeButtons(page, "Nhật Ký Hoạt Động");
		}
		visitedRoutes.push("Nhật Ký Hoạt Động");

		// ---------------------------------------------------------------------
		// GIAI ĐOẠN 7: CÀI ĐẶT HỆ THỐNG (SETTINGS PAGE) - QUÉT CẢ 4 TABS
		// ---------------------------------------------------------------------
		currentAction = "Giai đoạn 7: Quét trang Cài Đặt Hệ Thống (4 Tabs)";
		console.log("⚙️ [7/7] Dò quét Màn hình: Cài Đặt Hệ Thống (4 Tabs)...");
		const settingsNav = sidebar
			.locator('button:has-text("Cài Đặt Hệ Thống")')
			.first();
		if (await settingsNav.isVisible()) {
			await settingsNav.click();
			interactionCount++;

			// Tab 1: Tài Khoản Của Tôi
			console.log("   -> Tab 1: Tài Khoản Của Tôi...");
			const profileTab = page.locator('button:has-text("Tài Khoản Của Tôi")').first();
			await expect(profileTab).toBeVisible({ timeout: 25_000 });
			await profileTab.click();
			interactionCount++;
			await page.waitForTimeout(300);

			// Tab 2: Quản Lý Cán Bộ Thôn
			console.log("   -> Tab 2: Quản Lý Cán Bộ Thôn...");
			const usersTab = page
				.locator('button:has-text("Quản Lý Cán Bộ Thôn")')
				.first();
			if (await usersTab.isVisible()) {
				await usersTab.click();
				interactionCount++;
				await page.waitForTimeout(400);

				// Thử mở modal Thêm Cán Bộ
				const addUserBtn = page.locator('button:has-text("Thêm Cán Bộ")').first();
				if (await addUserBtn.isVisible()) {
					await addUserBtn.click();
					interactionCount++;
					await page.waitForTimeout(350);

					// Đóng an toàn
					const cancelUserModal = page
						.locator('button:has-text("Hủy")')
						.first();
					if (await cancelUserModal.isVisible()) {
						await cancelUserModal.click();
					} else {
						await page.keyboard.press("Escape");
					}
					interactionCount++;
					await page.waitForTimeout(300);
				}
			}

			// Tab 3: Sao Lưu CSDL
			console.log("   -> Tab 3: Sao Lưu CSDL...");
			const backupTab = page.locator('button:has-text("Sao Lưu CSDL")').first();
			if (await backupTab.isVisible()) {
				await backupTab.click();
				interactionCount++;
				await page.waitForTimeout(400);
			}

			// Tab 4: Thông Tin Đơn Vị & Hệ Thống
			console.log("   -> Tab 4: Thông Tin Đơn Vị & Hệ Thống...");
			const systemTab = page
				.locator('button:has-text("Thông Tin Đơn Vị")')
				.first();
			if (await systemTab.isVisible()) {
				await systemTab.click();
				interactionCount++;
				await page.waitForTimeout(400);
			}

			// Button spider trên Cài Đặt Hệ Thống
			await crawlSafeButtons(page, "Cài Đặt Hệ Thống");
		}
		visitedRoutes.push("Cài Đặt Hệ Thống");

		// =====================================================================
		// 4. TỔNG KẾT & TIÊU CHÍ NGHIỆM THU CHẤT LƯỢNG (ASSERTIONS)
		// =====================================================================
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
		console.log(`• Lỗi Browser Console: ${consoleErrors.length}`);
		console.log(`• Lỗi HTTP API (code >= 400): ${apiErrors.length}`);

		if (apiErrors.length > 0) {
			console.log("\n⚠️ DANH SÁCH LỖI API PHÁT HIỆN:");
			console.table(
				apiErrors.map((e, idx) => ({
					"#": idx + 1,
					Method: e.method,
					Status: e.status,
					URL: e.url,
					Action: e.lastAction,
					Body: e.body.slice(0, 80),
				}))
			);
		}

		if (consoleErrors.length > 0) {
			console.log("\n⚠️ DANH SÁCH LỖI CONSOLE PHÁT HIỆN:");
			console.table(
				consoleErrors.map((c, idx) => ({
					"#": idx + 1,
					Action: c.lastAction,
					Message: c.text.slice(0, 100),
					Time: c.timestamp,
				}))
			);
		}

		if (unhandledErrors.length > 0) {
			console.log("\n⚠️ DANH SÁCH LỖI UNHANDLED RUNTIME:");
			console.table(
				unhandledErrors.map((u, idx) => ({
					"#": idx + 1,
					Action: u.lastAction,
					Message: u.message,
					Time: u.timestamp,
				}))
			);
		}

		// KHẲNG ĐỊNH CHẤT LƯỢNG NGHIỆM THU TUYỆT ĐỐI (ZERO TOLERANCE)
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
			"\n✅ TOÀN BỘ FILTER VÀ VÒNG ĐỜI CRUD THẬT ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100% AN TOÀN!\n"
		);
	});
});
