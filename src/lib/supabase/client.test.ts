import { describe, it, expect } from "vitest";
import { createClient } from "./client";

describe("Supabase Browser Client", () => {
  it("initializes without throwing an error", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
    expect(typeof client.auth.getUser).toBe("function");
  });
});
