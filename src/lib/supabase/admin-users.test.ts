import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { NextRequest } from "next/server";
import { createUserSchema } from "@/lib/validations/user-management";
import type { UserRole } from "@/lib/types/auth";
import { GET as getUsers, POST as createUser, PATCH as updateUserStatus } from "@/app/api/admin/users/route";
import { POST as authLogin } from "@/app/api/auth/login/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { DEMO_USERS, toUserProfile, resetDynamicUsersForTesting } from "@/lib/auth/demo-users";

describe("S3-02: Admin User Management & Service-Role Security", () => {
  describe("Zod Validation & Database Constraint Alignment", () => {
    const validCourseId = "c1000000-0000-0000-0000-000000000001";

    it("allows valid admin creation without course_id", () => {
      const result = createUserSchema.safeParse({
        email: "newadmin@assdi.org",
        password: "securePassword123",
        full_name: "Admin User",
        phone: "01712345678",
        role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("allows valid staff creation without course_id", () => {
      const result = createUserSchema.safeParse({
        email: "staff@assdi.org",
        password: "securePassword123",
        full_name: "Staff Member",
        phone: "+8801812345678",
        role: "staff",
      });
      expect(result.success).toBe(true);
    });

    it("allows valid intern creation without course_id", () => {
      const result = createUserSchema.safeParse({
        email: "intern@assdi.org",
        password: "securePassword123",
        full_name: "Intern Trainee",
        phone: "01912345678",
        role: "intern",
      });
      expect(result.success).toBe(true);
    });

    it("allows valid coordinator creation WITH course_id", () => {
      const result = createUserSchema.safeParse({
        email: "coord@assdi.org",
        password: "securePassword123",
        full_name: "Course Coordinator",
        phone: "01712345678",
        role: "coordinator",
        course_id: validCourseId,
      });
      expect(result.success).toBe(true);
    });

    it("strictly FAILS coordinator creation WITHOUT course_id (chk_coordinator_must_have_course)", () => {
      const result = createUserSchema.safeParse({
        email: "coord@assdi.org",
        password: "securePassword123",
        full_name: "Coordinator Without Course",
        phone: "01712345678",
        role: "coordinator",
        course_id: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPath = result.error.errors[0]?.path;
        expect(errorPath).toContain("course_id");
        expect(result.error.errors[0]?.message).toContain(
          "কোর্স কোঅর্ডিনেটরের জন্য অবশ্যই একটি নির্দিষ্ট কোর্স নির্বাচন করতে হবে"
        );
      }
    });

    it("fails when email is invalid format", () => {
      const result = createUserSchema.safeParse({
        email: "not-an-email",
        password: "securePassword123",
        full_name: "Test User",
        phone: "01712345678",
        role: "admin",
      });
      expect(result.success).toBe(false);
    });

    it("fails when password is less than 8 characters", () => {
      const result = createUserSchema.safeParse({
        email: "user@assdi.org",
        password: "12345",
        full_name: "Test User",
        phone: "01712345678",
        role: "admin",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("৮ অক্ষরের");
      }
    });

    it("fails when phone number is not a valid Bangladeshi mobile number", () => {
      const invalidPhones = ["12345", "02-998877", "+1234567890", "01123456789"];
      for (const phone of invalidPhones) {
        const result = createUserSchema.safeParse({
          email: "user@assdi.org",
          password: "securePassword123",
          full_name: "Test User",
          phone,
          role: "admin",
        });
        expect(result.success).toBe(false);
      }
    });

    it("fails when role is not in the allowed enum ('admin', 'coordinator', 'staff', 'intern')", () => {
      const result = createUserSchema.safeParse({
        email: "user@assdi.org",
        password: "securePassword123",
        full_name: "Test User",
        phone: "01712345678",
        role: "superadmin" as unknown as UserRole,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Security Architecture & Secret Leak Prevention", () => {
    it("ensures src/lib/supabase/admin.ts contains 'import \"server-only\"'", () => {
      const adminFilePath = path.resolve(process.cwd(), "src/lib/supabase/admin.ts");
      expect(fs.existsSync(adminFilePath)).toBe(true);
      const content = fs.readFileSync(adminFilePath, "utf-8");
      expect(content).toContain('import "server-only"');
      expect(content).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    });

    it("verifies SUPABASE_SERVICE_ROLE_KEY is never prefixed with NEXT_PUBLIC_ in production code", () => {
      const forbiddenKey = ["NEXT", "PUBLIC", "SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
      const forbiddenShort = ["NEXT", "PUBLIC", "SERVICE", "ROLE"].join("_");

      const searchForLeak = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            searchForLeak(fullPath);
          } else if (
            entry.isFile() &&
            (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
            !entry.name.includes(".test.") &&
            !entry.name.includes(".spec.")
          ) {
            const fileContent = fs.readFileSync(fullPath, "utf-8");
            expect(fileContent).not.toContain(forbiddenKey);
            expect(fileContent).not.toContain(forbiddenShort);
          }
        }
      };
      searchForLeak(path.resolve(process.cwd(), "src"));
    });

    it("verifies public self-signup is disabled and no /signup route exists", () => {
      const signupRoutePath = path.resolve(process.cwd(), "src/app/signup");
      expect(fs.existsSync(signupRoutePath)).toBe(false);

      const loginPagePath = path.resolve(process.cwd(), "src/app/login/page.tsx");
      const loginContent = fs.readFileSync(loginPagePath, "utf-8");
      // Must not contain a link to create an account
      expect(loginContent).not.toContain('href="/signup"');
      expect(loginContent).not.toContain('href="/register"');
      expect(loginContent).toContain("Public sign-up is disabled.");
    });
  });

  describe("Admin Users API Handlers (/api/admin/users) & End-to-End Fallback Auth", () => {
    beforeEach(() => {
      resetDynamicUsersForTesting();
    });

    const createAdminReq = (body?: unknown, method = "POST") => {
      const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
      const headers = new Headers();
      headers.set(
        "cookie",
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(adminUser))}`
      );
      if (body) {
        headers.set("content-type", "application/json");
      }
      return new NextRequest(new URL("http://localhost:3000/api/admin/users"), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    it("GET /api/admin/users returns list of users and courses when called by admin", async () => {
      const req = createAdminReq(undefined, "GET");
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.users)).toBe(true);
      expect(json.users.length).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(json.courses)).toBe(true);
    });

    it("POST /api/admin/users creates new coordinator and verifies they can immediately log in", async () => {
      const newEmail = "auto_coordinator@assdi.org";
      const newPass = "StrongPassword123";

      const createReq = createAdminReq({
        email: newEmail,
        password: newPass,
        full_name: "Auto Created Coordinator",
        phone: "01719998877",
        role: "coordinator",
        course_id: "c1000000-0000-0000-0000-000000000001",
      });

      const createRes = await createUser(createReq);
      expect(createRes.status).toBe(200);
      const createJson = await createRes.json();
      expect(createJson.success).toBe(true);
      expect(createJson.user.email).toBe(newEmail);

      // Now verify this user can immediately log in via /api/auth/login
      const loginReq = new NextRequest(new URL("http://localhost:3000/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPass }),
      });

      const loginRes = await authLogin(loginReq);
      expect(loginRes.status).toBe(200);
      const loginJson = await loginRes.json();
      expect(loginJson.success).toBe(true);
      expect(loginJson.role).toBe("coordinator");
      expect(loginJson.redirectTo).toBe("/coordinator/requests");
    });

    it("PATCH /api/admin/users prevents admin from deactivating their own account", async () => {
      const adminId = DEMO_USERS["admin@assdi.org"].id;
      const patchReq = createAdminReq({
        userId: adminId,
        isActive: false,
      }, "PATCH");

      const res = await updateUserStatus(patchReq);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("নিজস্ব অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়");
    });
  });
});
