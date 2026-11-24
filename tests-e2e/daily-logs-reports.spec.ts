import { test, expect } from "@playwright/test";

test.describe("Step 8 (S8-01, S8-02, S8-03): Staff & Intern Daily Worklogs, Mobile Nav, Task Sync & Analytics Reports", () => {
  test.beforeEach(async ({ request }) => {
    await request.get("/api/health?reset=true");
  });

  test("Complete Step 8 Flow: Staff 5-Category Log → Intern Mobile 4-Tab Nav & Footage Sync → Admin Reports & UTF-8 BOM CSV", async ({
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
      if (
        !request.url().includes("favicon.ico") &&
        errorText !== "net::ERR_ABORTED"
      ) {
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
    // 1. PERMANENT STAFF LOGS IN & SUBMITS 5-CATEGORY WORKLOG (/staff/daily-log)
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "arif@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/staff/tasks", { timeout: 10000 });
    expect(page.url()).toContain("/staff/tasks");
    await verifyZeroHorizontalOverflow();

    // Navigate to /staff/daily-log
    await page.goto("/staff/daily-log");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#staff-category-pills", { timeout: 10000 });
    await verifyZeroHorizontalOverflow();

    // Verify all 5 category pills are present and clickable
    const categories = [
      "daily_cinematography",
      "video_editing",
      "book_review",
      "script_research",
      "content_management",
    ];

    for (const cat of categories) {
      const pill = page.locator(`button[data-category="${cat}"]`);
      await expect(pill).toBeVisible();
      await pill.click();
    }

    // Select "daily_cinematography" for submission
    await page.locator('button[data-category="daily_cinematography"]').click();

    // Fill Hours Worked
    await page.fill("#staff-hours-input", "6.5");

    // Fill Short Work Summary
    const staffNoteText =
      "Captured B-roll of the main courtyard, interviewed 3 senior staff for The Art of Creation course.";
    await page.fill("#staff-notes-input", staffNoteText);

    // Submit Daily Log
    await page.click("#staff-submit-log-btn");

    // Verify Success Banner
    const statusBanner = page.locator("#staff-log-status-banner");
    await expect(statusBanner).toBeVisible({ timeout: 10000 });
    await expect(statusBanner).toContainText("দৈনিক কাজের লগ সফলভাবে সংরক্ষিত হয়েছে");

    // Verify recent logs table contains the newly submitted log
    const recentLogsTable = page.locator("#staff-recent-logs-table");
    await expect(recentLogsTable).toBeVisible();
    await expect(recentLogsTable).toContainText("6.5 hrs");
    await expect(recentLogsTable).toContainText("Daily Cinematography");

    await verifyZeroHorizontalOverflow();

    // ========================================================================
    // 2. INTERN LOGS IN & NAVIGATES ALL 4 BOTTOM-NAV TABS WITH ZERO 404s
    // ========================================================================
    // Sign out staff and log in as Intern
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "hasan@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    // Intern redirects to /intern/daily-log or schedule
    await page.waitForTimeout(1000);
    await verifyZeroHorizontalOverflow();

    // Tab 1: /intern/schedule
    await page.goto("/intern/schedule");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/intern/schedule");
    await expect(page.locator("h1")).toContainText("Assigned Shoots");
    await expect(page.locator("#intern-schedule-today-card")).toBeVisible();
    await verifyZeroHorizontalOverflow();

    // Tab 2: /intern/daily-log
    await page.goto("/intern/daily-log");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/intern/daily-log");
    await expect(page.locator("#intern-today-shoot-card")).toBeVisible();
    await expect(page.locator("#intern-hours-input")).toBeVisible();
    await verifyZeroHorizontalOverflow();

    // Tab 3: /intern/tasks
    await page.goto("/intern/tasks");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/intern/tasks");
    await expect(page.locator("h1")).toContainText("Assigned Tasks");
    await expect(page.locator("#intern-tasks-list")).toBeVisible();
    await verifyZeroHorizontalOverflow();

    // Tab 4: /intern/profile
    await page.goto("/intern/profile");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/intern/profile");
    await expect(page.locator("h1")).toContainText("Intern Member Profile");
    await expect(page.getByRole("heading", { name: "Hasan Ali" })).toBeVisible();
    await verifyZeroHorizontalOverflow();

    // If mobile viewport, test bottom navigation links explicitly
    if (isMobile) {
      const bottomNav = page.locator("#mobile-bottom-nav");
      await expect(bottomNav).toBeVisible();

      // Click Schedule (Home) tab
      const homeTab = bottomNav.locator('a[href="/intern/schedule"]');
      await expect(homeTab).toBeVisible();
      await homeTab.click();
      await page.waitForURL("**/intern/schedule");
      expect(page.url()).toContain("/intern/schedule");

      // Click Logs tab
      const logsTab = bottomNav.locator('a[href="/intern/daily-log"]');
      await expect(logsTab).toBeVisible();
      await logsTab.click();
      await page.waitForURL("**/intern/daily-log");
      expect(page.url()).toContain("/intern/daily-log");

      // Click Tasks tab
      const tasksTab = bottomNav.locator('a[href="/intern/tasks"]');
      await expect(tasksTab).toBeVisible();
      await tasksTab.click();
      await page.waitForURL("**/intern/tasks");
      expect(page.url()).toContain("/intern/tasks");

      // Click Profile tab
      const profileTab = bottomNav.locator('a[href="/intern/profile"]');
      await expect(profileTab).toBeVisible();
      await profileTab.click();
      await page.waitForURL("**/intern/profile");
      expect(page.url()).toContain("/intern/profile");
    }

    // ========================================================================
    // 3. INTERN SUBMITS MOBILE LOG WITH RAW FOOTAGE YES → DB TRIGGER SYNC
    // ========================================================================
    await page.goto("/intern/daily-log");
    await page.waitForLoadState("domcontentloaded");

    // Select Task 1 (t1000000-0000-0000-0000-000000000001: The Art of Creation)
    const taskSelect = page.locator("#intern-task-select");
    await taskSelect.selectOption("t1000000-0000-0000-0000-000000000001");

    // Fill Hours: 4.5
    await page.fill("#intern-hours-input", "4.5");

    // Toggle Outdoor
    await page.click("#intern-outdoor-btn");

    // Ensure Raw Footage Uploaded switch is checked
    const switchCheckbox = page.locator("#intern-footage-switch");
    const isChecked = await switchCheckbox.isChecked();
    if (!isChecked) {
      await page.click("#intern-footage-toggle-container");
    }
    expect(await switchCheckbox.isChecked()).toBe(true);

    // Fill draft notes
    const internNoteText =
      "Some B-roll of the main courtyard, interviewed 3 student groups. Uploaded all RAW footage.";
    await page.fill("#intern-notes-input", internNoteText);
    await page.waitForTimeout(300);

    // Verify LocalStorage Draft auto-save resilience: navigate away & back
    await page.goto("/intern/schedule");
    await page.waitForLoadState("domcontentloaded");
    await page.goto("/intern/daily-log");
    await page.waitForLoadState("domcontentloaded");

    // Expect draft restored banner and restored notes
    await expect(page.locator("text=অফলাইন ড্রাফট রিস্টোর করা হয়েছে")).toBeVisible();
    expect(await page.inputValue("#intern-notes-input")).toBe(internNoteText);

    // Submit
    await page.click("#intern-submit-log-btn");

    // Verify trigger sync status message
    const internStatusBanner = page.locator("#intern-log-status-banner");
    await expect(internStatusBanner).toBeVisible({ timeout: 10000 });
    await expect(internStatusBanner).toContainText("টাস্ক বোর্ডে র-ফুটেজ স্ট্যাটাস সিঙ্ক হয়েছে");

    await verifyZeroHorizontalOverflow();

    // ========================================================================
    // 4. ADMIN VERIFIES TASK BOARD SHOWS RAW UPLOADED BADGE
    // ========================================================================
    await page.goto("/api/auth/signout");
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // Visit Task Board
    await page.goto("/admin/tasks");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#task-board-search-input", { timeout: 10000 });

    // Task 1 card must show Raw Uploaded badge
    const taskCard = page.locator("#task-card-t1000000-0000-0000-0000-000000000001");
    await expect(taskCard).toBeVisible();
    await expect(taskCard).toContainText("Raw Uploaded");

    await verifyZeroHorizontalOverflow();

    // ========================================================================
    // 5. ADMIN VERIFIES /admin/reports & TRIGGERS UTF-8 BOM CSV EXPORT
    // ========================================================================
    await page.goto("/admin/reports");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#report-kpi-cards", { timeout: 10000 });

    // Verify top 3 KPI cards
    await expect(page.locator("#kpi-completed-projects")).toBeVisible();
    await expect(page.locator("#kpi-total-hours")).toBeVisible();
    await expect(page.locator("#kpi-on-time-deadlines")).toBeVisible();

    // Verify numeric values exist
    const completedProjectsText = await page
      .locator("#kpi-completed-projects")
      .innerText();
    expect(Number(completedProjectsText)).toBeGreaterThanOrEqual(3);

    const totalHoursText = await page.locator("#kpi-total-hours").innerText();
    expect(totalHoursText).toContain("hrs");

    const deadlineText = await page.locator("#kpi-on-time-deadlines").innerText();
    expect(deadlineText).toContain("%");

    // Verify Team Performance Report Table
    const teamTable = page.locator("#team-performance-table");
    await expect(teamTable).toBeVisible();
    await expect(teamTable).toContainText("Arif Rahman");
    await expect(teamTable).toContainText("Hasan Ali");
    await expect(teamTable).toContainText("Nabil Hossain");

    // Test Period Filter change
    await page.selectOption("#report-period-filter", "monthly");
    await page.waitForTimeout(500);

    // Trigger CSV Export
    const downloadPromise = page.waitForEvent("download");
    await page.click("#report-export-csv-btn");
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("assdi-media-report");

    await verifyZeroHorizontalOverflow();

    // ========================================================================
    // 6. ADMIN VISITS /admin/logs (SERVER-SIDE PAGINATED VIEW)
    // ========================================================================
    await page.goto("/admin/logs");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#admin-daily-logs-table", { timeout: 10000 });

    const logsTable = page.locator("#admin-daily-logs-table");
    await expect(logsTable).toBeVisible();
    await expect(logsTable).toContainText("Arif Rahman");
    await expect(logsTable).toContainText("Hasan Ali");

    // Filter by role: intern
    await page.selectOption("#admin-log-role-filter", "intern");
    await page.waitForTimeout(500);
    await expect(logsTable).toContainText("INTERN");

    await verifyZeroHorizontalOverflow();

    // Verify zero console errors & zero failed network requests
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
