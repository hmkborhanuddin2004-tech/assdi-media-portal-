import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

interface RouteConfig {
  path: string;
  name: string;
  role: "anon" | "admin" | "coordinator" | "staff" | "intern";
}

const ROUTES: RouteConfig[] = [
  { path: "/login", name: "login", role: "anon" },
  { path: "/admin/dashboard", name: "admin-dashboard", role: "admin" },
  { path: "/admin/requisitions", name: "admin-requisitions", role: "admin" },
  { path: "/admin/gear", name: "admin-gear", role: "admin" },
  { path: "/admin/tasks", name: "admin-tasks", role: "admin" },
  { path: "/admin/calendar", name: "admin-calendar", role: "admin" },
  { path: "/admin/logs", name: "admin-logs", role: "admin" },
  { path: "/admin/reports", name: "admin-reports", role: "admin" },
  { path: "/admin/users", name: "admin-users", role: "admin" },
  { path: "/coordinator/new", name: "coordinator-new", role: "coordinator" },
  { path: "/coordinator/requests", name: "coordinator-requests", role: "coordinator" },
  { path: "/staff/daily-log", name: "staff-daily-log", role: "staff" },
  { path: "/staff/tasks", name: "staff-tasks", role: "staff" },
  { path: "/intern/schedule", name: "intern-schedule", role: "intern" },
  { path: "/intern/daily-log", name: "intern-daily-log", role: "intern" },
];

const CREDENTIALS = {
  admin: { email: "admin@assdi.org", pass: "assdi123" },
  coordinator: { email: "coordinator@assdi.org", pass: "assdi123" },
  staff: { email: "staff@assdi.org", pass: "assdi123" },
  intern: { email: "intern@assdi.org", pass: "assdi123" },
};

async function captureForViewport(
  width: number,
  height: number,
  viewportName: "desktop" | "mobile"
) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const role of ["anon", "admin", "coordinator", "staff", "intern"] as const) {
    const roleRoutes = ROUTES.filter((r) => r.role === role);
    if (roleRoutes.length === 0) continue;

    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: viewportName === "mobile",
    });
    const page = await context.newPage();

    if (role !== "anon") {
      const creds = CREDENTIALS[role];
      await page.goto("http://127.0.0.1:3000/login");
      await page.waitForLoadState("domcontentloaded");
      await page.fill("#login-email", creds.email);
      await page.fill("#login-password", creds.pass);
      await page.click("#login-submit-button");
      await page.waitForLoadState("networkidle");
    }

    for (const route of roleRoutes) {
      console.log(`[${viewportName}] Capturing ${route.path}...`);
      await page.goto(`http://127.0.0.1:3000${route.path}`);
      await page.waitForLoadState("networkidle");
      // Give React query / DOM 500ms to settle animations
      await page.waitForTimeout(500);

      const filePath = path.join(
        SCREENSHOT_DIR,
        `${viewportName}-${route.name}.png`
      );
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved: ${filePath}`);
    }

    await context.close();
  }

  await browser.close();
}

async function main() {
  console.log("=== Capturing Desktop (1280x800) Screenshots ===");
  await captureForViewport(1280, 800, "desktop");

  console.log("=== Capturing Mobile (390x844) Screenshots ===");
  await captureForViewport(390, 844, "mobile");

  console.log("All screenshots captured successfully in docs/screenshots/!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
