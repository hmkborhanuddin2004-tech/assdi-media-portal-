import { test, expect } from "@playwright/test";

test.describe("Step 6 (S6-01 to S6-04): Task Board, Kanban Pipeline, Shoot Slip, Staff Lead & Coordinator Mapping E2E", () => {
  test.beforeEach(async ({ request }) => {
    await request.get("/api/health?reset=true");
  });

  test("Full Pipeline: Admin approves & assigns → Shoot Slip with WhatsApp → Staff Lead stage transitions → Completed with Drive URL → Coordinator Delivered link", async ({
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
    // 1. ADMIN LOG IN & APPROVE & ASSIGN MODAL ON /admin/requisitions
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

    // Verify Pending Requisition exists (SBMC Bakery Reel)
    const pendingApproveBtn = page.locator('[id^="approve-btn-r1000000-0000-0000-0000-000000000010"]').first();
    await expect(pendingApproveBtn).toBeVisible({ timeout: 10000 });

    // Click Approve & Assign button
    await pendingApproveBtn.click();

    // Verify Approve & Assign Modal appears
    const modal = page.locator("#approve-assign-modal-card");
    await expect(modal).toBeVisible();
    await expect(page.getByText("রিকুইজিশন অনুমোদন ও টিম অ্যাসাইনমেন্ট")).toBeVisible();

    // Verify Team Candidates selection grid is loaded
    await expect(page.locator("#team-selection-grid")).toBeVisible();
    await expect(page.getByText("Arif Rahman")).toBeVisible();
    await expect(page.getByText("Hasan Ali")).toBeVisible();

    // Set deadline
    await page.fill("#task-deadline-input", "2026-12-05T18:00");

    // Click Confirm Approve & Assign
    await page.click("#confirm-approve-assign-btn");

    // ========================================================================
    // 2. VERIFY AUTOMATED SHOOT ASSIGNMENT SLIP MODAL & WhatsApp LINK
    // ========================================================================
    const slipCard = page.locator("#shoot-assignment-slip-card");
    await expect(slipCard).toBeVisible({ timeout: 10000 });

    // Verify Slip Header & Contents
    await expect(page.locator("#slip-number-badge")).toBeVisible();
    await expect(page.locator("#slip-number-badge")).toContainText("ASSDI MEDIA • SHOOT SLIP");
    await expect(page.locator("#slip-course-title")).toBeVisible();
    await expect(page.locator("#slip-venue-name")).toBeVisible();
    await expect(page.locator("#slip-call-time")).toBeVisible();

    // Verify Team phones and Assigned Gear
    await expect(page.locator("#slip-team-list")).toContainText("01711000007"); // Arif's phone
    await expect(page.locator("#slip-gear-list")).toBeVisible();

    // Verify 1-click Download PDF / Print button
    const pdfBtn = page.locator("#slip-download-pdf-btn");
    await expect(pdfBtn).toBeVisible();

    // Verify 1-click zero-cost WhatsApp share link
    const waBtn = page.locator("#slip-share-whatsapp-btn");
    await expect(waBtn).toBeVisible();
    const waHref = await waBtn.getAttribute("href");
    expect(waHref).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(waHref).toContain(encodeURIComponent("ASSDI MEDIA • SHOOT SLIP"));

    // Close slip modal
    await page.click("#close-slip-modal-btn");
    await expect(slipCard).not.toBeVisible();

    // ========================================================================
    // 3. CENTRAL TASK BOARD (/admin/tasks) KANBAN VERIFICATION
    // ========================================================================
    await page.goto("/admin/tasks");
    await page.waitForLoadState("domcontentloaded");

    await verifyZeroHorizontalOverflow();

    // Verify Header
    await expect(page.locator("h1")).toContainText("Task Board");

    // If mobile, check that mobile stage selector tabs work
    if (isMobile) {
      await page.click("button:has-text('Shoot Assigned')");
      await expect(page.locator("#kanban-column-shoot_assigned")).toBeVisible();
      await page.click("button:has-text('All (')");
    }

    // Verify all 6 columns present
    await expect(page.locator("#kanban-column-pending")).toBeVisible();
    await expect(page.locator("#kanban-column-shoot_assigned")).toBeVisible();
    await expect(page.locator("#kanban-column-shoot_done")).toBeVisible();
    await expect(page.locator("#kanban-column-editing")).toBeVisible();
    await expect(page.locator("#kanban-column-review")).toBeVisible();
    await expect(page.locator("#kanban-column-completed")).toBeVisible();

    // Verify Task 1 card in Shoot Assigned ("The Art of Creation")
    const task1Card = page.locator("#task-card-t1000000-0000-0000-0000-000000000001");
    await expect(task1Card).toBeVisible();
    await expect(task1Card).toContainText("The Art of Creation");

    // Verify Search Box works
    await page.fill("#task-board-search-input", "Motorcycle");
    await expect(page.getByText("Motorcycle Servicing")).toBeVisible();
    await page.fill("#task-board-search-input", "");

    // Verify Shoot Slip button on card opens slip
    await page.click("#slip-btn-t1000000-0000-0000-0000-000000000001");
    await expect(slipCard).toBeVisible();
    await page.click("#close-slip-modal-btn");

    // ========================================================================
    // 4. STAFF LEAD TASK EXECUTION (/staff/tasks) & RLS LEADING
    // ========================================================================
    // Log out admin and log in as Staff Project Lead Arif Rahman
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "arif@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/staff/tasks", { timeout: 10000 });

    await verifyZeroHorizontalOverflow();

    // Verify Project Lead badge is visible on Task 1
    const leadBadge = page.locator("#lead-badge-t1000000-0000-0000-0000-000000000001");
    await expect(leadBadge).toBeVisible();

    // Staff Lead transitions stage: Shoot Assigned → Shoot Done
    const shootDoneBtn = page.locator("#mark-shoot-done-btn-t1000000-0000-0000-0000-000000000001");
    await expect(shootDoneBtn).toBeVisible();
    await shootDoneBtn.click();
    await expect(page.locator("#staff-tasks-status-banner")).toBeVisible();

    // Staff Lead transitions stage: Shoot Done → Start Editing
    const startEditingBtn = page.locator("#start-editing-btn-t1000000-0000-0000-0000-000000000001");
    await expect(startEditingBtn).toBeVisible({ timeout: 5000 });
    await startEditingBtn.click();

    // Staff Lead transitions stage: Editing → Submit for Review
    const submitReviewBtn = page.locator("#submit-review-btn-t1000000-0000-0000-0000-000000000001");
    await expect(submitReviewBtn).toBeVisible({ timeout: 5000 });
    await submitReviewBtn.click();

    // Staff Lead attaches Google Drive URL
    const attachDriveBtn = page.locator("#attach-drive-btn-t1000000-0000-0000-0000-000000000001");
    await attachDriveBtn.click();

    // Test rejection of invalid non-Google-Drive URL
    await page.fill("#staff-drive-url-input", "https://dropbox.com/s/invalid/video.mp4");
    await page.click("#staff-save-drive-btn");
    await expect(page.locator("#staff-drive-error-banner")).toBeVisible();

    // Input valid Google Drive URL
    const driveUrl = "https://drive.google.com/drive/folders/1AOC-Master-Course-Final-Delivered";
    await page.fill("#staff-drive-url-input", driveUrl);
    await page.click("#staff-save-drive-btn");

    // Verify Drive link now appears on card
    await expect(page.getByText("Google Drive delivery link attached")).toBeVisible({ timeout: 5000 });

    // Check /staff/intern-status route
    await page.goto("/staff/intern-status");
    await page.waitForLoadState("domcontentloaded");
    await verifyZeroHorizontalOverflow();
    await expect(page.locator("h1")).toContainText("Intern Status");

    // Verify toggle footage button works strictly (zero skipping)
    const toggleBtn = page.locator('[id^="toggle-footage-btn-"]').first();
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();
    await expect(page.getByText("সফলভাবে")).toBeVisible({ timeout: 5000 });

    // ========================================================================
    // 5. ADMIN MARKS TASK COMPLETED
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/tasks");
    await page.waitForLoadState("domcontentloaded");

    // Transition Task 1 from Review to Completed
    if (isMobile) {
      await page.locator("button", { hasText: /Review \(\d+\)/ }).click();
    }
    const completeNextBtn = page.locator("#next-stage-btn-t1000000-0000-0000-0000-000000000001");
    await expect(completeNextBtn).toBeVisible({ timeout: 10000 });
    await completeNextBtn.click();

    // Completed dialog opens
    await expect(page.locator("#final-drive-url-input")).toBeVisible();
    await page.fill("#final-drive-url-input", driveUrl);
    await page.click("#confirm-complete-task-btn");
    await expect(page.locator("#final-drive-url-input")).toBeHidden({ timeout: 5000 });

    if (isMobile) {
      await page.locator("button", { hasText: /Completed \(\d+\)/ }).click();
    }

    // Verify Completed card shows Google Drive Link button matching mockup
    const driveBtn = page.locator("#drive-link-btn-t1000000-0000-0000-0000-000000000001");
    await expect(driveBtn).toBeVisible({ timeout: 5000 });
    const driveHref = await driveBtn.getAttribute("href");
    expect(driveHref).toBe(driveUrl);

    // ========================================================================
    // 6. COORDINATOR SEES DELIVERED STATUS & CLICKABLE DRIVE LINK
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "aoc@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    await verifyZeroHorizontalOverflow();

    // Verify Delivered status badge and clickable Google Drive link
    await expect(page.getByText("Delivered (সম্পন্ন)").first()).toBeVisible({ timeout: 10000 });
    const coordDriveLink = page.locator('a:has-text("Google Drive Link")').first();
    await expect(coordDriveLink).toBeVisible();
    const coordHref = await coordDriveLink.getAttribute("href");
    expect(coordHref).toMatch(/^https:\/\/(drive|docs)\.google\.com\//);

    // Filter tab: Delivered
    await page.click("#filter-delivered");
    await expect(coordDriveLink).toBeVisible();

    // Assert 0 console errors and 0 failed network requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("Approve & Assign Modal: blocks intern-as-lead & handles PostgreSQL 23P01 double-booking conflict cleanly", async ({
    page,
  }) => {
    // 1. Log in as Central Admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/requisitions");
    await page.waitForLoadState("domcontentloaded");

    // Click Approve & Assign on Pending Requisition 10 (SBMC Bakery Reel, shoot date: 2026-11-30)
    const req10ApproveBtn = page.locator('[id^="approve-btn-r1000000-0000-0000-0000-000000000010"]').first();
    await expect(req10ApproveBtn).toBeVisible({ timeout: 10000 });
    await req10ApproveBtn.click();

    const modal = page.locator("#approve-assign-modal-card");
    await expect(modal).toBeVisible();

    // Verify Hasan Ali (Intern) does NOT have "Make Lead" button (only Staff can be lead)
    const hasanCard = page.locator("#team-selection-grid > div").filter({ hasText: "Hasan Ali" });
    await expect(hasanCard).toBeVisible();
    await expect(hasanCard.locator("button:has-text('Make Lead')")).not.toBeVisible();

    // First booking on 2026-11-30: select Sony FX30 (SN-FX30-01) and confirm
    const fx30GearCard = page.locator("#gear-selection-grid > div").filter({ hasText: "SN-FX30-01" });
    await expect(fx30GearCard).toBeVisible();
    if ((await fx30GearCard.getAttribute("data-selected")) !== "true") {
      await fx30GearCard.click();
    }

    await page.click("#confirm-approve-assign-btn");

    // Close shoot slip modal
    const slipCard = page.locator("#shoot-assignment-slip-card");
    await expect(slipCard).toBeVisible({ timeout: 10000 });
    await page.click("#close-slip-modal-btn");
    await expect(slipCard).toBeHidden({ timeout: 5000 });

    // Now click Approve & Assign on Pending Requisition 5 (RAC Trade Workshop Promo, ALSO on 2026-11-30)
    const req5ApproveBtn = page.locator('[id^="approve-btn-r1000000-0000-0000-0000-000000000005"]').first();
    await expect(req5ApproveBtn).toBeVisible({ timeout: 10000 });
    await req5ApproveBtn.click();

    await expect(modal).toBeVisible();

    // Attempt conflicting booking: select Sony FX30 (SN-FX30-01) which is already booked on 2026-11-30
    const fx30Card2 = page.locator("#gear-selection-grid > div").filter({ hasText: "SN-FX30-01" });
    await expect(fx30Card2).toBeVisible({ timeout: 10000 });
    if ((await fx30Card2.getAttribute("data-selected")) !== "true") {
      await fx30Card2.click();
    }
    await expect(fx30Card2).toHaveAttribute("data-selected", "true");

    await page.click("#confirm-approve-assign-btn");

    // Verify PostgreSQL 23P01 double-booking banner appears in modal
    const conflictAlert = page.locator("#gear-conflict-alert");
    await expect(conflictAlert).toBeVisible({ timeout: 10000 });
    await expect(conflictAlert).toContainText("Double-Booking Blocked (PostgreSQL Code: 23P01)");

    // Close modal and verify requisition 5 is STILL pending (zero partial state)
    await page.click("#close-approve-modal-btn");
    await expect(modal).not.toBeVisible();
    await expect(req5ApproveBtn).toBeVisible();
  });
});
