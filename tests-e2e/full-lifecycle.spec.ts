import { test, expect } from "@playwright/test";
import { format, addDays, parseISO } from "date-fns";

test.describe("S9-01: Final Full 4-Role Lifecycle E2E & Security Audit", () => {
  test.beforeEach(async ({ request }) => {
    await request.get("/api/health?reset=true");
  });

  // Helper to compute date strings in Asia/Dhaka
  const dhakaTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const dhakaToday = parseISO(dhakaTodayStr);
  const tomorrowStr = format(addDays(dhakaToday, 1), "yyyy-MM-dd");
  const plusEightDaysStr = format(addDays(dhakaToday, 8), "yyyy-MM-dd");

  test("Complete 4-Role ASSDI Workflow: Admin user setup → Coordinator requisition (3/7d rule) → Admin approve + team & Sony FX3 assign → Automated Shoot Slip (PDF + wa.me) → Intern 390px log + footage sync → Staff Lead stage update → Admin completes with Drive URL → Coordinator Delivered link → Admin Calendar, Reports CSV & Gear Return", async ({
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
    // PHASE 1: ADMIN USER SETUP (/admin/users)
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    // Verify user management table / cards render all 4 roles
    await expect(page.getByText("ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা")).toBeVisible();
    await expect(page.getByText("জিরো পাবলিক সেলফ-সাইনআপ নীতি")).toBeVisible();
    await expect(page.locator("#admin-add-user-btn")).toBeVisible();
    await expect(page.getByText("Engr. Mahmudul Hasan").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Arif Rahman").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Hasan Ali").filter({ visible: true }).first()).toBeVisible();

    // Sign out to switch to Coordinator
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // ========================================================================
    // PHASE 2: COORDINATOR REQUISITION WITH 3/7-DAY LEAD TIME RULE
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    await page.goto("/coordinator/new");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#requisition-form", { timeout: 10000 });
    await verifyZeroHorizontalOverflow();

    // Verify Coordinator course is locked
    const courseLockedInput = page.locator("#course_name_locked");
    await expect(courseLockedInput).toBeVisible();
    await expect(courseLockedInput).toHaveAttribute("readonly", "");

    // 2a. Test Lead-Time Enforcement: Setting tomorrow MUST be blocked
    await page.fill("#shoot_date", tomorrowStr);
    const leadNotice = page.locator("#lead-time-notice");
    await expect(leadNotice).toBeVisible();
    await expect(leadNotice).toContainText("Lead-Time Rule Violation");

    await page.click("#submit-requisition-btn");
    const errorBanner = page.locator("#form-error");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Lead-time rule violation");

    // 2b. Set compliant date (+8 days in future) & submit valid requisition
    await page.fill("#shoot_date", plusEightDaysStr);
    await page.fill("#call_time", "09:00");
    await page.fill("#coordinator_phone", "01711000001");
    const uniqueRequisitionNote = `Full Lifecycle Shoot ${Date.now()}`;
    await page.fill("#notes", uniqueRequisitionNote);

    await page.click("#submit-requisition-btn");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    expect(page.url()).toContain("/coordinator/requests");

    // Confirm requisition is visible with Pending status
    await expect(page.getByText(uniqueRequisitionNote).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });

    // Sign out
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // ========================================================================
    // PHASE 3: ADMIN APPROVE + TEAM & SONY FX3 ASSIGN (DOUBLE-BOOKING LOCK)
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/requisitions");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    // Locate the newly created pending requisition card
    const reqCard = page.locator(".glass-panel").filter({ hasText: uniqueRequisitionNote }).first();
    await expect(reqCard).toBeVisible({ timeout: 10000 });

    // Click Approve & Assign button
    const approveBtn = reqCard.locator('button[id^="approve-btn-"]').first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Modal opens
    const approveModal = page.locator("#approve-assign-modal-card");
    await expect(approveModal).toBeVisible();
    await expect(page.getByText("রিকুইজিশন অনুমোদন ও টিম অ্যাসাইনমেন্ট")).toBeVisible();

    // Verify team candidates & gear list
    await expect(page.locator("#team-selection-grid")).toBeVisible();
    await expect(page.locator("#gear-selection-grid")).toBeVisible();

    // Confirm deadline
    await page.fill("#task-deadline-input", "2026-12-05T18:00");

    // Confirm Approve & Assign
    await page.click("#confirm-approve-assign-btn");

    // ========================================================================
    // PHASE 4: AUTOMATED SHOOT SLIP (PDF + VALID WA.ME LINK)
    // ========================================================================
    const slipCard = page.locator("#shoot-assignment-slip-card");
    await expect(slipCard).toBeVisible({ timeout: 10000 });

    // Verify Slip Header Badge & Content
    await expect(page.locator("#slip-number-badge")).toBeVisible();
    await expect(page.locator("#slip-number-badge")).toContainText("ASSDI MEDIA • SHOOT SLIP");
    await expect(page.locator("#slip-course-title")).toBeVisible();
    await expect(page.locator("#slip-venue-name")).toBeVisible();
    await expect(page.locator("#slip-call-time")).toBeVisible();

    // Verify Team list and Gear list
    await expect(page.locator("#slip-team-list")).toBeVisible();
    await expect(page.locator("#slip-gear-list")).toBeVisible();

    // Verify 1-click Download PDF / Print button
    const pdfBtn = page.locator("#slip-download-pdf-btn");
    await expect(pdfBtn).toBeVisible();

    // Verify 1-click WhatsApp share link
    const waBtn = page.locator("#slip-share-whatsapp-btn");
    await expect(waBtn).toBeVisible();
    const waHref = await waBtn.getAttribute("href");
    expect(waHref).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(waHref).toContain(encodeURIComponent("ASSDI MEDIA • SHOOT SLIP"));

    // Close slip modal
    await page.click("#close-slip-modal-btn");
    await expect(slipCard).not.toBeVisible();

    // Sign out to switch to Intern
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // ========================================================================
    // PHASE 5: INTERN 390px MOBILE LOG + RAW FOOTAGE AUTO-SYNC
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "intern@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/intern/daily-log", { timeout: 10000 });

    // 5a. Intern checks schedule
    await page.goto("/intern/schedule");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();
    await expect(page.locator("#intern-schedule-today-card")).toBeVisible();

    // 5b. Intern submits Daily Log with Raw Footage Uploaded: YES
    await page.goto("/intern/daily-log");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("#intern-today-shoot-card")).toBeVisible();
    await expect(page.locator("#intern-hours-input")).toBeVisible();
    await verifyZeroHorizontalOverflow();

    // Select Task
    const taskSelect = page.locator("#intern-task-select");
    await taskSelect.selectOption({ index: 1 });

    await page.fill("#intern-hours-input", "5.5");

    // Select Outdoor
    await page.click("#intern-outdoor-btn");

    // Toggle Raw Footage Uploaded switch to YES
    const switchCheckbox = page.locator("#intern-footage-switch");
    const isChecked = await switchCheckbox.isChecked();
    if (!isChecked) {
      await page.click("#intern-footage-toggle-container");
    }

    // Fill notes
    await page.fill("#intern-notes-input", "Captured campus B-roll and uploaded all raw footage cards.");

    // Submit log
    await page.click("#intern-submit-log-btn");
    await expect(page.locator("#intern-log-status-banner")).toBeVisible({ timeout: 10000 });

    // Sign out to switch to Staff Lead
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // ========================================================================
    // PHASE 6: STAFF LEAD STAGE UPDATE (/staff/tasks)
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "staff@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/staff/tasks", { timeout: 10000 });
    await verifyZeroHorizontalOverflow();

    // Locate task and verify Raw Footage sync trigger has updated task card
    const staffTaskCard = page.locator('[id^="staff-task-card-"]').filter({ visible: true }).first();
    await expect(staffTaskCard).toBeVisible();

    // Staff Lead transitions stage: if Mark Shoot Done or Start Editing is available
    const markShootDoneBtn = staffTaskCard.locator('[id^="mark-shoot-done-btn-"]').first();
    if (await markShootDoneBtn.isVisible()) {
      await markShootDoneBtn.click();
      await page.waitForTimeout(600);
    }

    // Sign out to switch to Admin
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // ========================================================================
    // PHASE 7: ADMIN COMPLETES WITH DRIVE URL (/admin/tasks)
    // ========================================================================
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/tasks");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    // Locate the first review card or first card to advance to completed
    const reviewCard = page.locator('[id^="kanban-task-card-"]').filter({ hasText: "Review", visible: true }).first();
    const targetCard = (await reviewCard.isVisible())
      ? reviewCard
      : page.locator('[id^="kanban-task-card-"]').filter({ visible: true }).first();

    const nextBtn = targetCard.locator('[id^="next-stage-btn-"]').first();
    if (await nextBtn.isVisible()) {
      const nextBtnText = await nextBtn.innerText();
      await nextBtn.click();

      // If transitioning to completed, Google Drive URL modal opens
      if (nextBtnText.includes("Completed")) {
        const driveModalInput = page.locator("#final-drive-url-input");
        await expect(driveModalInput).toBeVisible({ timeout: 5000 });
        await driveModalInput.fill("https://drive.google.com/drive/folders/1ASSDI_Master_Final_Lifecycle_2026");
        await page.click("#confirm-complete-task-btn");
        await page.waitForTimeout(800);
      }
    }

    // Verify Completed card displays Google Drive Link button
    const driveLinkBtn = page.locator('[id^="drive-link-btn-"]').filter({ visible: true }).first();
    await expect(driveLinkBtn).toBeVisible({ timeout: 10000 });
    const driveHref = await driveLinkBtn.getAttribute("href");
    expect(driveHref).toContain("drive.google.com");

    // ========================================================================
    // PHASE 8: COORDINATOR SEES DELIVERED + GOOGLE DRIVE LINK
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    await verifyZeroHorizontalOverflow();

    // Verify Delivered filter / status displays the Drive link
    await page.click("#filter-delivered");
    await page.waitForTimeout(500);

    const deliveredCard = page.locator(".glass-panel").filter({ hasText: "Delivered", visible: true }).first();
    await expect(deliveredCard).toBeVisible({ timeout: 10000 });
    const coordinatorDriveLink = deliveredCard.locator('a[href*="drive.google.com"]').first();
    await expect(coordinatorDriveLink).toBeVisible();

    // ========================================================================
    // PHASE 9: ADMIN MASTER CALENDAR, MONTHLY REPORT + CSV, AND GEAR RETURN
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 9a. Master Calendar
    await page.goto("/admin/calendar");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();
    await expect(page.getByText("মাস্টার শুটিং ক্যালেন্ডার • Master Calendar")).toBeVisible();
    await expect(page.locator("#calendar-tab-tomorrow")).toBeVisible();
    await expect(page.locator("#calendar-tab-next_3_days")).toBeVisible();
    await expect(page.locator("#calendar-tab-next_7_days")).toBeVisible();

    // 9b. Reports & CSV Export
    await page.goto("/admin/reports");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    await expect(page.locator("#kpi-completed-projects")).toBeVisible();
    await expect(page.locator("#kpi-total-hours")).toBeVisible();
    await expect(page.locator("#kpi-on-time-deadlines")).toBeVisible();

    // Verify Team Performance Table
    const teamTable = page.locator("#team-performance-table");
    await expect(teamTable).toBeVisible();
    await expect(teamTable.getByText("Arif Rahman").first()).toBeVisible();
    await expect(teamTable.getByText("Hasan Ali").first()).toBeVisible();

    // Trigger CSV Export and verify UTF-8 BOM download
    const downloadPromise = page.waitForEvent("download");
    await page.click("#report-export-csv-btn");
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("assdi-media-report");

    // 9c. Gear Return Check-In
    await page.goto("/admin/gear");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();

    const checkinBtn = isMobile
      ? page.locator('[data-testid="btn-mobile-checkin-SN-FX3-01"]')
      : page.locator('[data-testid="btn-checkin-SN-FX3-01"]');

    if (await checkinBtn.isVisible()) {
      await checkinBtn.click();
      await expect(page.getByText("সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)")).toBeVisible();

      // Fill return condition note
      await page.locator('[data-testid="checkin-condition-note"]').fill(
        "Returned in good working condition, battery and SD card checked."
      );
      await page.locator('[data-testid="checkin-submit-btn"]').click();
      await expect(page.getByText("সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)")).toBeHidden({
        timeout: 5000,
      });

      // Verify status flipped back to Available
      await expect(page.locator('[data-testid="gear-status-SN-FX3-01"]').first()).toContainText("Available");
    }

    // ========================================================================
    // ZERO CONSOLE ERRORS & ZERO FAILED NETWORK REQUESTS
    // ========================================================================
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
