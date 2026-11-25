import { test, expect } from "@playwright/test";

test.describe("S1-01 Responsive Application Shell & Design Tokens", () => {
  test("renders without console errors, failed requests, or horizontal overflow", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    // Gate requirement: 0 console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Gate requirement: 0 failed requests
    page.on("requestfailed", (request) => {
      // Exclude intentional aborts or favicon
      if (!request.url().includes("favicon.ico")) {
        failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check console errors
    expect(consoleErrors).toEqual([]);
    // Check failed requests
    expect(failedRequests).toEqual([]);

    // Gate requirement: 0 horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return docWidth > winWidth || bodyWidth > winWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Viewport-specific assertions
    const isMobile = testInfo.project.name.includes("Mobile");

    if (isMobile) {
      // Mobile header and bottom navigation must be visible
      const mobileHeader = page.locator("#mobile-header");
      await expect(mobileHeader).toBeVisible();

      const mobileBottomNav = page.locator("#mobile-bottom-nav");
      await expect(mobileBottomNav).toBeVisible();

      // Desktop sidebar must be hidden
      const desktopSidebar = page.locator("#desktop-sidebar");
      await expect(desktopSidebar).toBeHidden();
    } else {
      // Desktop sidebar must be visible
      const desktopSidebar = page.locator("#desktop-sidebar");
      await expect(desktopSidebar).toBeVisible();

      // Mobile bottom nav must be hidden
      const mobileBottomNav = page.locator("#mobile-bottom-nav");
      await expect(mobileBottomNav).toBeHidden();
    }

    // Verify Brand title is rendered
    await expect(page.getByText("আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট")).toBeVisible();
  });

  test("notification bell is removed and top-right profile dropdown opens, closes on Escape/outside click, and signs out cleanly", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    // Sign in as Coordinator to verify full profile details including assigned course
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", "coordinator@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/coordinator/requests", { timeout: 10000 });

    // Confirm dead Notification Bell and hardcoded '3' badge are completely gone
    await expect(page.locator('button[aria-label="Notifications"]')).toHaveCount(0);

    if (isMobile) {
      // Mobile: verify drawer opens, backdrop click closes, and signout redirects cleanly to /login
      await page.click('#mobile-header button[aria-label="Toggle menu"]');
      await expect(page.getByText("সকল মেনু (All Sections)")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByText("সকল মেনু (All Sections)")).toHaveCount(0);

      await page.click('#mobile-header button[aria-label="লগআউট"]');
      await page.waitForURL("**/login", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    } else {
      const trigger = page.locator("#topbar-profile-trigger");
      const menu = page.locator("#topbar-profile-menu");

      await expect(trigger).toBeVisible();
      await expect(menu).toHaveCount(0);

      // 1. Open dropdown
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(menu).toContainText("Muhammad Abdullah");
      await expect(menu).toContainText("coordinator@assdi.org");
      await expect(menu).toContainText("Course Coordinator");
      await expect(menu).toContainText("Refrigeration & Air Conditioning (RAC)");
      await expect(page.locator("#topbar-profile-home-link")).toBeVisible();
      await expect(page.locator("#topbar-profile-signout-btn")).toBeVisible();

      // 2. Close with Escape key
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);

      // 3. Re-open and close on outside click
      await trigger.click();
      await expect(menu).toBeVisible();
      await page.locator("#main-content header > div").first().click();
      await expect(menu).toHaveCount(0);

      // 4. Re-open and click Sign Out
      await trigger.click();
      await expect(menu).toBeVisible();
      await page.click("#topbar-profile-signout-btn");
      await page.waitForURL("**/login", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    }

    const meRes = await page.request.get("/api/auth/me");
    const meData = await meRes.json();
    expect(meData.authenticated).toBe(false);
    expect(consoleErrors).toEqual([]);
  });

  test("desktop sidebar collapses to 76px icon rail and expands to 224px with localStorage persistence", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    if (isMobile) return;

    await page.goto("/login");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });

    const sidebar = page.locator("#desktop-sidebar");
    const toggle = page.locator("#sidebar-collapse-toggle");
    await expect(sidebar).toBeVisible();
    await expect(toggle).toBeVisible();

    // Check initial expanded width (~224px)
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(Math.round(initialBox!.width)).toBe(224);

    // Toggle collapse
    await toggle.click();
    await page.waitForTimeout(500); // Wait for spring physics

    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox).not.toBeNull();
    expect(Math.round(collapsedBox!.width)).toBe(76);

    // Verify localStorage persistence
    const savedState = await page.evaluate(() => localStorage.getItem("assdi_sidebar_collapsed"));
    expect(savedState).toBe("true");

    // Toggle expand back
    await toggle.click();
    await page.waitForTimeout(500); // Wait for spring physics

    const expandedBox = await sidebar.boundingBox();
    expect(expandedBox).not.toBeNull();
    expect(Math.round(expandedBox!.width)).toBe(224);

    const savedState2 = await page.evaluate(() => localStorage.getItem("assdi_sidebar_collapsed"));
    expect(savedState2).toBe("false");
  });

  test("sequential navigation keeps sidebar DOM node mounted with zero layout shift and zero console errors", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && !text.includes("favicon")) {
        consoleErrors.push(text);
      }
    });

    await page.goto("/login");
    await page.fill("#login-email", "admin@assdi.org");
    await page.fill("#login-password", "assdi123");
    await page.click("#login-submit-button");
    await page.waitForURL("**/admin/dashboard", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const routes = [
      "/admin/requisitions",
      "/admin/calendar",
      "/admin/tasks",
      "/admin/gear",
      "/admin/reports",
      "/admin/users",
    ];

    if (!isMobile) {
      // Confirm scrollbar-gutter: stable is active on html
      const gutter = await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollbarGutter
      );
      expect(gutter).toContain("stable");

      // Record exact DOM node identity and initial sidebar position/size
      await page.evaluate(() => {
        (window as unknown as { __assdiSidebarRef: Element | null }).__assdiSidebarRef =
          document.getElementById("desktop-sidebar");
      });
      const initialBox = await page.locator("#desktop-sidebar").boundingBox();
      expect(initialBox).not.toBeNull();

      for (const route of routes) {
        const navLink = page.locator(`#desktop-sidebar a[href="${route}"]`);
        await expect(navLink).toBeVisible();
        await navLink.click();
        await page.waitForURL(`**${route}`, { timeout: 10000 });
        await page.waitForTimeout(250);

        // 1. Assert exact same sidebar DOM node remains mounted (zero remount)
        const sameNode = await page.evaluate(
          () =>
            document.getElementById("desktop-sidebar") ===
            (window as unknown as { __assdiSidebarRef: Element | null }).__assdiSidebarRef
        );
        expect(sameNode).toBe(true);

        // 2. Assert zero horizontal layout shift on the sidebar bounding box
        const currentBox = await page.locator("#desktop-sidebar").boundingBox();
        expect(currentBox).not.toBeNull();
        expect(Math.abs(currentBox!.x - initialBox!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(currentBox!.width - initialBox!.width)).toBeLessThanOrEqual(1);

        // 3. Assert 0 horizontal overflow
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow).toBe(false);
      }
    } else {
      // Mobile: verify persistent #mobile-bottom-nav DOM node across core mobile tabs
      await page.evaluate(() => {
        (window as unknown as { __assdiMobileNavRef: Element | null }).__assdiMobileNavRef =
          document.getElementById("mobile-bottom-nav");
      });

      for (const route of ["/admin/requisitions", "/admin/calendar", "/admin/tasks"]) {
        await page.locator(`#mobile-bottom-nav a[href="${route}"]`).click();
        await page.waitForURL(`**${route}`, { timeout: 10000 });
        await page.waitForTimeout(250);

        const sameMobileNav = await page.evaluate(
          () =>
            document.getElementById("mobile-bottom-nav") ===
            (window as unknown as { __assdiMobileNavRef: Element | null }).__assdiMobileNavRef
        );
        expect(sameMobileNav).toBe(true);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow).toBe(false);
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
