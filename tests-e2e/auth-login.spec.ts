import { test, expect } from "@playwright/test";

test.describe("S3-01 & S3-02: Auth, Role-Guard Middleware & User Management E2E", () => {
  test("unauthenticated access to protected routes redirects to /login", async ({ page }) => {
    // 1. Check Admin route
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fadmin%2Fdashboard");

    // 2. Check Coordinator route
    await page.goto("/coordinator/requests");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fcoordinator%2Frequests");

    // 3. Check Staff route
    await page.goto("/staff/tasks");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");

    // 4. Check Intern route
    await page.goto("/intern/daily-log");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/login");
  });

  test("login page renders cleanly with 0 console errors, 0 failed requests, and 0 horizontal overflow", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (request) => {
      if (!request.url().includes("favicon.ico")) {
        failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);

    // Verify 0 horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify Brand title is visible
    await expect(page.getByText("আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট")).toBeVisible();
    await expect(page.getByText("সেন্ট্রাল মিডিয়া ম্যানেজমেন্ট পোর্টাল")).toBeVisible();

    // Verify public self-signup is disabled notice
    await expect(page.getByText("Admin-managed accounts only. Public sign-up is disabled.")).toBeVisible();
  });

  test("login flow: admin logs in and redirects to /admin/dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // Fill admin credentials
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    // Expect navigation to /admin/dashboard
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/admin/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("login flow: coordinator logs in and redirects to /coordinator/requests", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    expect(page.url()).toContain("/coordinator/requests");
    await expect(page.locator("h1")).toContainText("My Requests");
  });

  test("login flow: staff logs in and redirects to /staff/tasks", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "staff@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/staff/tasks", { timeout: 10000 });
    expect(page.url()).toContain("/staff/tasks");
    await expect(page.locator("h1")).toContainText("My Tasks");
  });

  test("login flow: intern logs in and redirects to /intern/daily-log", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "intern@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/intern/daily-log", { timeout: 10000 });
    expect(page.url()).toContain("/intern/daily-log");
    await expect(page.locator("h1")).toContainText("Daily Log");
  });

  test("admin user management: admin accesses /admin/users, creates coordinator, and newly created user logs in", async ({
    page,
  }) => {
    // 1. Log in as admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 2. Navigate to /admin/users
    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText("Users");

    // 3. Open Add User Modal
    await page.click("#admin-add-user-btn");
    await expect(page.getByText("নতুন ব্যবহারকারী তৈরি করুন")).toBeVisible();

    const uniqueId = Date.now().toString().slice(-4);
    const newCoordEmail = `coord_${uniqueId}@assdi.org`;
    const newPassword = "Password123!";

    await page.fill('input[placeholder="যেমন: ইঞ্জিনিয়ার মাহমুদুর রহমান"]', `Coord Test ${uniqueId}`);
    await page.fill('input[placeholder="user@assdi.org"]', newCoordEmail);
    await page.fill('input[placeholder="017XXXXXXXX"]', "01712345678");
    await page.fill('input[placeholder="••••••••"]', newPassword);

    // Explicitly select first available course
    await page.selectOption("#admin-course-select", { index: 1 });

    // Submit form
    await page.click("#submit-create-user-btn");
    await expect(page.getByText("ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে!")).toBeVisible();

    // Verify newly created user appears in table or cards (filter by visible element)
    await expect(page.getByText(`Coord Test ${uniqueId}`).filter({ visible: true })).toBeVisible({ timeout: 5000 });

    // 4. Log out
    await page.goto("/api/auth/signout");
    await page.waitForURL("**/login", { timeout: 10000 });

    // 5. Log in with the newly created user credentials
    await page.fill("#login-email", newCoordEmail);
    await page.fill("#login-password", newPassword);
    await page.click("#login-submit-button");

    // 6. Must successfully redirect to /coordinator/requests
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    expect(page.url()).toContain("/coordinator/requests");
    await expect(page.locator("h1")).toContainText("My Requests");
  });

  test("open redirect vulnerability check: protocol-relative //evil.com is blocked", async ({ page }) => {
    // Attempt /login?next=//malicious-phishing.com
    await page.goto("/login?next=//malicious-phishing.com");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    // Must safely redirect to /admin/dashboard, NEVER to malicious-phishing.com
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });
    expect(page.url()).not.toContain("malicious-phishing.com");
    expect(page.url()).toContain("/admin/dashboard");
  });

  test("mobile viewport (390px) renders responsive 1-column user cards with 0 horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Log in as admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText("Users");

    // Check 0 horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify user card elements are present on mobile
    await expect(page.getByText("Engr. Mahmudul Hasan").filter({ visible: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Muhammad Abdullah").filter({ visible: true })).toBeVisible({ timeout: 10000 });
  });
});
