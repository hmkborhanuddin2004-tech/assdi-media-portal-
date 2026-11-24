import { test, expect } from "@playwright/test";

test.describe("Step 7 (S7-01): Master Calendar & Live Dashboard E2E", () => {
  test.beforeEach(async ({ request }) => {
    await request.get("/api/health?reset=true");
  });

  test("Complete Flow: Create 3 same-day shoots → Chronological Calendar Sort → Live Shoot Slip with PDF & WhatsApp → Live Dashboard KPIs & Approval Queue", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        msg.type() === "error" &&
        !text.includes("favicon") &&
        !text.includes("Failed to load resource")
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

    // Helper: verify zero horizontal overflow
    const verifyZeroHorizontalOverflow = async () => {
      const hasOverflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        return docWidth > winWidth || bodyWidth > winWidth;
      });
      expect(hasOverflow).toBe(false);
    };

    // ========================================================================
    // 1. ADMIN LOG IN & DASHBOARD INITIAL VERIFICATION
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await verifyZeroHorizontalOverflow();

    // Verify Top 3 live KPI Cards exist
    const kpiPending = page.locator("#kpi-pending-count");
    await expect(kpiPending).toBeVisible();
    await expect(kpiPending).toContainText("3টি");

    const kpiActive = page.locator("#kpi-active-tasks-count");
    await expect(kpiActive).toBeVisible();

    const kpiGearInUse = page.locator("#kpi-gear-inuse-count");
    await expect(kpiGearInUse).toBeVisible();

    // Verify Approval Queue Section displays pending requisitions with course names
    const queueSection = page.locator("#dashboard-approval-queue-section");
    await expect(queueSection).toBeVisible();
    await expect(queueSection.getByText("Professional Cooking")).toBeVisible();

    // Verify Emergency Override badge is displayed
    const overrideBadge = page.locator("#dashboard-approval-queue-section").getByText("Override");
    await expect(overrideBadge).toBeVisible();

    // Verify Bottom 2 Live Cards: Task Board Progress + Gear Stock
    await expect(page.locator("#dashboard-task-progress-card")).toBeVisible();
    await expect(page.locator("#dashboard-gear-stock-card")).toBeVisible();

    // Verify Right Column: Master Calendar Preview (Next 7 Days)
    const calendarPreview = page.locator("#dashboard-calendar-preview-section");
    await expect(calendarPreview).toBeVisible();

    // Quick action: Click PDF Slip on first upcoming shoot in preview
    const firstQuickSlipBtn = calendarPreview.locator("button:has-text('PDF Slip')").first();
    if (await firstQuickSlipBtn.isVisible()) {
      await firstQuickSlipBtn.click();
      const slipModal = page.locator("#shoot-assignment-slip-card");
      await expect(slipModal).toBeVisible();
      await expect(page.locator("#slip-number-badge")).toBeVisible();
      await expect(page.locator("#slip-download-pdf-btn")).toBeVisible();
      await expect(page.locator("#slip-share-whatsapp-btn")).toBeVisible();

      // Close modal
      await page.click("#close-slip-modal-btn");
      await expect(slipModal).not.toBeVisible();
    }

    // ========================================================================
    // 2. CREATE 3 SHOOTS ON THE SAME DAY ACROSS DIFFERENT COURSES & TIMES
    // ========================================================================
    // Target Date: 2026-11-25 (Tomorrow in Asia/Dhaka)
    // Shoot A: 09:00 AM • Electrical
    // Shoot B: 11:30 AM • Mobile Servicing
    // Shoot C: 04:30 PM • Dawah
    // (Existing: 02:00 PM • Motorcycle Servicing)
    const sameDay = "2026-11-25";

    // Shoot A: Electrical at 09:00 AM
    const resA = await page.request.post("/api/requisitions", {
      data: {
        course_id: "c1000000-0000-0000-0000-000000000004", // Electrical
        program_type: "visitor_reel",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: "ba000000-0000-0000-0000-000000000001",
        shoot_date: sameDay,
        call_time: "09:00 AM",
        coordinator_phone: "01711000001",
        notes: "Morning Electrical Lab Shoot",
        is_emergency_override: true,
        override_reason: "Special media documentation directive",
      },
    });
    const jsonA = await resA.json();
    await page.request.patch(`/api/requisitions/${jsonA.requisition.id}`, {
      data: {
        action: "approve",
        lead_staff_id: "00000000-0000-0000-0000-000000000007", // Arif
        assignee_ids: [
          "00000000-0000-0000-0000-000000000007",
          "00000000-0000-0000-0000-000000000004",
        ],
        deadline_at: `${sameDay}T18:00:00Z`,
        gear_ids: ["g1000000-0000-0000-0000-000000000005"], // Sony A7C
      },
    });

    // Shoot B: Mobile Servicing at 11:30 AM
    const resB = await page.request.post("/api/requisitions", {
      data: {
        course_id: "c1000000-0000-0000-0000-000000000003", // Mobile Servicing
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: "ba000000-0000-0000-0000-000000000003",
        shoot_date: sameDay,
        call_time: "11:30 AM",
        coordinator_phone: "01711000001",
        notes: "Midday Mobile Lab Demonstration",
        is_emergency_override: true,
        override_reason: "Special emergency override by Media Head",
      },
    });
    const jsonB = await resB.json();
    await page.request.patch(`/api/requisitions/${jsonB.requisition.id}`, {
      data: {
        action: "approve",
        lead_staff_id: "00000000-0000-0000-0000-000000000003", // Tariqul
        assignee_ids: [
          "00000000-0000-0000-0000-000000000003",
          "00000000-0000-0000-0000-000000000005",
        ],
        deadline_at: `${sameDay}T18:00:00Z`,
        gear_ids: ["g1000000-0000-0000-0000-000000000002"], // Sony FX30
      },
    });

    // ========================================================================
    // 3. NAVIGATE TO /admin/calendar & VERIFY CHRONOLOGICAL ORDERING
    // ========================================================================
    await page.goto("/admin/calendar");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    // Verify Filter Tabs exist
    const tabTomorrow = page.locator("#calendar-tab-tomorrow");
    const tabNext3Days = page.locator("#calendar-tab-next_3_days");
    const tabNext7Days = page.locator("#calendar-tab-next_7_days");

    await expect(tabTomorrow).toBeVisible();
    await expect(tabNext3Days).toBeVisible();
    await expect(tabNext7Days).toBeVisible();

    // On Tomorrow tab: Verify all shoots on 2026-11-25 are listed
    // Ordered: 09:00 AM (Electrical) < 11:30 AM (Mobile) < 02:00 PM (Motorcycle)
    const shootCards = page.locator("#calendar-shoots-list > div");
    await expect(shootCards).toHaveCount(3);

    const shoot1 = shootCards.nth(0);
    const shoot2 = shootCards.nth(1);
    const shoot3 = shootCards.nth(2);

    // Verify strict chronological order
    await expect(shoot1).toContainText("09:00 AM");
    await expect(shoot1).toContainText("Electrical");

    await expect(shoot2).toContainText("11:30 AM");
    await expect(shoot2).toContainText("Mobile Servicing");

    await expect(shoot3).toContainText("02:00 PM");
    await expect(shoot3).toContainText("Motorcycle Servicing");

    // ========================================================================
    // 4. LIVE SHOOT ASSIGNMENT SLIP INTERACTION (Desktop Right Panel & Mobile Modal)
    // ========================================================================
    if (!isMobile) {
      // Desktop Right Panel
      const slipPanel = page.locator("#calendar-shoot-slip-panel");
      await expect(slipPanel).toBeVisible();

      // Click second shoot (Mobile Servicing at 11:30 AM)
      await shoot2.click();
      await expect(page.locator("#calendar-slip-course")).toContainText("Mobile Servicing");
      await expect(page.locator("#calendar-slip-calltime")).toContainText("11:30 AM");

      // Verify 1-click Download PDF and WhatsApp share buttons in right panel
      const downloadBtn = page.locator("#calendar-download-pdf-btn");
      const whatsappBtn = page.locator("#calendar-share-whatsapp-btn");
      await expect(downloadBtn).toBeVisible();
      await expect(whatsappBtn).toBeVisible();

      const whatsappHref = await whatsappBtn.getAttribute("href");
      expect(whatsappHref).toContain("https://wa.me/?text=");
      expect(whatsappHref).toContain("Mobile%20Servicing");

      // Click third shoot (Motorcycle Servicing at 02:00 PM)
      await shoot3.click();
      await expect(page.locator("#calendar-slip-course")).toContainText("Motorcycle Servicing");
      await expect(page.locator("#calendar-slip-calltime")).toContainText("02:00 PM");
    } else {
      // Mobile: Tap "স্লিপ দেখুন" button on second shoot
      const viewSlipBtn = shoot2.locator("button:has-text('স্লিপ দেখুন')");
      await viewSlipBtn.click();

      const mobileSlipModal = page.locator("#shoot-assignment-slip-card");
      await expect(mobileSlipModal).toBeVisible();
      await expect(page.locator("#slip-course-title")).toContainText("Mobile Servicing");
      await expect(mobileSlipModal.locator("#slip-download-pdf-btn")).toBeVisible();
      await expect(mobileSlipModal.locator("#slip-share-whatsapp-btn")).toBeVisible();

      await page.click("#close-slip-modal-btn");
      await expect(mobileSlipModal).not.toBeVisible();
    }

    // ========================================================================
    // 5. TEST FILTER TABS (Next 3 Days & Next 7 Days)
    // ========================================================================
    const res3Promise = page.waitForResponse(
      (r) => r.url().includes("/api/calendar?window=next_3_days") && r.status() === 200
    );
    await tabNext3Days.click();
    await res3Promise;
    await verifyZeroHorizontalOverflow();
    await expect(shootCards.first()).toBeVisible({ timeout: 5000 });
    const count3 = await shootCards.count();
    expect(count3).toBeGreaterThanOrEqual(3);

    const res7Promise = page.waitForResponse(
      (r) => r.url().includes("/api/calendar?window=next_7_days") && r.status() === 200
    );
    await tabNext7Days.click();
    await res7Promise;
    await verifyZeroHorizontalOverflow();
    await expect(shootCards.first()).toBeVisible({ timeout: 5000 });
    await expect(async () => {
      const count7 = await shootCards.count();
      expect(count7).toBeGreaterThanOrEqual(count3);
    }).toPass({ timeout: 5000 });

    // ========================================================================
    // 6. DASHBOARD REJECTION FLOW (With Mandatory Reason)
    // ========================================================================
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    // Reject Professional Cooking requisition
    const rejectBtn = page.locator("#dashboard-reject-btn-r1000000-0000-0000-0000-000000000007");
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    const rejectModal = page.locator("#dashboard-reject-modal");
    await expect(rejectModal).toBeVisible();

    // Empty reason must fail
    await page.click("#confirm-reject-btn");
    await expect(page.locator("#reject-error-banner")).toBeVisible();

    // Enter mandatory reason
    await page.fill(
      "#rejection-reason-input",
      "Lead time insufficient for documentary production and crew is fully assigned."
    );
    await page.click("#confirm-reject-btn");
    await expect(rejectModal).not.toBeVisible();

    // Professional Cooking must disappear from queue
    await expect(page.locator("#approval-queue-item-r1000000-0000-0000-0000-000000000007")).not.toBeVisible();

    // Verify 0 console errors and 0 failed requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
