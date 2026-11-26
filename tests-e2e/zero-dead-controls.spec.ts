import { test, expect } from "@playwright/test";

test.describe("Zero Dead Controls & Role-Scoped Search Audit", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("verifies Topbar Search input, dropdown, filtering, and Escape key", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");

    // 1. Sign in as Admin
    await page.goto("/login");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    if (!isMobile) {
      // 2. Desktop Topbar Search verification
      const searchInput = page.locator("#topbar-search-input");
      await expect(searchInput).toBeVisible();

      // Type "Sony" (Search gear)
      await searchInput.fill("Sony");
      const dropdown = page.locator("#topbar-search-dropdown");
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      await expect(dropdown.getByText("GEAR", { exact: false }).first()).toBeVisible();

      // Test Escape key closes the dropdown
      await page.keyboard.press("Escape");
      await expect(dropdown).not.toBeVisible();

      // Re-focus and search "Tariqul" (User search)
      await searchInput.fill("Tariqul");
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      await expect(dropdown.getByText("USER", { exact: false }).first()).toBeVisible();

      // Clear search button
      const clearBtn = page.locator("#topbar-search-clear-btn");
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await expect(searchInput).toHaveValue("");
      await expect(dropdown).not.toBeVisible();

      // Search and click result to navigate
      await searchInput.fill("Sony");
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      const firstResult = dropdown.locator("button").first();
      await firstResult.click();
      await page.waitForURL("**/admin/gear**", { timeout: 10000 });
      expect(page.url()).toContain("/admin/gear");
    }
  });

  test("audits interactive controls and navigation on Admin Dashboard", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");

    // Sign in as Admin
    await page.goto("/login");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    // 1. Check Review Queue CTA link
    const reviewQueueBtn = page.locator("#dashboard-nav-requisitions-btn");
    await expect(reviewQueueBtn).toBeVisible();
    await reviewQueueBtn.click();
    await page.waitForURL("**/admin/requisitions", { timeout: 10000 });
    expect(page.url()).toContain("/admin/requisitions");

    // Return to dashboard
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // 2. Check Calendar link
    const calendarLink = page.locator("#dashboard-view-full-calendar-link");
    if (await calendarLink.isVisible()) {
      await calendarLink.click();
      await page.waitForURL("**/admin/calendar", { timeout: 10000 });
      expect(page.url()).toContain("/admin/calendar");
    }

    // Return to dashboard
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // 3. Check Gear Status KPI Card
    const gearKpiCard = page.locator("#kpi-card-gear-status");
    await expect(gearKpiCard).toBeVisible();
    await gearKpiCard.click();
    await page.waitForURL("**/admin/gear", { timeout: 10000 });
    expect(page.url()).toContain("/admin/gear");

    if (!isMobile) {
      // 4. Test Topbar Profile Menu Dropdown & Sign Out
      await page.goto("/admin/dashboard");
      const profileTrigger = page.locator("#topbar-profile-trigger");
      await expect(profileTrigger).toBeVisible();
      await profileTrigger.click();

      const profileMenu = page.locator("#topbar-profile-menu");
      await expect(profileMenu).toBeVisible();
      await expect(profileMenu.getByText("Engr. Mahmudul Hasan")).toBeVisible();
      await expect(profileMenu.getByText("admin@assdi.org")).toBeVisible();

      // Sign out
      const signOutBtn = page.locator("#topbar-profile-signout-btn");
      await expect(signOutBtn).toBeVisible();
      await signOutBtn.click();
      await page.waitForURL("**/login", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("verifies Coordinator role-scoped search and filter tabs", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");

    // Sign in as Coordinator
    await page.goto("/login");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    if (!isMobile) {
      // Test search: should ONLY return course requests, NEVER gear or other users
      const searchInput = page.locator("#topbar-search-input");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("Sony");
      // Search for gear item "Sony" should yield 0 results for coordinator
      const dropdown = page.locator("#topbar-search-dropdown");
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      await expect(dropdown.getByText("GEAR", { exact: false })).toHaveCount(0);
    }

    // Verify filter tabs work without crashing
    const filterApproved = page.locator("#filter-approved");
    if (await filterApproved.isVisible()) {
      await filterApproved.click();
      await expect(filterApproved).toBeVisible();
    }
  });

  test("verifies Staff and Intern role controls and sign out", async ({
    page,
    context,
  }) => {
    // 1. Staff check
    await page.goto("/login");
    await page.fill("#login-email", "staff@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/staff/tasks", { timeout: 10000 });
    expect(page.url()).toContain("/staff/tasks");

    // Clear session to test Intern login
    await context.clearCookies();

    // 2. Intern check
    await page.goto("/login");
    await page.fill("#login-email", "intern@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/intern/daily-log", { timeout: 10000 });

    // Navigate to profile
    await page.goto("/intern/profile");
    const internSignOut = page.locator("#intern-signout-btn");
    await expect(internSignOut).toBeVisible();
    await internSignOut.click();
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
