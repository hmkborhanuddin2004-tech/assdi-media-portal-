import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as handleSearch } from "@/app/api/search/route";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";
import { createSignedSessionToken } from "@/lib/auth/session-token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

describe("Search API Endpoint (GET /api/search)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/search?q=camera");
    const res = await handleSearch(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns empty array for empty search query", async () => {
    const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
    const token = await createSignedSessionToken(adminUser);

    const req = new NextRequest("http://localhost:3000/api/search?q=", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const res = await handleSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });

  it("allows Admin to search across Gear, Users, Requisitions and Courses", async () => {
    const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
    const token = await createSignedSessionToken(adminUser);

    // Search for "Sony" (Gear)
    const reqGear = new NextRequest("http://localhost:3000/api/search?q=sony", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const resGear = await handleSearch(reqGear);
    expect(resGear.status).toBe(200);
    const bodyGear = await resGear.json();
    expect(bodyGear.success).toBe(true);
    expect(bodyGear.results.some((r: { category: string }) => r.category === "Gear")).toBe(true);

    // Search for "Tariqul" (User)
    const reqUser = new NextRequest("http://localhost:3000/api/search?q=tariqul", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const resUser = await handleSearch(reqUser);
    expect(resUser.status).toBe(200);
    const bodyUser = await resUser.json();
    expect(bodyUser.success).toBe(true);
    expect(bodyUser.results.some((r: { category: string }) => r.category === "User")).toBe(true);
  });

  it("restricts Coordinator to only their course requisitions", async () => {
    const coordinatorUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);
    const token = await createSignedSessionToken(coordinatorUser);

    // Searching gear should return 0 gear results for coordinator
    const req = new NextRequest("http://localhost:3000/api/search?q=sony", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const res = await handleSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Should not contain any Gear or Users
    expect(body.results.some((r: { category: string }) => r.category === "Gear")).toBe(false);
    expect(body.results.some((r: { category: string }) => r.category === "User")).toBe(false);
  });

  it("restricts Staff to assigned tasks and daily logs", async () => {
    const staffUser = toUserProfile(DEMO_USERS["staff@assdi.org"]);
    const token = await createSignedSessionToken(staffUser);

    const req = new NextRequest("http://localhost:3000/api/search?q=shoot", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const res = await handleSearch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Should only have Task or Daily Log categories
    for (const item of body.results) {
      expect(["Task", "Daily Log"]).toContain(item.category);
    }
  });
});
