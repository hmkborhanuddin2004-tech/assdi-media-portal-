import { test, expect } from "@playwright/test";

test.describe("API Health Route", () => {
  test("GET /api/health returns HTTP 200 and connected status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      status: "healthy",
      supabase: "connected",
    });
  });
});
