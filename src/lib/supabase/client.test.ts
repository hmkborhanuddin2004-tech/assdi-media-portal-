import { describe, it, expect } from "vitest";
import { createClient } from "./client";

describe("Supabase Browser Client", () => {
  it("initializes without throwing an error", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
    expect(typeof client.auth.getUser).toBe("function");
  });
});
