import { test, expect } from "@playwright/test";

test.describe("S5-01 & S5-02: Gear Master Inventory, Task Check-Out & Double-Booking Lock E2E", () => {
  test("Admin checks out Sony FX3 → attempts conflicting check-out and verifies red Double-Booking alert banner → performs Return Check-In with condition note", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      // Ignore favicon and intentional 409 conflict logs
      if (
        msg.type() === "error" &&
        !text.includes("favicon") &&
        !text.includes("Failed to load resource: the server responded with a status of 409")
      ) {
        consoleErrors.push(text);
      }
    });

    page.on("requestfailed", (request) => {
      const errorText = request.failure()?.errorText || "";
      if (!request.url().includes("favicon.ico") && errorText !== "net::ERR_ABORTED") {
        failedRequests.push(`${request.method()} ${request.url()} - ${errorText}`);
      }
    });

    const isMobile = testInfo.project.name.includes("Mobile");
    const inventoryScope = isMobile
      ? page.locator('[data-testid="gear-mobile-cards"]')
      : page.locator('[data-testid="gear-master-table"]');

    // 1. Log in as Central Admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 2. Navigate to /admin/gear
    await page.goto("/admin/gear");
    await page.waitForLoadState("domcontentloaded");

    // Verify Brand & Page Heading
    await expect(page.getByText("Equipment & Camera-Gear Stock Management")).toBeVisible();
    await expect(page.getByText("Master Inventory")).toBeVisible();

    // Verify 0 horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify Sidebar on Desktop has Gear Stock active
    if (!isMobile) {
      const gearNavLink = page.locator('aside a[href="/admin/gear"]');
      await expect(gearNavLink).toBeVisible();
      await expect(gearNavLink).toHaveClass(/bg-\[#0F766E\]/);
    } else {
      const mobileGearLink = page.locator('#mobile-bottom-nav a[href="/admin/gear"]');
      await expect(mobileGearLink).toBeVisible();
    }

    // Verify seeded items are rendered
    await expect(inventoryScope.getByText("Sony FX3 Cinema Body")).toBeVisible();
    await expect(inventoryScope.getByText("SN-FX3-01")).toBeVisible();

    // Idempotency: If Sony FX3 was left in use by an aborted run, return it first
    const cleanupCheckinBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkin-SN-FX3-01"]')
      : page.locator('[data-testid="btn-checkin-SN-FX3-01"]');
    if (await cleanupCheckinBtn.isVisible()) {
      await cleanupCheckinBtn.click();
      await page.locator('[data-testid="checkin-submit-btn"]').click();
      await page.waitForTimeout(600);
    }

    // ------------------------------------------------------------------------
    // STEP A: Admin Checks Out Sony FX3 (SN-FX3-01)
    // ------------------------------------------------------------------------
    const checkoutBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkout-SN-FX3-01"]')
      : page.locator('[data-testid="btn-checkout-SN-FX3-01"]');

    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // Check-Out Modal opens
    await expect(page.getByText("সরঞ্জাম চেক-আউট (Check-Out Equipment)")).toBeVisible();
    const submitCheckoutBtn = page.locator('[data-testid="checkout-submit-btn"]');
    await expect(submitCheckoutBtn).toBeVisible();
    await submitCheckoutBtn.click();

    // Wait for modal to close and status badge to update to In Use
    await expect(page.getByText("সরঞ্জাম চেক-আউট (Check-Out Equipment)")).toBeHidden({ timeout: 5000 });

    const statusBadge = isMobile
      ? page.locator('[data-testid="mobile-status-badge-SN-FX3-01"]')
      : page.locator('[data-testid="status-badge-SN-FX3-01"]');

    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(/In Use/i);

    // Verify action button changed to Check-In
    const checkinBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkin-SN-FX3-01"]')
      : page.locator('[data-testid="btn-checkin-SN-FX3-01"]');
    await expect(checkinBtn).toBeVisible();

    // ------------------------------------------------------------------------
    // STEP B: Admin Attempts Conflicting Check-Out (Double-Booking Blocked 23P01)
    // ------------------------------------------------------------------------
    const headerCheckoutBtn = page.locator('[data-testid="header-checkout-btn"]');
    await headerCheckoutBtn.click();

    // In modal, select Sony FX3 (which is currently In Use)
    await expect(page.getByText("সরঞ্জাম চেক-আউট (Check-Out Equipment)")).toBeVisible();
    const gearSelect = page.locator('[data-testid="checkout-gear-select"]');
    const fx3OptionValue = await gearSelect
      .locator("option", { hasText: "Sony FX3 Cinema Body" })
      .first()
      .getAttribute("value");
    if (fx3OptionValue) {
      await gearSelect.selectOption(fx3OptionValue);
    }

    // Submit conflicting check-out
    await submitCheckoutBtn.click();

    // Verify In-Modal Red Error Banner appears
    const checkoutErrorBanner = page.locator('[data-testid="checkout-error-banner"]');
    await expect(checkoutErrorBanner).toBeVisible({ timeout: 5000 });
    await expect(checkoutErrorBanner).toContainText("Double-Booking Blocked");
    await expect(checkoutErrorBanner).toContainText("Sony FX3");

    // Close the checkout modal
    await page.getByRole("button", { name: "বাতিল (Cancel)" }).click();

    // Verify Page-level Red Glass Alert Banner is visible
    const alertBanner = page.locator('[data-testid="double-booking-alert-banner"]');
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText("Double-Booking Blocked");
    await expect(alertBanner).toContainText("SN-FX3-01");
    await expect(alertBanner).toContainText("excl_no_gear_double_booking");

    // ------------------------------------------------------------------------
    // STEP C: Admin Performs Return Check-In with Condition Note
    // ------------------------------------------------------------------------
    await expect(checkinBtn).toBeVisible();
    await checkinBtn.click();

    // Return Check-In Modal opens
    await expect(page.getByText("সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)")).toBeVisible();

    // Fill condition note
    const conditionNoteInput = page.locator('[data-testid="checkin-condition-note"]');
    await conditionNoteInput.fill("Battery 98%, lens mount clean, no damage");

    // Submit return as Available
    const submitCheckinBtn = page.locator('[data-testid="checkin-submit-btn"]');
    await submitCheckinBtn.click();

    // Wait for modal to close
    await expect(page.getByText("সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)")).toBeHidden({
      timeout: 5000,
    });

    // Verify Sony FX3 live status updates back to Available (green pill)
    await expect(statusBadge).toHaveText(/Available/i);
    await expect(checkoutBtn).toBeVisible();

    // ------------------------------------------------------------------------
    // STEP D: Admin Flags Item for Maintenance & Marks Ready
    // ------------------------------------------------------------------------
    const fx30CheckoutBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkout-SN-FX30-01"]')
      : page.locator('[data-testid="btn-checkout-SN-FX30-01"]');
    await fx30CheckoutBtn.click();
    await submitCheckoutBtn.click();
    await expect(page.getByText("সরঞ্জাম চেক-আউট (Check-Out Equipment)")).toBeHidden({ timeout: 5000 });

    const fx30CheckinBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkin-SN-FX30-01"]')
      : page.locator('[data-testid="btn-checkin-SN-FX30-01"]');
    await fx30CheckinBtn.click();

    // Flag Maintenance toggle
    await page.locator('[data-testid="checkin-toggle-maintenance"]').check();
    const maintenanceNoteInput = page.locator('[data-testid="checkin-maintenance-note"]');
    await maintenanceNoteInput.fill("Battery lock issue");
    await page.locator('[data-testid="checkin-submit-btn"]').click();
    await expect(page.getByText("সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)")).toBeHidden({
      timeout: 5000,
    });

    // Verify status updated to Maintenance
    const fx30StatusBadge = isMobile
      ? page.locator('[data-testid="mobile-status-badge-SN-FX30-01"]')
      : page.locator('[data-testid="status-badge-SN-FX30-01"]');
    await expect(fx30StatusBadge).toHaveText(/Maintenance/i);
    await expect(inventoryScope.getByText("Note: Battery lock issue")).toBeVisible();

    // Click Mark Ready
    const markReadyBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-markready-SN-FX30-01"]')
      : page.locator('[data-testid="btn-markready-SN-FX30-01"]');
    await markReadyBtn.click();

    // Verify status returns to Available
    await expect(fx30StatusBadge).toHaveText(/Available/i);

    // ------------------------------------------------------------------------
    // STEP E: Add New Gear with Unique Serial Validation
    // ------------------------------------------------------------------------
    const addGearBtn = page.locator('[data-testid="add-gear-btn"]');
    await addGearBtn.click();
    await expect(page.getByText("নতুন সরঞ্জাম যোগ করুন (Add New Gear)")).toBeVisible();

    await page.locator('[data-testid="input-gear-name"]').fill("Blackmagic Pocket Cinema 6K");
    await page.locator('[data-testid="input-gear-serial"]').fill("SN-FX3-01"); // Duplicate!
    await page.locator('[data-testid="submit-add-gear-btn"]').click();

    // Verify unique validation error appears
    const addError = page.locator('[data-testid="add-gear-error"]');
    await expect(addError).toBeVisible();
    await expect(addError).toContainText("Serial number already exists");

    // Correct serial to unique
    const uniqueSerial = isMobile ? "SN-BMPCC-MOB" : "SN-BMPCC-DSK";
    await page.locator('[data-testid="input-gear-serial"]').fill(uniqueSerial);
    await page.locator('[data-testid="submit-add-gear-btn"]').click();
    await expect(page.getByText("নতুন সরঞ্জাম যোগ করুন (Add New Gear)")).toBeHidden({ timeout: 5000 });

    // Verify newly added gear is displayed in its row/card
    const addedItemElement = isMobile
      ? page.locator(`[data-testid="gear-mobile-card-${uniqueSerial}"]`)
      : page.locator(`[data-testid="gear-row-${uniqueSerial}"]`);
    await expect(addedItemElement).toBeVisible();
    await expect(addedItemElement.getByText(uniqueSerial)).toBeVisible();

    // ------------------------------------------------------------------------
    // STEP F: Filters and Search Verification
    // ------------------------------------------------------------------------
    // Status filter tabs
    await page.locator('[data-testid="filter-status-available"]').click();
    await expect(inventoryScope.getByText("Sony FX3 Cinema Body")).toBeVisible();

    // Category filter dropdown
    await page.locator('[data-testid="filter-category-select"]').selectOption("drone");
    await expect(inventoryScope.getByText("DJI Mini 3 Pro Drone")).toBeVisible();
    await expect(inventoryScope.getByText("DJI Air 3S Drone")).toBeVisible();
    await expect(inventoryScope.getByText("Sony FX3 Cinema Body")).toBeHidden();

    // Reset filters
    await page.locator('[data-testid="filter-category-select"]').selectOption("all");
    await page.locator('[data-testid="filter-status-all"]').click();

    // Search input
    const searchInput = page.locator('input[placeholder="Search requisitions, gear, staff..."]');
    await searchInput.fill("RS 4");
    await expect(inventoryScope.getByText("DJI RS 4 Gimbal")).toBeVisible();
    await expect(inventoryScope.getByText("Sony FX3 Cinema Body")).toBeHidden();
    await searchInput.fill("");

    // Final checks: 0 console errors, 0 failed requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
