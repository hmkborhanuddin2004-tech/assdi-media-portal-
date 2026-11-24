import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { addDays, format, parseISO } from "date-fns";
import {
  getDhakaTodayString,
  checkLeadTimeCompliance,
  createRequisitionSchema,
  rejectRequisitionSchema,
} from "@/lib/validations/requisitions";
import {
  createRequisition,
  approveRequisition,
  rejectRequisition,
  resetRequisitionsForTesting,
  getRequisitionsForUser,
} from "@/lib/requisitions/store";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";

describe("S4-02 & S4-03: Requisitions Adversarial Bypass & Database Constraints", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/001_init.sql");
  const dhakaTodayStr = getDhakaTodayString();
  const dhakaToday = parseISO(dhakaTodayStr);

  const tomorrowStr = format(addDays(dhakaToday, 1), "yyyy-MM-dd");
  const plusSixDaysStr = format(addDays(dhakaToday, 6), "yyyy-MM-dd");
  const plusEightDaysStr = format(addDays(dhakaToday, 8), "yyyy-MM-dd");

  const validCourseId = "c1000000-0000-0000-0000-000000000001"; // RAC
  const otherCourseId = "c1000000-0000-0000-0000-000000000007"; // The Art of Creation
  const venueId = "ba000000-0000-0000-0000-000000000001";

  const coordinatorUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);
  const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);

  beforeEach(() => {
    resetRequisitionsForTesting();
  });

  // --------------------------------------------------------------------------
  // 1. Audit Migration 001_init.sql for Required DB Triggers & Constraints
  // --------------------------------------------------------------------------
  describe("Audit 001_init.sql: PostgreSQL Trigger and CHECK Constraints", () => {
    it("verifies trigger function enforce_requisition_lead_time exists with Asia/Dhaka time zone", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.enforce_requisition_lead_time()");
      expect(sql).toContain("(NOW() AT TIME ZONE 'Asia/Dhaka')::date");
      expect(sql).toContain("trg_enforce_requisition_lead_time");
      expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.requisitions");
      expect(sql).toContain("v_required_days := 7;");
      expect(sql).toContain("v_required_days := 3;");
      expect(sql).toContain("NEW.shoot_date < (v_today + v_required_days)");
      expect(sql).toContain("Lead-time rule violation");
    });

    it("verifies chk_rejection_requires_reason constraint in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("chk_rejection_requires_reason");
      expect(sql).toContain(
        "CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)"
      );
    });

    it("verifies chk_override_requires_reason constraint in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("chk_override_requires_reason");
      expect(sql).toContain(
        "CHECK (is_emergency_override = false OR NULLIF(BTRIM(override_reason), '') IS NOT NULL)"
      );
    });

    it("verifies RLS policies prevent coordinator emergency override and enforce course isolation", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("req_insert_coordinator_or_admin");
      expect(sql).toContain("course_id = public.current_user_course_id()");
      expect(sql).toContain("is_emergency_override = false");
      expect(sql).toContain("status = 'pending'");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Direct supabase.from('requisitions').insert(...) Adversarial Tests
  // --------------------------------------------------------------------------
  describe("Direct Supabase JS Client Adversarial Trigger & Constraint Tests", () => {
    /**
     * Creates a Supabase client that uses a custom fetch simulating PostgreSQL trigger
     * and check constraint execution for local tests, matching the audited 001_init.sql.
     */
    function createSimulatedSupabaseClient({
      role,
      courseId,
      userId,
    }: {
      role: "admin" | "coordinator" | "staff" | "intern";
      courseId?: string | null;
      userId: string;
    }) {
      const customFetch: typeof fetch = async (input, init) => {
        const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method?.toUpperCase() || "GET";

        if (urlStr.includes("/rest/v1/requisitions")) {
          // INSERT
          if (method === "POST") {
            const body = JSON.parse((init?.body as string) || "{}");

            // Course isolation check
            if (role === "coordinator" && courseId && body.course_id !== courseId) {
              return new Response(
                JSON.stringify({
                  code: "42501",
                  message: 'new row violates row-level security policy for table "requisitions"',
                }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }

            // Coordinator attempting emergency override
            if (role === "coordinator" && body.is_emergency_override === true) {
              return new Response(
                JSON.stringify({
                  code: "P0001",
                  message:
                    "Lead-time rule violation: Only Media Head can apply Emergency Override.",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const compliance = checkLeadTimeCompliance({
              programType: body.program_type,
              shootDate: body.shoot_date,
              isEmergencyOverride: body.is_emergency_override,
              overrideReason: body.override_reason,
              callerRole: role,
              todayStr: dhakaTodayStr,
            });

            if (!compliance.ok) {
              return new Response(
                JSON.stringify({
                  code: "P0001",
                  message: compliance.error,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            // chk_override_requires_reason
            if (body.is_emergency_override === true) {
              if (!body.override_reason || body.override_reason.trim().length === 0) {
                return new Response(
                  JSON.stringify({
                    code: "23514",
                    message:
                      'new row for relation "requisitions" violates check constraint "chk_override_requires_reason"',
                  }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }
            }

            // Success
            return new Response(
              JSON.stringify([
                {
                  id: "r-mock-12345",
                  ...body,
                  coordinator_id: userId,
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
              ]),
              { status: 201, headers: { "Content-Type": "application/json" } }
            );
          }

          // UPDATE / PATCH
          if (method === "PATCH") {
            const body = JSON.parse((init?.body as string) || "{}");

            // chk_rejection_requires_reason check constraint
            if (body.status === "rejected") {
              if (
                body.rejection_reason === undefined ||
                body.rejection_reason === null ||
                (typeof body.rejection_reason === "string" && body.rejection_reason.trim().length === 0)
              ) {
                return new Response(
                  JSON.stringify({
                    code: "23514",
                    message:
                      'new row for relation "requisitions" violates check constraint "chk_rejection_requires_reason"',
                  }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }
            }

            return new Response(
              JSON.stringify([
                {
                  id: "r-mock-12345",
                  status: body.status,
                  rejection_reason: body.rejection_reason || null,
                  reviewed_by: userId,
                  reviewed_at: new Date().toISOString(),
                },
              ]),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      return createClient("https://your-project-ref.supabase.co", "anon-key", {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: customFetch },
      });
    }

    it("REJECTS direct supabase.from('requisitions').insert(...) as Coordinator with tomorrow's date via PostgreSQL trigger", async () => {
      const coordinatorSupabase = createSimulatedSupabaseClient({
        role: "coordinator",
        courseId: validCourseId,
        userId: coordinatorUser.id,
      });

      // Coordinator tries to insert a routine workshop for tomorrow (1 day notice < 3 days required)
      const { data, error } = await coordinatorSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: coordinatorUser.id,
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: tomorrowStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000002",
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("P0001");
      expect(error?.message).toContain("Lead-time rule violation");
      expect(error?.message).toContain("workshop requires at least 3 days notice");
      expect(error?.message).toContain("Asia/Dhaka");
    });

    it("REJECTS direct supabase.from('requisitions').insert(...) as Coordinator for orientation with 6 days notice (major event requires 7 days)", async () => {
      const coordinatorSupabase = createSimulatedSupabaseClient({
        role: "coordinator",
        courseId: validCourseId,
        userId: coordinatorUser.id,
      });

      // 6 days notice is not enough for orientation
      const { data, error } = await coordinatorSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: coordinatorUser.id,
        program_type: "orientation",
        format_duration: "3-5m Documentary",
        framing_type: "horizontal_16_9",
        venue_id: venueId,
        shoot_date: plusSixDaysStr,
        call_time: "10:00 AM",
        coordinator_phone: "01711000002",
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("P0001");
      expect(error?.message).toContain("orientation requires at least 7 days notice");
    });

    it("SUCCEEDS direct supabase.from('requisitions').insert(...) as Coordinator on +8 days notice", async () => {
      const coordinatorSupabase = createSimulatedSupabaseClient({
        role: "coordinator",
        courseId: validCourseId,
        userId: coordinatorUser.id,
      });

      const { data, error } = await coordinatorSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: coordinatorUser.id,
        program_type: "orientation",
        format_duration: "3-5m Documentary",
        framing_type: "horizontal_16_9",
        venue_id: venueId,
        shoot_date: plusEightDaysStr,
        call_time: "10:00 AM",
        coordinator_phone: "01711000002",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it("REJECTS requisition update with status 'rejected' and empty rejection_reason (violating chk_rejection_requires_reason)", async () => {
      const adminSupabase = createSimulatedSupabaseClient({
        role: "admin",
        userId: adminUser.id,
      });

      // Attempting to reject with empty reason
      const { data, error } = await adminSupabase
        .from("requisitions")
        .update({
          status: "rejected",
          rejection_reason: "",
        })
        .eq("id", "r-mock-12345");

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("23514");
      expect(error?.message).toContain('violates check constraint "chk_rejection_requires_reason"');
    });

    it("REJECTS requisition update with status 'rejected' and whitespace-only rejection_reason", async () => {
      const adminSupabase = createSimulatedSupabaseClient({
        role: "admin",
        userId: adminUser.id,
      });

      const { data, error } = await adminSupabase
        .from("requisitions")
        .update({
          status: "rejected",
          rejection_reason: "   \t  \n  ",
        })
        .eq("id", "r-mock-12345");

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("23514");
      expect(error?.message).toContain('violates check constraint "chk_rejection_requires_reason"');
    });

    it("SUCCEEDS requisition update with status 'rejected' when mandatory non-empty reason is provided", async () => {
      const adminSupabase = createSimulatedSupabaseClient({
        role: "admin",
        userId: adminUser.id,
      });

      const validReason = "Camera team fully booked on this date. Please reschedule.";
      const { error } = await adminSupabase
        .from("requisitions")
        .update({
          status: "rejected",
          rejection_reason: validReason,
        })
        .eq("id", "r-mock-12345");

      expect(error).toBeNull();
    });

    it("ALLOWS Admin to create Emergency Override for tomorrow with mandatory override_reason", async () => {
      const adminSupabase = createSimulatedSupabaseClient({
        role: "admin",
        userId: adminUser.id,
      });

      const { data, error } = await adminSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: adminUser.id,
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: tomorrowStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000001",
        is_emergency_override: true,
        override_reason: "Special Chairman directive for sudden dignitary reception",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it("REJECTS Admin Emergency Override when override_reason is empty (chk_override_requires_reason)", async () => {
      const adminSupabase = createSimulatedSupabaseClient({
        role: "admin",
        userId: adminUser.id,
      });

      const { data, error } = await adminSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: adminUser.id,
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: tomorrowStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000001",
        is_emergency_override: true,
        override_reason: "   ",
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("Emergency Override requires a non-empty override_reason");
    });

    it("BLOCKS Coordinator from applying Emergency Override (Admin-only privilege)", async () => {
      const coordinatorSupabase = createSimulatedSupabaseClient({
        role: "coordinator",
        courseId: validCourseId,
        userId: coordinatorUser.id,
      });

      const { data, error } = await coordinatorSupabase.from("requisitions").insert({
        course_id: validCourseId,
        coordinator_id: coordinatorUser.id,
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: tomorrowStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000002",
        is_emergency_override: true,
        override_reason: "Coordinator attempted emergency override bypass",
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("Only Media Head can apply Emergency Override");
    });

    it("BLOCKS Coordinator from inserting requisition for another course (Course Isolation RLS)", async () => {
      const coordinatorSupabase = createSimulatedSupabaseClient({
        role: "coordinator",
        courseId: validCourseId, // RAC
        userId: coordinatorUser.id,
      });

      // Coordinator tries to insert for otherCourseId (AOC)
      const { data, error } = await coordinatorSupabase.from("requisitions").insert({
        course_id: otherCourseId, // AOC
        coordinator_id: coordinatorUser.id,
        program_type: "workshop",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: plusEightDaysStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000002",
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toContain("violates row-level security policy");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Store & Business Layer Test Suite
  // --------------------------------------------------------------------------
  describe("Authoritative Store & Central Task Board Integration", () => {
    it("approving a requisition atomically creates a task in tasks table with stage 'shoot_assigned'", () => {
      // Create pending requisition
      const req = createRequisition(
        {
          course_id: validCourseId,
          program_type: "workshop",
          format_duration: "30-40s Reel",
          framing_type: "vertical_9_16",
          venue_id: venueId,
          shoot_date: plusEightDaysStr,
          call_time: "09:00 AM",
          coordinator_phone: "01711000002",
          notes: "Atomic task creation test",
          is_emergency_override: false,
        },
        coordinatorUser
      );

      expect(req.status).toBe("pending");

      // Admin approves
      const result = approveRequisition(req.id, adminUser);
      expect(result.requisition.status).toBe("approved");
      expect(result.task).toBeDefined();
      expect(result.task.requisition_id).toBe(req.id);
      expect(result.task.stage).toBe("shoot_assigned");
    });

    it("rejecting a requisition requires non-empty rejection_reason in Store", () => {
      const req = createRequisition(
        {
          course_id: validCourseId,
          program_type: "workshop",
          format_duration: "30-40s Reel",
          framing_type: "vertical_9_16",
          venue_id: venueId,
          shoot_date: plusEightDaysStr,
          call_time: "09:00 AM",
          coordinator_phone: "01711000002",
          notes: "Rejection test",
          is_emergency_override: false,
        },
        coordinatorUser
      );

      // Empty rejection reason throws chk_rejection_requires_reason
      expect(() => rejectRequisition(req.id, "", adminUser)).toThrow(
        'chk_rejection_requires_reason'
      );
      expect(() => rejectRequisition(req.id, "   ", adminUser)).toThrow(
        'chk_rejection_requires_reason'
      );

      // Valid rejection reason succeeds
      const rejected = rejectRequisition(
        req.id,
        "Camera gear under maintenance on this date",
        adminUser
      );
      expect(rejected.status).toBe("rejected");
      expect(rejected.rejection_reason).toBe("Camera gear under maintenance on this date");
    });

    it("isolates coordinator to their own course in getRequisitionsForUser", () => {
      const coordinatorRequests = getRequisitionsForUser(coordinatorUser);

      // Coordinator should only see requisitions where course_id === validCourseId (RAC)
      for (const req of coordinatorRequests) {
        expect(req.course_id).toBe(validCourseId);
      }

      // Admin sees requisitions across multiple courses
      const adminRequests = getRequisitionsForUser(adminUser);
      const uniqueCourses = new Set(adminRequests.map((r) => r.course_id));
      expect(uniqueCourses.size).toBeGreaterThan(1);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Zod Validation Unit Alignment Tests
  // --------------------------------------------------------------------------
  describe("Zod Validation Schema Alignment with DB Enums & Rules", () => {
    it("validates createRequisitionSchema accepts allowed framing_type ('vertical_9_16', 'horizontal_16_9') and rejects Single/Multi-Cam", () => {
      const validVertical = createRequisitionSchema.safeParse({
        course_id: validCourseId,
        program_type: "visitor_reel",
        format_duration: "30-40s Reel",
        framing_type: "vertical_9_16",
        venue_id: venueId,
        shoot_date: plusEightDaysStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000002",
      });
      expect(validVertical.success).toBe(true);

      const invalidFraming = createRequisitionSchema.safeParse({
        course_id: validCourseId,
        program_type: "visitor_reel",
        format_duration: "30-40s Reel",
        framing_type: "Single-Cam" as unknown as "vertical_9_16",
        venue_id: venueId,
        shoot_date: plusEightDaysStr,
        call_time: "09:00 AM",
        coordinator_phone: "01711000002",
      });
      expect(invalidFraming.success).toBe(false);
    });

    it("validates rejectRequisitionSchema requires non-empty string", () => {
      expect(
        rejectRequisitionSchema.safeParse({ status: "rejected", rejection_reason: "" }).success
      ).toBe(false);
      expect(
        rejectRequisitionSchema.safeParse({ status: "rejected", rejection_reason: "   " }).success
      ).toBe(false);
      expect(
        rejectRequisitionSchema.safeParse({
          status: "rejected",
          rejection_reason: "Date conflict with final exams",
        }).success
      ).toBe(true);
    });
  });
});
