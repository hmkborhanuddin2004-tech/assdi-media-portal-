import { test, expect } from "@playwright/test";
import { format, addDays, parseISO } from "date-fns";

test.describe("S4-01, S4-02 & S4-03: Course Requisition Portal & Lead-Time Rules E2E", () => {
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

  test("Coordinator Requisition Form (/coordinator/new): blocked on tomorrow, succeeds on +8 days", async ({
    page,
  }) => {
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

    // 1. Log in as Coordinator
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    // 2. Navigate to /coordinator/new
    await page.goto("/coordinator/new");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#requisition-form", { timeout: 10000 });

    // Verify 0 console errors & 0 failed requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);

    // Verify 0 horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasOverflow).toBe(false);

    // Verify Coordinator course is locked
    const courseLockedInput = page.locator("#course_name_locked");
    await expect(courseLockedInput).toBeVisible();
    await expect(courseLockedInput).toHaveAttribute("readonly", "");
    const lockedValue = await courseLockedInput.inputValue();
    expect(lockedValue).toContain("Refrigeration & Air Conditioning");

    // 3. Fill with tomorrow's date (< 3 days required)
    await page.fill("#shoot_date", tomorrowStr);

    // Dynamic banner shows violation
    const leadNotice = page.locator("#lead-time-notice");
    await expect(leadNotice).toBeVisible();
    await expect(leadNotice).toContainText("Lead-Time Rule Violation");

    // Click submit -> MUST BE BLOCKED
    await page.click("#submit-requisition-btn");

    // Error banner appears with lead-time violation message
    const errorBanner = page.locator("#form-error");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Lead-time rule violation");
    await expect(errorBanner).toContainText("Asia/Dhaka");

    // 4. Now fix date to +8 days in future (compliant)
    await page.fill("#shoot_date", plusEightDaysStr);
    await page.fill("#notes", "E2E Verified Autonomous Requisition Shoot");

    // Dynamic banner updates to compliant notice
    await expect(leadNotice).toContainText("Minimum");

    // Click submit -> MUST SUCCEED
    await page.click("#submit-requisition-btn");

    // Redirects to /coordinator/requests
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    expect(page.url()).toContain("/coordinator/requests");

    // Verify new requisition appears in the list
    await expect(page.getByText("E2E Verified Autonomous Requisition Shoot").first()).toBeVisible();
  });

  test("Admin approval queue (/admin/requisitions): rejects with mandatory reason and coordinator sees it", async ({
    page,
  }) => {
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

    // 1. Log in as Admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 2. Navigate to /admin/requisitions
    await page.goto("/admin/requisitions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#admin-requisitions-list", { timeout: 10000 });

    // Check errors and overflow
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);

    const hasOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasOverflow).toBe(false);

    // Find the first pending requisition card with Reject button
    const firstRejectBtn = page.locator("button[id^='reject-btn-']").first();
    await expect(firstRejectBtn).toBeVisible();

    // Extract requisition ID
    const rejectBtnId = await firstRejectBtn.getAttribute("id");
    const reqId = rejectBtnId?.replace("reject-btn-", "");
    expect(reqId).toBeDefined();

    // Click Reject to open inline rejection input
    await firstRejectBtn.click();

    const rejectionInput = page.locator(`#rejection-reason-input-${reqId}`);
    await expect(rejectionInput).toBeVisible();

    // Click confirm reject with empty reason -> must fail
    const confirmRejectBtn = page.locator(`#confirm-reject-btn-${reqId}`);
    await confirmRejectBtn.click();

    // Error is shown
    await expect(page.getByText("Rejection requires a non-empty rejection_reason.")).toBeVisible();

    // Now enter valid rejection reason
    const uniqueRejectionSuffix = Date.now().toString().slice(-4);
    const rejectionReasonText = `Camera team fully booked on this date. Please reschedule. #${uniqueRejectionSuffix}`;
    await rejectionInput.fill(rejectionReasonText);
    await confirmRejectBtn.click();

    // Requisition card updates to Rejected
    const reqCard = page.locator(`#admin-req-${reqId}`);
    await expect(reqCard.getByText("Rejected")).toBeVisible();
    await expect(reqCard.getByText(rejectionReasonText)).toBeVisible();

    // 3. Now verify Coordinator sees this exact rejection reason
    // Sign out admin
    await page.goto("/api/auth/signout");
    await page.waitForLoadState("domcontentloaded");

    // Log in as Coordinator
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    // Coordinator requests page must show the exact rejection reason
    await page.waitForSelector("#requisitions-container", { timeout: 10000 });
    await expect(page.getByText(rejectionReasonText).first()).toBeVisible({ timeout: 10000 });
  });

  test("Admin creates Emergency Override with mandatory reason and succeeds", async ({
    page,
  }) => {
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

    // 1. Log in as Admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 2. Go to /admin/requisitions
    await page.goto("/admin/requisitions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#create-emergency-btn", { timeout: 10000 });

    // Click "Emergency Override Requisition" button
    await page.click("#create-emergency-btn");

    // Emergency modal appears
    await expect(page.getByText("Create Emergency Override Requisition")).toBeVisible();

    // Fill date with tomorrow (lead-time < 3/7 days)
    await page.fill("#emergency-date", tomorrowStr);

    // Try submitting without override reason -> must fail
    await page.click("#submit-emergency-btn");
    await expect(page.getByText("Emergency Override requires a non-empty override_reason.")).toBeVisible();

    // Fill valid emergency override reason
    const uniqueEmergencySuffix = Date.now().toString().slice(-4);
    const overrideReasonText = `Special Chairman directive for sudden state VIP dignitary visit #${uniqueEmergencySuffix}`;
    const emergencyNotesText = `Emergency Protocol Live Shoot #${uniqueEmergencySuffix}`;
    await page.fill("#emergency-override-reason", overrideReasonText);
    await page.fill("#emergency-notes", emergencyNotesText);

    // Click submit -> MUST SUCCEED
    await page.click("#submit-emergency-btn");

    // Modal closes and requisition appears in list with Emergency Override badge
    await expect(page.getByText("Create Emergency Override Requisition")).toBeHidden();
    await expect(page.getByText(emergencyNotesText)).toBeVisible();
    await expect(page.getByText(overrideReasonText)).toBeVisible();
    await expect(page.getByText("Emergency Override").first()).toBeVisible();

    // Verify 0 console errors & 0 failed requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("Coordinator Sidebar has ONLY 'New Requisition' and 'My Requests'", async ({
    page,
  }, testInfo) => {
    // Log in as coordinator
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    const isMobile = testInfo.project.name.includes("Mobile");

    if (!isMobile) {
      const desktopSidebar = page.locator("#desktop-sidebar");
      await expect(desktopSidebar).toBeVisible();

      // Wait for session hydration
      await page.waitForSelector("#desktop-sidebar a[href^='/coordinator']", { timeout: 10000 });

      // Check navigation links inside coordinator sidebar
      const navLinks = desktopSidebar.locator("a[href^='/coordinator']");
      const linkCount = await navLinks.count();
      expect(linkCount).toBe(2);

      const firstLinkHref = await navLinks.nth(0).getAttribute("href");
      const secondLinkHref = await navLinks.nth(1).getAttribute("href");

      expect([firstLinkHref, secondLinkHref]).toContain("/coordinator/new");
      expect([firstLinkHref, secondLinkHref]).toContain("/coordinator/requests");

      // Verify no other coordinator nav links exist
      await expect(desktopSidebar.getByText("New Requisition")).toBeVisible();
      await expect(desktopSidebar.getByText("My Requests")).toBeVisible();
      await expect(desktopSidebar.getByText("Gear Inventory")).toBeHidden();
      await expect(desktopSidebar.getByText("Master Calendar")).toBeHidden();
    } else {
      const mobileBottomNav = page.locator("#mobile-bottom-nav");
      await expect(mobileBottomNav).toBeVisible();

      // Wait for session hydration
      await page.waitForSelector("#mobile-bottom-nav a[href^='/coordinator']", { timeout: 10000 });

      const mobileLinks = mobileBottomNav.locator("a[href^='/coordinator']");
      const mobileCount = await mobileLinks.count();
      expect(mobileCount).toBe(2);
    }
  });
});
