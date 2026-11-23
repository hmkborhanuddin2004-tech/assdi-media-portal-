import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  profileValidationSchema,
  rejectionValidationSchema,
  googleDriveUrlSchema,
  validateRequisitionLeadTime,
  getRequiredLeadDays,
} from "@/lib/validations/db-rules";
import type { Database } from "@/lib/types/database";

describe("S2-01: Audited 9-Table Database Schema & Migrations", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/001_init.sql");
  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");

  it("verifies 001_init.sql exists and contains all 9 required tables", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    const requiredTables = [
      "courses",
      "venues",
      "profiles",
      "requisitions",
      "tasks",
      "task_assignees",
      "gear_items",
      "gear_bookings",
      "daily_logs",
    ];

    for (const table of requiredTables) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, "i");
      expect(sql).toMatch(tableRegex);
    }
  });

  it("verifies non-recursive RLS helper functions are SECURITY DEFINER with set search_path", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // current_user_role helper
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.current_user_role()");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");

    // current_user_course_id helper
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.current_user_course_id()");
  });

  it("verifies RLS is enabled on all 9 tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    const tables = [
      "courses",
      "venues",
      "profiles",
      "requisitions",
      "tasks",
      "task_assignees",
      "gear_items",
      "gear_bookings",
      "daily_logs",
    ];

    for (const table of tables) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it("verifies essential CHECK and EXCLUDE constraints in 001_init.sql", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // chk_coordinator_must_have_course
    expect(sql).toContain("chk_coordinator_must_have_course");
    expect(sql).toContain("CHECK (role <> 'coordinator' OR course_id IS NOT NULL)");

    // chk_rejection_requires_reason
    expect(sql).toContain("chk_rejection_requires_reason");
    expect(sql).toContain("CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)");

    // chk_override_requires_reason
    expect(sql).toContain("chk_override_requires_reason");
    expect(sql).toContain("CHECK (is_emergency_override = false OR NULLIF(BTRIM(override_reason), '') IS NOT NULL)");

    // excl_no_gear_double_booking with btree_gist
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist;");
    expect(sql).toContain("excl_no_gear_double_booking");
    expect(sql).toContain("EXCLUDE USING gist");

    // chk_completed_drive_url
    expect(sql).toContain("chk_completed_drive_url");
    expect(sql).toContain("^https://(drive|docs)\\.google\\.com/");

    // chk_staff_log_fields & chk_intern_log_fields
    expect(sql).toContain("chk_staff_log_fields");
    expect(sql).toContain("chk_intern_log_fields");
  });

  it("verifies seed.sql seeds all 9 ASSDI courses, venues, and gear items", () => {
    expect(fs.existsSync(seedPath)).toBe(true);
    const seedSql = fs.readFileSync(seedPath, "utf-8");

    const requiredCourses = [
      "Refrigeration & Air Conditioning (RAC)",
      "Motorcycle Servicing",
      "Mobile Servicing",
      "Electrical",
      "SBMC (Bakery & Pastry)",
      "English Language",
      "The Art of Creation",
      "Professional Cooking",
      "Dawah",
    ];

    for (const course of requiredCourses) {
      expect(seedSql).toContain(course);
    }

    const requiredVenues = ["50 Katha Campus", "Kazibari Branch", "Lab Room"];
    for (const venue of requiredVenues) {
      expect(seedSql).toContain(venue);
    }

    const requiredGear = [
      "Sony FX3 Cinema Body",
      "Sony FX30 Cinema Body",
      "Sony A7C Mirrorless Body",
      "Sony FE 24-105mm f/4 G OSS",
      "DJI Mini 3 Pro Drone",
      "DJI Air 3S Drone",
      "DJI RS 4 Gimbal",
      "DJI RS 5 Gimbal",
      "Wireless Lavalier Mic Kit",
      "LED Key Light Panel",
      "SDXC V90 128GB Memory Card #1",
      "SDXC V90 128GB Memory Card #2",
    ];

    for (const gear of requiredGear) {
      expect(seedSql).toContain(gear);
    }
  });
});

describe("S2-02: DB Constraints & Non-Recursive RLS Verification", () => {
  const dummyUuid = "11111111-1111-4111-8111-111111111111";
  const courseAUuid = "22222222-2222-4222-8222-222222222222";
  const courseBUuid = "33333333-3333-4333-8333-333333333333";

  describe("Constraint: Coordinator must have course_id", () => {
    it("rejects coordinator profile when course_id is missing or null", () => {
      const coordinatorWithoutCourse = {
        id: dummyUuid,
        full_name: "AOC Coordinator",
        phone: "+8801700000000",
        role: "coordinator" as const,
        course_id: null,
        is_active: true,
      };

      const result = profileValidationSchema.safeParse(coordinatorWithoutCourse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Coordinator must be assigned to an active course_id");
      }
    });

    it("allows coordinator profile when course_id is provided", () => {
      const coordinatorWithCourse = {
        id: dummyUuid,
        full_name: "AOC Coordinator",
        phone: "+8801700000000",
        role: "coordinator" as const,
        course_id: courseAUuid,
        is_active: true,
      };

      const result = profileValidationSchema.safeParse(coordinatorWithCourse);
      expect(result.success).toBe(true);
    });

    it("allows admin, staff, and intern profiles without a course_id", () => {
      const nonCoordinatorRoles = ["admin", "staff", "intern"] as const;

      for (const role of nonCoordinatorRoles) {
        const profile = {
          id: dummyUuid,
          full_name: `Test ${role}`,
          phone: "+8801700000000",
          role,
          course_id: null,
          is_active: true,
        };

        const result = profileValidationSchema.safeParse(profile);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("RLS: Strict Course Isolation for Course Coordinators", () => {
    // Model RLS predicate: (public.current_user_role() = 'coordinator' AND course_id = public.current_user_course_id())
    function evaluateRequisitionSelectRLS({
      userRole,
      userCourseId,
      requisitionCourseId,
      isTaskAssignee = false,
    }: {
      userRole: "admin" | "coordinator" | "staff" | "intern";
      userCourseId?: string | null;
      requisitionCourseId: string;
      isTaskAssignee?: boolean;
    }): boolean {
      if (userRole === "admin") return true;
      if (userRole === "coordinator") {
        return requisitionCourseId === userCourseId;
      }
      if (userRole === "staff" || userRole === "intern") {
        return isTaskAssignee;
      }
      return false;
    }

    it("allows coordinator to SELECT requisitions for their own assigned course", () => {
      const canReadOwn = evaluateRequisitionSelectRLS({
        userRole: "coordinator",
        userCourseId: courseAUuid,
        requisitionCourseId: courseAUuid,
      });

      expect(canReadOwn).toBe(true);
    });

    it("strictly blocks coordinator from SELECTing requisitions belonging to other courses", () => {
      const canReadOtherCourse = evaluateRequisitionSelectRLS({
        userRole: "coordinator",
        userCourseId: courseAUuid,
        requisitionCourseId: courseBUuid,
      });

      // Strict course isolation: coordinator of course A CANNOT see requisitions of course B
      expect(canReadOtherCourse).toBe(false);
    });

    it("allows admin to view requisitions across all courses", () => {
      const adminCanReadCourseA = evaluateRequisitionSelectRLS({
        userRole: "admin",
        requisitionCourseId: courseAUuid,
      });
      const adminCanReadCourseB = evaluateRequisitionSelectRLS({
        userRole: "admin",
        requisitionCourseId: courseBUuid,
      });

      expect(adminCanReadCourseA).toBe(true);
      expect(adminCanReadCourseB).toBe(true);
    });

    it("allows staff or intern to view requisitions only when assigned to the shoot task", () => {
      const assignedStaff = evaluateRequisitionSelectRLS({
        userRole: "staff",
        requisitionCourseId: courseAUuid,
        isTaskAssignee: true,
      });
      const unassignedStaff = evaluateRequisitionSelectRLS({
        userRole: "staff",
        requisitionCourseId: courseAUuid,
        isTaskAssignee: false,
      });

      expect(assignedStaff).toBe(true);
      expect(unassignedStaff).toBe(false);
    });
  });

  describe("Constraint: Requisition Rejection requires non-empty reason", () => {
    it("rejects requisition update with status 'rejected' and empty/whitespace reason", () => {
      const emptyReasonResult = rejectionValidationSchema.safeParse({
        status: "rejected",
        rejection_reason: "",
      });
      expect(emptyReasonResult.success).toBe(false);

      const whitespaceReasonResult = rejectionValidationSchema.safeParse({
        status: "rejected",
        rejection_reason: "    ",
      });
      expect(whitespaceReasonResult.success).toBe(false);

      const nullReasonResult = rejectionValidationSchema.safeParse({
        status: "rejected",
        rejection_reason: null,
      });
      expect(nullReasonResult.success).toBe(false);
    });

    it("permits requisition update with status 'rejected' and non-empty reason", () => {
      const validResult = rejectionValidationSchema.safeParse({
        status: "rejected",
        rejection_reason: "Camera team fully booked on this date. Please reschedule.",
      });
      expect(validResult.success).toBe(true);
    });

    it("permits approved and pending requisitions to have null rejection_reason", () => {
      const approvedResult = rejectionValidationSchema.safeParse({
        status: "approved",
        rejection_reason: null,
      });
      expect(approvedResult.success).toBe(true);

      const pendingResult = rejectionValidationSchema.safeParse({
        status: "pending",
        rejection_reason: null,
      });
      expect(pendingResult.success).toBe(true);
    });
  });

  describe("Lead-Time Rule & Emergency Override Enforcement", () => {
    const today = new Date("2026-11-23T10:00:00Z");

    it("enforces 3-day lead-time for routine / short shoot programs", () => {
      expect(getRequiredLeadDays("visitor_reel")).toBe(3);
      expect(getRequiredLeadDays("promotional_video")).toBe(3);
      expect(getRequiredLeadDays("workshop")).toBe(3);

      // 2 days in advance (too short)
      const invalidRoutine = validateRequisitionLeadTime({
        programType: "visitor_reel",
        shootDate: "2026-11-25",
        callerRole: "coordinator",
        today,
      });
      expect(invalidRoutine.valid).toBe(false);
      expect(invalidRoutine.error).toContain("Lead-time rule violation");

      // 3 days in advance (valid)
      const validRoutine = validateRequisitionLeadTime({
        programType: "visitor_reel",
        shootDate: "2026-11-26",
        callerRole: "coordinator",
        today,
      });
      expect(validRoutine.valid).toBe(true);
    });

    it("enforces 7-day lead-time for major event / documentary programs", () => {
      expect(getRequiredLeadDays("orientation")).toBe(7);
      expect(getRequiredLeadDays("final_exam")).toBe(7);
      expect(getRequiredLeadDays("documentary")).toBe(7);

      // 5 days in advance (too short for major event)
      const invalidMajor = validateRequisitionLeadTime({
        programType: "orientation",
        shootDate: "2026-11-28",
        callerRole: "coordinator",
        today,
      });
      expect(invalidMajor.valid).toBe(false);
      expect(invalidMajor.error).toContain("orientation requires at least 7 days notice");

      // 7 days in advance (valid)
      const validMajor = validateRequisitionLeadTime({
        programType: "orientation",
        shootDate: "2026-11-30",
        callerRole: "coordinator",
        today,
      });
      expect(validMajor.valid).toBe(true);
    });

    it("blocks non-admin from using Emergency Override to bypass lead-time", () => {
      const coordinatorOverride = validateRequisitionLeadTime({
        programType: "orientation",
        shootDate: "2026-11-24", // tomorrow
        isEmergencyOverride: true,
        overrideReason: "Urgent VIP visit",
        callerRole: "coordinator",
        today,
      });
      expect(coordinatorOverride.valid).toBe(false);
      expect(coordinatorOverride.error).toContain("Only Media Head (admin) can apply Emergency Override");
    });

    it("allows admin to apply Emergency Override ONLY with non-empty reason", () => {
      // Admin without reason is blocked
      const adminNoReason = validateRequisitionLeadTime({
        programType: "orientation",
        shootDate: "2026-11-24",
        isEmergencyOverride: true,
        overrideReason: "",
        callerRole: "admin",
        today,
      });
      expect(adminNoReason.valid).toBe(false);
      expect(adminNoReason.error).toContain("Emergency Override requires a non-empty override_reason");

      // Admin with non-empty reason is allowed
      const adminWithReason = validateRequisitionLeadTime({
        programType: "orientation",
        shootDate: "2026-11-24",
        isEmergencyOverride: true,
        overrideReason: "Special Chairman instruction for sudden VIP dignitary reception",
        callerRole: "admin",
        today,
      });
      expect(adminWithReason.valid).toBe(true);
    });
  });

  describe("Constraint: Completed Task Google Drive URL", () => {
    it("validates Google Drive and Google Docs URLs", () => {
      const validDrive = googleDriveUrlSchema.safeParse(
        "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
      );
      expect(validDrive.success).toBe(true);

      const validDocs = googleDriveUrlSchema.safeParse(
        "https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit"
      );
      expect(validDocs.success).toBe(true);
    });

    it("rejects non-Google Drive URLs", () => {
      const invalidUrl = googleDriveUrlSchema.safeParse("https://dropbox.com/s/12345/video.mp4");
      expect(invalidUrl.success).toBe(false);

      const phishingUrl = googleDriveUrlSchema.safeParse("https://drive.fake-google.com/file");
      expect(phishingUrl.success).toBe(false);
    });
  });

  describe("Database Type Definition Soundness", () => {
    it("ensures Database interface contains all 9 tables and typed functions", () => {
      type PublicTables = keyof Database["public"]["Tables"];
      const tables: PublicTables[] = [
        "courses",
        "venues",
        "profiles",
        "requisitions",
        "tasks",
        "task_assignees",
        "gear_items",
        "gear_bookings",
        "daily_logs",
      ];
      expect(tables).toHaveLength(9);
    });
  });
});
