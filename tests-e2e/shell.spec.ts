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
});
