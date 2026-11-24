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
    await expect(page.getByText("আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট")).toBeVisible();
    await expect(page.getByText("সেন্ট্রাল মিডিয়া ম্যানেজমেন্ট পোর্টাল")).toBeVisible();

    // Verify public self-signup is disabled notice
    await expect(page.getByText("নিরাপত্তা নীতি (Security Policy)")).toBeVisible();
    await expect(page.getByText("পাবলিক রেজিস্ট্রেশন সম্পূর্ণ নিষ্ক্রিয়")).toBeVisible();
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
    await expect(page.getByText("সেন্ট্রাল মিডিয়া অ্যাডমিনিস্ট্রেশন হাব")).toBeVisible();
  });

  test("login flow: coordinator logs in and redirects to /coordinator/requests", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });
    expect(page.url()).toContain("/coordinator/requests");
    await expect(page.getByText("কোর্স মিডিয়া রিকুইজিশন ট্র্যাকার")).toBeVisible();
  });

  test("login flow: staff logs in and redirects to /staff/tasks", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "staff@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/staff/tasks", { timeout: 10000 });
    expect(page.url()).toContain("/staff/tasks");
    await expect(page.getByText("নির্ধারিত শুটিং ও পোস্ট-প্রোডাকশন টাস্ক")).toBeVisible();
  });

  test("login flow: intern logs in and redirects to /intern/daily-log", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#login-email", "intern@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");

    await page.waitForURL("**/intern/daily-log", { timeout: 10000 });
    expect(page.url()).toContain("/intern/daily-log");
    await expect(page.getByText("দৈনিক কাজের লগ ও ফুটেজ স্ট্যাটাস")).toBeVisible();
  });

  test("admin user management: admin accesses /admin/users and creates user", async ({ page }) => {
    // Log in as admin
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // Navigate to /admin/users
    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা")).toBeVisible();

    // Verify zero public self-signup banner
    await expect(page.getByText("জিরো পাবলিক সেলফ-সাইনআপ নীতি")).toBeVisible();

    // Open Add User Modal
    await page.click("#admin-add-user-btn");
    await expect(page.getByText("নতুন ব্যবহারকারী তৈরি করুন")).toBeVisible();
  });
});
