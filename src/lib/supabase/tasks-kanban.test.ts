import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  getAllTasks,
  getTaskById,
  approveAndAssignTask,
  updateTaskStage,
  deriveShootSlipData,
  syncInternFootageUpload,
  resetTasksForTesting,
  PostgresCheckConstraintError,
  RlsForbiddenError,
  PostgresExclusionError,
} from "@/lib/tasks/store";
import {
  resetGearForTesting,
  getAllGearItemsRaw,
  getAllBookings,
} from "@/lib/gear/store";
import {
  resetRequisitionsForTesting,
} from "@/lib/requisitions/store";
import {
  approveAndAssignSchema,
} from "@/lib/validations/tasks";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";

describe("Step 6: Central Task Board, Kanban Pipeline, RLS Security & Shoot Slip (S6-01 to S6-04)", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/001_init.sql");

  const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
  const staffLeadUser = toUserProfile(DEMO_USERS["arif@assdi.org"]); // Lead on Task 1
  const staffOtherUser = toUserProfile(DEMO_USERS["nabil@assdi.org"]); // Other staff member
  const internUser = toUserProfile(DEMO_USERS["hasan@assdi.org"]);
  const coordinatorUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);
  const aocCoordinatorUser = toUserProfile(DEMO_USERS["aoc@assdi.org"]);

  beforeEach(() => {
    resetRequisitionsForTesting();
    resetGearForTesting();
    resetTasksForTesting();
  });

  // --------------------------------------------------------------------------
  // 1. Audit Migration 001_init.sql for Tasks Schema, Constraints & RLS Policies
  // --------------------------------------------------------------------------
  describe("1. Audit 001_init.sql: Schema, Constraints, Triggers & RLS Policies", () => {
    it("verifies public.tasks table schema, enums and columns in 001_init.sql", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.tasks");
      expect(sql).toContain("requisition_id UUID NOT NULL UNIQUE REFERENCES public.requisitions(id)");
      expect(sql).toContain("stage public.task_stage NOT NULL DEFAULT 'shoot_assigned'");
      expect(sql).toContain("lead_staff_id UUID REFERENCES public.profiles(id)");
      expect(sql).toContain("deadline_at TIMESTAMPTZ");
      expect(sql).toContain("raw_footage_uploaded BOOLEAN NOT NULL DEFAULT false");
      expect(sql).toContain("final_drive_url TEXT");
      expect(sql).toContain("completed_at TIMESTAMPTZ");
    });

    it("verifies task_stage enum contains all 6 canonical stages", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("'pending'");
      expect(sql).toContain("'shoot_assigned'");
      expect(sql).toContain("'shoot_done'");
      expect(sql).toContain("'editing'");
      expect(sql).toContain("'review'");
      expect(sql).toContain("'completed'");
    });

    it("verifies chk_completed_drive_url CHECK constraint regex in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("CONSTRAINT chk_completed_drive_url");
      expect(sql).toContain("final_drive_url ~* '^https://(drive|docs)\\.google\\.com/'");
    });

    it("verifies task_assignees composite primary key in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.task_assignees");
      expect(sql).toContain("task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE");
      expect(sql).toContain("user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE");
      expect(sql).toContain("PRIMARY KEY (task_id, user_id)");
    });

    it("verifies tasks_lead_staff_update RLS policy in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("CREATE POLICY tasks_lead_staff_update ON public.tasks FOR UPDATE TO authenticated");
      expect(sql).toContain("USING (public.current_user_role() = 'staff' AND lead_staff_id = auth.uid())");
      expect(sql).toContain("WITH CHECK (public.current_user_role() = 'staff' AND lead_staff_id = auth.uid())");
    });

    it("verifies trg_sync_raw_footage_to_task trigger in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.sync_raw_footage_to_task()");
      expect(sql).toContain("IF NEW.log_role = 'intern' AND NEW.raw_footage_uploaded = true");
      expect(sql).toContain("UPDATE public.tasks");
      expect(sql).toContain("SET raw_footage_uploaded = true");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Gate 2 Security & RLS Policy Tests: Lead Staff vs Non-Lead Staff Mutation
  // --------------------------------------------------------------------------
  describe("2. Gate 2: RLS Security Policy Enforcement (tasks_lead_staff_update)", () => {
    const task1Id = "t1000000-0000-0000-0000-000000000001"; // Lead is Arif Rahman

    it("(a) ALLOWS assigned lead_staff_id to update task stage (shoot_done, editing, review)", () => {
      // Arif Rahman is lead_staff_id on Task 1
      const updated = updateTaskStage(
        task1Id,
        { stage: "shoot_done" },
        staffLeadUser
      );

      expect(updated.stage).toBe("shoot_done");
      expect(updated.id).toBe(task1Id);

      // Lead moves to editing
      const editingTask = updateTaskStage(
        task1Id,
        { stage: "editing" },
        staffLeadUser
      );
      expect(editingTask.stage).toBe("editing");

      // Lead moves to review
      const reviewTask = updateTaskStage(
        task1Id,
        { stage: "review" },
        staffLeadUser
      );
      expect(reviewTask.stage).toBe("review");
    });

    it("(b) BLOCKS a different non-lead staff member from updating task stage (RLS Violation 42501)", () => {
      // Nabil is a permanent staff member, but NOT the lead on Task 1
      expect(() =>
        updateTaskStage(
          task1Id,
          { stage: "shoot_done" },
          staffOtherUser
        )
      ).toThrow(RlsForbiddenError);

      try {
        updateTaskStage(task1Id, { stage: "shoot_done" }, staffOtherUser);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(RlsForbiddenError);
        expect((err as RlsForbiddenError).code).toBe("42501");
        expect((err as RlsForbiddenError).message).toContain("tasks_lead_staff_update");
      }
    });

    it("(c) BLOCKS intern from updating task stage directly", () => {
      expect(() =>
        updateTaskStage(task1Id, { stage: "shoot_done" }, internUser)
      ).toThrow(RlsForbiddenError);
    });

    it("(d) BLOCKS coordinator from updating task stage directly", () => {
      expect(() =>
        updateTaskStage(task1Id, { stage: "shoot_done" }, coordinatorUser)
      ).toThrow(RlsForbiddenError);
    });

    it("(e) ALLOWS admin to update task stage (tasks_admin_all)", () => {
      const updated = updateTaskStage(
        task1Id,
        { stage: "review" },
        adminUser
      );
      expect(updated.stage).toBe("review");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Gate 2 DB CHECK: chk_completed_drive_url Regex & Stage Validation
  // --------------------------------------------------------------------------
  describe("3. Gate 2: DB CHECK chk_completed_drive_url & Drive URL Regex", () => {
    const task1Id = "t1000000-0000-0000-0000-000000000001";

    it("REJECTS non-Google-Drive URLs with PostgresCheckConstraintError (code 23514)", () => {
      const invalidUrls = [
        "https://dropbox.com/s/123456/final.mp4",
        "https://onedrive.live.com/view?id=123",
        "https://youtube.com/watch?v=abcd",
        "https://phishing-drive.google.com.evil.com/file",
        "ftp://drive.google.com/folder",
        "http://drive.google.com/folder", // Not HTTPS
        "random-string-not-url",
      ];

      for (const badUrl of invalidUrls) {
        expect(() =>
          updateTaskStage(
            task1Id,
            { stage: "editing", final_drive_url: badUrl },
            staffLeadUser
          )
        ).toThrow(PostgresCheckConstraintError);
      }
    });

    it("SUCCEEDS with valid Google Drive URLs matching ^https://(drive|docs)\\.google\\.com/", () => {
      const validUrls = [
        "https://drive.google.com/drive/folders/1AOC-Master-Course-Reel-Final",
        "https://drive.google.com/file/d/1234567890/view?usp=sharing",
        "https://docs.google.com/document/d/12345/edit",
        "https://DRIVE.GOOGLE.COM/drive/folders/ABCDEF", // Case-insensitive (~*)
      ];

      for (const validUrl of validUrls) {
        const updated = updateTaskStage(
          task1Id,
          { stage: "editing", final_drive_url: validUrl },
          staffLeadUser
        );
        expect(updated.final_drive_url).toBe(validUrl);
      }
    });

    it("REJECTS transitioning to 'completed' without a valid Google Drive URL", () => {
      expect(() =>
        updateTaskStage(
          task1Id,
          { stage: "completed", final_drive_url: null },
          adminUser
        )
      ).toThrow("গুগল ড্রাইভ");
    });

    it("SUCCEEDS transitioning to 'completed' with valid Drive URL, setting completed_at timestamp", () => {
      const validUrl = "https://drive.google.com/drive/folders/1FinalDelivery-Delivered";
      const completedTask = updateTaskStage(
        task1Id,
        { stage: "completed", final_drive_url: validUrl },
        adminUser
      );

      expect(completedTask.stage).toBe("completed");
      expect(completedTask.final_drive_url).toBe(validUrl);
      expect(completedTask.completed_at).toBeDefined();
      expect(typeof completedTask.completed_at).toBe("string");
    });
  });

  // --------------------------------------------------------------------------
  // 4. S6-01: Atomic Requisition Approval + 2–3 Member Team & Gear Assignment
  // --------------------------------------------------------------------------
  describe("4. S6-01: Atomic Approve & Assign with Gear Conflict Handling (23P01)", () => {
    it("atomically approves requisition, creates task, inserts assignees & books gear", () => {
      const allGear = getAllGearItemsRaw();
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01")!;
      const lens = allGear.find((g) => g.serial_number === "SN-LN-24105-01")!;

      const pendingReqId = "r1000000-0000-0000-0000-000000000010"; // SBMC Bakery Reel (Pending)

      const result = approveAndAssignTask(
        {
          requisition_id: pendingReqId,
          lead_staff_id: staffLeadUser.id,
          assignee_ids: [staffLeadUser.id, internUser.id], // 2 members
          deadline_at: "2026-12-02T18:00:00Z",
          gear_ids: [fx3.id, lens.id],
          notes: "Approved with standard 2-person cinematography setup",
        },
        adminUser
      );

      expect(result.task).toBeDefined();
      expect(result.task.stage).toBe("shoot_assigned");
      expect(result.task.lead_staff_id).toBe(staffLeadUser.id);
      expect(result.task.assignees.length).toBe(2);

      const leadAssignee = result.task.assignees.find((a) => a.user_id === staffLeadUser.id);
      expect(leadAssignee?.assignment_role).toBe("lead");

      const internAssignee = result.task.assignees.find((a) => a.user_id === internUser.id);
      expect(internAssignee?.assignment_role).toBe("member");

      // Verify gear bookings created atomically
      const bookings = getAllBookings().filter((b) => b.task_id === result.task.id);
      expect(bookings.length).toBe(2);
      expect(bookings.some((b) => b.gear_id === fx3.id)).toBe(true);
      expect(bookings.some((b) => b.gear_id === lens.id)).toBe(true);
    });

    it("BLOCKS approval and raises 23P01 when selected gear has an overlapping booking (Zero Partial State)", () => {
      const allGear = getAllGearItemsRaw();
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01")!;

      const reqId = "r1000000-0000-0000-0000-000000000007"; // Professional Cooking on 2026-11-25

      // First approval on FX3 on 2026-11-25 succeeds
      approveAndAssignTask(
        {
          requisition_id: reqId,
          lead_staff_id: staffLeadUser.id,
          assignee_ids: [staffLeadUser.id, internUser.id],
          deadline_at: "2026-11-28T18:00:00Z",
          gear_ids: [fx3.id],
        },
        adminUser
      );

      // Attempting another booking on the same date with FX3 MUST throw PostgresExclusionError
      expect(() =>
        approveAndAssignTask(
          {
            requisition_id: reqId,
            lead_staff_id: staffLeadUser.id,
            assignee_ids: [staffLeadUser.id, internUser.id],
            deadline_at: "2026-11-28T18:00:00Z",
            gear_ids: [fx3.id],
          },
          adminUser
        )
      ).toThrow(PostgresExclusionError);
    });

    it("BLOCKS non-admin from approving and assigning (RLS tasks_admin_all)", () => {
      const allGear = getAllGearItemsRaw();
      expect(() =>
        approveAndAssignTask(
          {
            requisition_id: "r1000000-0000-0000-0000-000000000010",
            lead_staff_id: staffLeadUser.id,
            assignee_ids: [staffLeadUser.id, internUser.id],
            deadline_at: "2026-12-02T18:00:00Z",
            gear_ids: [allGear[0].id],
          },
          staffLeadUser
        )
      ).toThrow(RlsForbiddenError);
    });

    it("VALIDATES team size constraint (2–3 members) and designated lead", () => {
      const allGear = getAllGearItemsRaw();

      // Only 1 member -> Fails min(2)
      expect(() =>
        approveAndAssignSchema.parse({
          requisition_id: "r1000000-0000-0000-0000-000000000010",
          lead_staff_id: staffLeadUser.id,
          assignee_ids: [staffLeadUser.id],
          deadline_at: "2026-12-02T18:00:00Z",
          gear_ids: [allGear[0].id],
        })
      ).toThrow();

      // 4 members -> Fails max(3)
      expect(() =>
        approveAndAssignSchema.parse({
          requisition_id: "r1000000-0000-0000-0000-000000000010",
          lead_staff_id: staffLeadUser.id,
          assignee_ids: [
            staffLeadUser.id,
            internUser.id,
            staffOtherUser.id,
            adminUser.id,
          ],
          deadline_at: "2026-12-02T18:00:00Z",
          gear_ids: [allGear[0].id],
        })
      ).toThrow();

      // Designated lead NOT in assignee_ids -> Fails refinement
      expect(() =>
        approveAndAssignSchema.parse({
          requisition_id: "r1000000-0000-0000-0000-000000000010",
          lead_staff_id: adminUser.id, // Not in assignees
          assignee_ids: [staffLeadUser.id, internUser.id],
          deadline_at: "2026-12-02T18:00:00Z",
          gear_ids: [allGear[0].id],
        })
      ).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 5. S6-04: Automated Shoot Assignment Slip & WhatsApp Share Link
  // --------------------------------------------------------------------------
  describe("5. S6-04: Automated Shoot Slip Derivation & WhatsApp Share URL", () => {
    it("derives complete Shoot Slip with Team phones, Venue, Call Time and Gear Serials", () => {
      const task1 = getTaskById("t1000000-0000-0000-0000-000000000001", adminUser)!;
      const slip = deriveShootSlipData(task1);

      expect(slip.slip_number).toBeDefined();
      expect(slip.course_title).toContain("The Art of Creation");
      expect(slip.venue_name).toBeDefined();
      expect(slip.team_members.length).toBeGreaterThanOrEqual(2);

      // Verify phone numbers present
      const arif = slip.team_members.find((m) => m.name.includes("Arif"));
      expect(arif?.phone).toBe("01711000007");
      expect(arif?.is_lead).toBe(true);

      const hasan = slip.team_members.find((m) => m.name.includes("Hasan"));
      expect(hasan?.phone).toBe("01711000008");

      // Verify gear list contains serials
      expect(slip.assigned_gear.length).toBeGreaterThan(0);
      expect(slip.gear_summary).toContain("SN-");
    });

    it("generates a zero-cost, valid wa.me WhatsApp share link with formatted text", () => {
      const task1 = getTaskById("t1000000-0000-0000-0000-000000000001", adminUser)!;
      const slip = deriveShootSlipData(task1);

      expect(slip.whatsapp_url).toMatch(/^https:\/\/wa\.me\/\?text=/);
      expect(slip.whatsapp_text).toContain("ASSDI MEDIA • SHOOT SLIP");
      expect(slip.whatsapp_text).toContain("The Art of Creation");
      expect(slip.whatsapp_text).toContain(slip.venue_name);
      expect(slip.whatsapp_text).toContain("01711000007");

      // URL decoding test
      const queryPart = slip.whatsapp_url.replace("https://wa.me/?text=", "");
      const decoded = decodeURIComponent(queryPart);
      expect(decoded).toBe(slip.whatsapp_text);
    });
  });

  // --------------------------------------------------------------------------
  // 6. S6-03: Coordinator Course Isolation & Stage Mapping
  // --------------------------------------------------------------------------
  describe("6. S6-03: Coordinator Isolation & 4-Status Mapping", () => {
    it("ALLOWS coordinator to query tasks belonging to their assigned course", () => {
      const aocTasks = getAllTasks(aocCoordinatorUser);
      expect(aocTasks.length).toBeGreaterThan(0);

      // All returned tasks must belong to The Art of Creation
      for (const t of aocTasks) {
        expect(t.course_name).toContain("The Art of Creation");
      }
    });

    it("BLOCKS coordinator from accessing a task belonging to a different course (RLS)", () => {
      // RAC task t1000000-0000-0000-0000-000000000004 belongs to RAC, not AOC
      expect(() =>
        getTaskById("t1000000-0000-0000-0000-000000000004", aocCoordinatorUser)
      ).toThrow(RlsForbiddenError);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Trigger B: Intern Raw Footage Upload Sync
  // --------------------------------------------------------------------------
  describe("7. Trigger B: Intern Raw Footage Upload Sync to Parent Task Card", () => {
    it("syncs raw_footage_uploaded = true to parent task card upon intern footage upload", () => {
      const task1Id = "t1000000-0000-0000-0000-000000000001";
      const taskBefore = getTaskById(task1Id, adminUser)!;
      expect(taskBefore.raw_footage_uploaded).toBe(false);

      // Intern uploads footage
      syncInternFootageUpload(task1Id);

      const taskAfter = getTaskById(task1Id, adminUser)!;
      expect(taskAfter.raw_footage_uploaded).toBe(true);
    });
  });
});
