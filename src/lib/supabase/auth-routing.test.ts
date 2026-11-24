import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  getRoleHomeRoute,
  isPathAllowedForRole,
  ROLE_LABELS,
  type UserRole,
} from "@/lib/types/auth";
import { updateSession } from "@/lib/supabase/middleware";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";

describe("S3-01: Supabase Auth & Role-Guard Middleware Routing", () => {
  describe("Role Route Mapping & Helper Contracts", () => {
    it("maps each role to its exact designated home route", () => {
      expect(getRoleHomeRoute("admin")).toBe("/admin/dashboard");
      expect(getRoleHomeRoute("coordinator")).toBe("/coordinator/requests");
      expect(getRoleHomeRoute("staff")).toBe("/staff/tasks");
      expect(getRoleHomeRoute("intern")).toBe("/intern/daily-log");
      expect(getRoleHomeRoute(null)).toBe("/login");
      expect(getRoleHomeRoute(undefined)).toBe("/login");
      expect(getRoleHomeRoute("unknown" as unknown as UserRole)).toBe("/login");
    });

    it("verifies Bengali and English labels exist for all 4 roles", () => {
      const roles = ["admin", "coordinator", "staff", "intern"] as const;
      for (const role of roles) {
        expect(ROLE_LABELS[role]).toBeDefined();
        expect(ROLE_LABELS[role].en.length).toBeGreaterThan(0);
        expect(ROLE_LABELS[role].bn.length).toBeGreaterThan(0);
      }
    });

    it("verifies path authorization matrix across all roles", () => {
      // Admin has universal access
      expect(isPathAllowedForRole("admin", "/admin/dashboard")).toBe(true);
      expect(isPathAllowedForRole("admin", "/admin/users")).toBe(true);
      expect(isPathAllowedForRole("admin", "/coordinator/requests")).toBe(true);
      expect(isPathAllowedForRole("admin", "/staff/tasks")).toBe(true);
      expect(isPathAllowedForRole("admin", "/intern/daily-log")).toBe(true);

      // Coordinator is restricted to /coordinator/*
      expect(isPathAllowedForRole("coordinator", "/coordinator/requests")).toBe(true);
      expect(isPathAllowedForRole("coordinator", "/coordinator/new")).toBe(true);
      expect(isPathAllowedForRole("coordinator", "/admin/dashboard")).toBe(false);
      expect(isPathAllowedForRole("coordinator", "/admin/users")).toBe(false);
      expect(isPathAllowedForRole("coordinator", "/staff/tasks")).toBe(false);
      expect(isPathAllowedForRole("coordinator", "/intern/daily-log")).toBe(false);

      // Staff is restricted to /staff/*
      expect(isPathAllowedForRole("staff", "/staff/tasks")).toBe(true);
      expect(isPathAllowedForRole("staff", "/staff/daily-log")).toBe(true);
      expect(isPathAllowedForRole("staff", "/admin/dashboard")).toBe(false);
      expect(isPathAllowedForRole("staff", "/coordinator/requests")).toBe(false);
      expect(isPathAllowedForRole("staff", "/intern/daily-log")).toBe(false);

      // Intern is restricted to /intern/*
      expect(isPathAllowedForRole("intern", "/intern/daily-log")).toBe(true);
      expect(isPathAllowedForRole("intern", "/intern/schedule")).toBe(true);
      expect(isPathAllowedForRole("intern", "/admin/dashboard")).toBe(false);
      expect(isPathAllowedForRole("intern", "/coordinator/requests")).toBe(false);
      expect(isPathAllowedForRole("intern", "/staff/tasks")).toBe(false);
    });
  });

  describe("Middleware Role-Guard & Redirection Logic", () => {
    const makeRequest = (urlPath: string, userSession?: unknown) => {
      const headers = new Headers();
      if (userSession) {
        headers.set(
          "cookie",
          `${SESSION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(userSession))}`
        );
      }
      return new NextRequest(new URL(urlPath, "http://localhost:3000"), {
        headers,
      });
    };

    it("redirects unauthenticated user accessing protected /admin/dashboard to /login?next=...", async () => {
      const req = makeRequest("/admin/dashboard");
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Fadmin%2Fdashboard");
    });

    it("redirects unauthenticated user accessing /coordinator/requests to /login?next=...", async () => {
      const req = makeRequest("/coordinator/requests");
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Fcoordinator%2Frequests");
    });

    it("redirects unauthenticated user accessing / to /login", async () => {
      const req = makeRequest("/");
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
    });

    it("allows unauthenticated user to access /login without redirect", async () => {
      const req = makeRequest("/login");
      const res = await updateSession(req);

      // Status should be 200 (pass-through)
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows public /api/health to pass through without redirect", async () => {
      const req = makeRequest("/api/health");
      const res = await updateSession(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects authenticated admin visiting /login to /admin/dashboard", async () => {
      const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
      const req = makeRequest("/login", adminUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/admin/dashboard");
    });

    it("redirects authenticated coordinator visiting /login to /coordinator/requests", async () => {
      const coordUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);
      const req = makeRequest("/login", coordUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/coordinator/requests");
    });

    it("redirects authenticated staff visiting /login to /staff/tasks", async () => {
      const staffUser = toUserProfile(DEMO_USERS["staff@assdi.org"]);
      const req = makeRequest("/login", staffUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/staff/tasks");
    });

    it("redirects authenticated intern visiting /login to /intern/daily-log", async () => {
      const internUser = toUserProfile(DEMO_USERS["intern@assdi.org"]);
      const req = makeRequest("/login", internUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/intern/daily-log");
    });

    it("strictly blocks coordinator from accessing /admin/users and redirects to /coordinator/requests", async () => {
      const coordUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);
      const req = makeRequest("/admin/users", coordUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/coordinator/requests");
    });

    it("strictly blocks staff from accessing /admin/dashboard and redirects to /staff/tasks", async () => {
      const staffUser = toUserProfile(DEMO_USERS["staff@assdi.org"]);
      const req = makeRequest("/admin/dashboard", staffUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/staff/tasks");
    });

    it("strictly blocks intern from accessing /coordinator/requests and redirects to /intern/daily-log", async () => {
      const internUser = toUserProfile(DEMO_USERS["intern@assdi.org"]);
      const req = makeRequest("/coordinator/requests", internUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/intern/daily-log");
    });

    it("redirects deactivated user to /login?error=deactivated and clears session", async () => {
      const deactivatedUser = toUserProfile(DEMO_USERS["deactivated@assdi.org"]);
      const req = makeRequest("/staff/tasks", deactivatedUser);
      const res = await updateSession(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("error=deactivated");
    });
  });
});
