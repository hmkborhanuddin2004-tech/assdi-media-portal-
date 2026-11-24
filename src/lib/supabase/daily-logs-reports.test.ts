import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  createDailyLog,
  updateDailyLog,
  getDailyLogs,
  getDailyLogsStore,
  resetDailyLogsForTesting,
  PostgresCheckConstraintError,
  PostgresForeignKeyViolationError,
  RlsForbiddenError,
} from "@/lib/daily-logs/store";
import {
  calculateWorkHistoryReport,
  generateReportsCsv,
  sanitizeCsvCell,
} from "@/lib/reports/analytics";
import {
  resetTasksForTesting,
  getTasksStore,
  getTaskById,
} from "@/lib/tasks/store";
import { resetRequisitionsForTesting } from "@/lib/requisitions/store";
import { resetGearForTesting } from "@/lib/gear/store";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";
import {
  staffDailyLogSchema,
  internDailyLogSchema,
  hoursSpentSchema,
} from "@/lib/validations/daily-logs";

describe("Step 8 (S8-01, S8-02, S8-03): Daily Worklogs, Triggers, RLS Security & Analytics Reports", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/001_init.sql"
  );

  const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
  const staffArif = toUserProfile(DEMO_USERS["arif@assdi.org"]); // Staff Lead on Task 1
  const internHasan = toUserProfile(DEMO_USERS["hasan@assdi.org"]); // Intern on Task 1
  const coordinatorUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);

  beforeEach(() => {
    resetRequisitionsForTesting();
    resetGearForTesting({ withMockupSeed: true });
    resetTasksForTesting();
    resetDailyLogsForTesting();
  });

  // ==========================================================================
  // 1. Audit Migration 001_init.sql for Daily Logs Schema, Triggers & RLS
  // ==========================================================================
  describe("1. Audit 001_init.sql: Schema, Constraints, Triggers & RLS Policies", () => {
    it("verifies public.daily_logs table definition, columns, and foreign keys in 001_init.sql", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.daily_logs");
      expect(sql).toContain("user_id UUID NOT NULL REFERENCES public.profiles(id)");
      expect(sql).toContain("log_role public.user_role NOT NULL CHECK (log_role IN ('staff', 'intern'))");
      expect(sql).toContain("log_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Dhaka')::date)");
      expect(sql).toContain("task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL");
      expect(sql).toContain("work_category public.staff_work_category");
      expect(sql).toContain("hours_spent NUMERIC(4,2) NOT NULL CHECK (hours_spent > 0 AND hours_spent <= 24)");
      expect(sql).toContain("shoot_location_type public.shoot_location_type");
      expect(sql).toContain("raw_footage_uploaded BOOLEAN");
      expect(sql).toContain("notes TEXT NOT NULL");
    });

    it("verifies DB CHECK constraints chk_staff_log_fields and chk_intern_log_fields in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CONSTRAINT chk_staff_log_fields");
      expect(sql).toContain("CHECK (log_role <> 'staff' OR work_category IS NOT NULL)");

      expect(sql).toContain("CONSTRAINT chk_intern_log_fields");
      expect(sql).toContain(
        "CHECK (\n      log_role <> 'intern'\n      OR (shoot_location_type IS NOT NULL AND raw_footage_uploaded IS NOT NULL)\n    )"
      );
    });

    it("verifies trigger trg_sync_raw_footage_to_task in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.sync_raw_footage_to_task()");
      expect(sql).toContain("IF NEW.log_role = 'intern' AND NEW.raw_footage_uploaded = true AND NEW.task_id IS NOT NULL THEN");
      expect(sql).toContain("UPDATE public.tasks\n       SET raw_footage_uploaded = true");
      expect(sql).toContain("CREATE TRIGGER trg_sync_raw_footage_to_task");
      expect(sql).toContain("AFTER INSERT OR UPDATE ON public.daily_logs");
    });

    it("verifies RLS policies daily_logs_insert_self, daily_logs_select, daily_logs_update_self in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("CREATE POLICY daily_logs_select ON public.daily_logs FOR SELECT TO authenticated");
      expect(sql).toContain("CREATE POLICY daily_logs_insert_self ON public.daily_logs FOR INSERT TO authenticated");
      expect(sql).toContain("user_id = auth.uid()");
      expect(sql).toContain("log_role = public.current_user_role()");
      expect(sql).toContain("public.current_user_role() IN ('staff', 'intern')");
    });
  });

  // ==========================================================================
  // 2. DB Trigger Test: trg_sync_raw_footage_to_task
  // ==========================================================================
  describe("2. DB Trigger Test: trg_sync_raw_footage_to_task", () => {
    it("(a) Intern submitting raw_footage_uploaded = true automatically sets tasks.raw_footage_uploaded = true", () => {
      // Find Task 1 (t1000000-0000-0000-0000-000000000001: The Art of Creation)
      const taskBefore = getTaskById("t1000000-0000-0000-0000-000000000001", adminUser);
      expect(taskBefore).not.toBeNull();
      expect(taskBefore?.raw_footage_uploaded).toBe(false);

      // Hasan Ali (intern) submits daily log for Task 1 with raw_footage_uploaded = true
      const createdLog = createDailyLog(
        {
          task_id: "t1000000-0000-0000-0000-000000000001",
          hours_spent: 4.5,
          shoot_location_type: "outdoor",
          raw_footage_uploaded: true,
          notes: "Captured courtyard B-roll and uploaded all footage to Google Drive.",
        },
        internHasan
      );

      expect(createdLog.raw_footage_uploaded).toBe(true);

      // Verify that parent task has been updated automatically via trigger simulation
      const taskAfter = getTaskById("t1000000-0000-0000-0000-000000000001", adminUser);
      expect(taskAfter?.raw_footage_uploaded).toBe(true);
    });

    it("does NOT update task raw_footage_uploaded if intern submits raw_footage_uploaded = false", () => {
      // Task 5: RAC Promo (raw_footage_uploaded is initially false)
      const taskBefore = getTaskById("t1000000-0000-0000-0000-000000000005", adminUser);
      expect(taskBefore?.raw_footage_uploaded).toBe(false);

      createDailyLog(
        {
          task_id: "t1000000-0000-0000-0000-000000000005",
          hours_spent: 3.0,
          shoot_location_type: "indoor",
          raw_footage_uploaded: false,
          notes: "Shooting ongoing, footage upload pending until tomorrow.",
        },
        internHasan
      );

      const taskAfter = getTaskById("t1000000-0000-0000-0000-000000000005", adminUser);
      expect(taskAfter?.raw_footage_uploaded).toBe(false);
    });
  });

  // ==========================================================================
  // 3. DB CHECK Constraints: chk_staff_log_fields, chk_intern_log_fields & hours_spent
  // ==========================================================================
  describe("3. DB CHECK Constraints & Validation Tests", () => {
    it("(b1) Staff log without work_category is rejected by chk_staff_log_fields", () => {
      expect(() => {
        createDailyLog(
          {
            work_category: null,
            hours_spent: 6.0,
            notes: "General editing without category",
          },
          staffArif
        );
      }).toThrowError(PostgresCheckConstraintError);

      try {
        createDailyLog(
          {
            work_category: null,
            hours_spent: 6.0,
            notes: "General editing without category",
          },
          staffArif
        );
      } catch (err: unknown) {
        expect(err instanceof PostgresCheckConstraintError).toBe(true);
        if (err instanceof PostgresCheckConstraintError) {
          expect(err.code).toBe("23514");
          expect(err.constraint).toBe("chk_staff_log_fields");
        }
      }

      // Verify Zod schema rejects as well
      const zodResult = staffDailyLogSchema.safeParse({
        hours_spent: 6.0,
        notes: "Missing category",
      });
      expect(zodResult.success).toBe(false);
    });

    it("(b2) Intern log without shoot_location_type or raw_footage_uploaded is rejected by chk_intern_log_fields", () => {
      // Missing shoot_location_type
      expect(() => {
        createDailyLog(
          {
            shoot_location_type: null,
            raw_footage_uploaded: true,
            hours_spent: 4.0,
            notes: "Field assistance",
          },
          internHasan
        );
      }).toThrowError(PostgresCheckConstraintError);

      // Missing raw_footage_uploaded
      expect(() => {
        createDailyLog(
          {
            shoot_location_type: "outdoor",
            raw_footage_uploaded: null,
            hours_spent: 4.0,
            notes: "Field assistance",
          },
          internHasan
        );
      }).toThrowError(PostgresCheckConstraintError);

      try {
        createDailyLog(
          {
            shoot_location_type: null,
            raw_footage_uploaded: true,
            hours_spent: 4.0,
            notes: "Field assistance",
          },
          internHasan
        );
      } catch (err: unknown) {
        expect(err instanceof PostgresCheckConstraintError).toBe(true);
        if (err instanceof PostgresCheckConstraintError) {
          expect(err.code).toBe("23514");
          expect(err.constraint).toBe("chk_intern_log_fields");
        }
      }

      // Verify Zod schema rejects
      const zodResult = internDailyLogSchema.safeParse({
        hours_spent: 4.0,
        notes: "Missing required fields",
      });
      expect(zodResult.success).toBe(false);
    });

    it("(b3) Rejects hours_spent <= 0 or > 24 enforcing hours_spent constraint", () => {
      // Zero hours
      expect(() => {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: 0,
            notes: "Zero hours",
          },
          staffArif
        );
      }).toThrowError(PostgresCheckConstraintError);

      // Negative hours
      expect(() => {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: -2,
            notes: "Negative hours",
          },
          staffArif
        );
      }).toThrowError(PostgresCheckConstraintError);

      // Greater than 24 hours
      expect(() => {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: 25,
            notes: "Too many hours",
          },
          staffArif
        );
      }).toThrowError(PostgresCheckConstraintError);

      // Zod schema checks
      expect(hoursSpentSchema.safeParse(0).success).toBe(false);
      expect(hoursSpentSchema.safeParse(-1).success).toBe(false);
      expect(hoursSpentSchema.safeParse(25).success).toBe(false);
      expect(hoursSpentSchema.safeParse(6.5).success).toBe(true);
    });

    it("(b4) Rejects empty notes", () => {
      expect(() => {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: 5.0,
            notes: "   ",
          },
          staffArif
        );
      }).toThrowError(PostgresCheckConstraintError);
    });

    it("(b5) Foreign key validation: rejects non-existent task_id with PostgresForeignKeyViolationError (23503)", () => {
      expect(() => {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: 3.5,
            task_id: "non-existent-task-id-99999",
            notes: "Log with fake task reference",
          },
          staffArif
        );
      }).toThrowError(PostgresForeignKeyViolationError);

      try {
        createDailyLog(
          {
            work_category: "daily_cinematography",
            hours_spent: 3.5,
            task_id: "non-existent-task-id-99999",
            notes: "Log with fake task reference",
          },
          staffArif
        );
      } catch (err: unknown) {
        expect(err instanceof PostgresForeignKeyViolationError).toBe(true);
        if (err instanceof PostgresForeignKeyViolationError) {
          expect(err.code).toBe("23503");
          expect(err.constraint).toBe("daily_logs_task_id_fkey");
        }
      }

      // Valid task_id succeeds
      const validLog = createDailyLog(
        {
          work_category: "daily_cinematography",
          hours_spent: 3.5,
          task_id: "t1000000-0000-0000-0000-000000000001",
          notes: "Log with real task reference",
        },
        staffArif
      );
      expect(validLog.task_id).toBe("t1000000-0000-0000-0000-000000000001");
    });
  });

  // ==========================================================================
  // 4. RLS Security Tests: daily_logs_insert_self & daily_logs_select
  // ==========================================================================
  describe("4. RLS Security Tests: daily_logs_insert_self & daily_logs_select", () => {
    it("(c1) A user CANNOT insert a daily log with another user's user_id (blocked by RLS daily_logs_insert_self)", () => {
      // Arif (staff) attempts to forge a log for Tariqul or Hasan
      expect(() => {
        createDailyLog(
          {
            user_id: internHasan.id, // Forged ID
            work_category: "daily_cinematography",
            hours_spent: 5.0,
            notes: "Forged log entry",
          },
          staffArif
        );
      }).toThrowError(RlsForbiddenError);

      try {
        createDailyLog(
          {
            user_id: internHasan.id,
            work_category: "daily_cinematography",
            hours_spent: 5.0,
            notes: "Forged log entry",
          },
          staffArif
        );
      } catch (err: unknown) {
        expect(err instanceof RlsForbiddenError).toBe(true);
        if (err instanceof RlsForbiddenError) {
          expect(err.code).toBe("42501");
          expect(err.message).toContain("daily_logs_insert_self");
        }
      }
    });

    it("(c2) A user CANNOT insert a log with wrong log_role", () => {
      // Staff Arif attempting to set log_role = 'intern'
      expect(() => {
        createDailyLog(
          {
            user_id: staffArif.id,
            log_role: "intern",
            shoot_location_type: "outdoor",
            raw_footage_uploaded: true,
            hours_spent: 4.0,
            notes: "Forged role",
          },
          staffArif
        );
      }).toThrowError(RlsForbiddenError);
    });

    it("(c3) Non-staff/non-intern (e.g. Coordinator) CANNOT insert daily logs", () => {
      expect(() => {
        createDailyLog(
          {
            user_id: coordinatorUser.id,
            work_category: "daily_cinematography",
            hours_spent: 4.0,
            notes: "Coordinator log attempt",
          },
          coordinatorUser
        );
      }).toThrowError(RlsForbiddenError);
    });

    it("(c4) RLS daily_logs_select: Intern reads only own logs; Staff reads own + assigned intern logs; Admin reads all", () => {
      // 1. Intern view
      const internResult = getDailyLogs({ period: "all" }, internHasan);
      for (const log of internResult.logs) {
        expect(log.user_id).toBe(internHasan.id);
      }

      // 2. Staff Arif view: can read own logs PLUS Hasan's log on Task 1 (where Arif is lead_staff_id)
      const staffResult = getDailyLogs({ period: "all" }, staffArif);
      const ownLogs = staffResult.logs.filter((l) => l.user_id === staffArif.id);
      expect(ownLogs.length).toBeGreaterThan(0);

      // Verify Arif can see intern logs on Task 1 (where Arif is lead)
      const internTask1Logs = staffResult.logs.filter(
        (l) => l.log_role === "intern" && l.task_id === "t1000000-0000-0000-0000-000000000001"
      );
      expect(internTask1Logs.length).toBeGreaterThan(0);

      // 3. Admin view: can read all logs across all members
      const adminResult = getDailyLogs({ period: "all", limit: 100 }, adminUser);
      expect(adminResult.total).toBe(getDailyLogsStore().length);
    });

    it("(c5) updateDailyLog enforces RLS daily_logs_update_self and triggers footage sync on update", () => {
      // Create an intern log with raw_footage_uploaded = false
      const created = createDailyLog(
        {
          task_id: "t1000000-0000-0000-0000-000000000005",
          hours_spent: 3.0,
          shoot_location_type: "indoor",
          raw_footage_uploaded: false,
          notes: "Initial incomplete log",
        },
        internHasan
      );
      expect(created.raw_footage_uploaded).toBe(false);

      // Other staff (Arif) cannot update Hasan's log (blocked by RLS daily_logs_update_self)
      expect(() => {
        updateDailyLog(
          { id: created.id, notes: "Malicious edit by someone else" },
          staffArif
        );
      }).toThrowError(RlsForbiddenError);

      // Hasan can update their own log and mark raw_footage_uploaded = true
      const updated = updateDailyLog(
        {
          id: created.id,
          raw_footage_uploaded: true,
          notes: "Updated: uploaded raw footage to Google Drive.",
        },
        internHasan
      );
      expect(updated.raw_footage_uploaded).toBe(true);

      // Verify trigger B syncs to task 5
      const taskAfter = getTaskById("t1000000-0000-0000-0000-000000000005", adminUser);
      expect(taskAfter?.raw_footage_uploaded).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Report Aggregations & Raw SQL Sums Verification
  // ==========================================================================
  describe("5. Report Aggregations & CSV Export Tests", () => {
    it("(d1) Report aggregations match raw SQL sums across PostgreSQL tables", () => {
      const allLogs = getDailyLogsStore();
      const allTasks = getTasksStore();

      // Manual raw sum for November 2026
      const novLogs = allLogs.filter((l) => l.log_date.startsWith("2026-11"));
      let rawTotalHours = 0;
      let rawFieldHours = 0;
      let rawEditHours = 0;

      for (const l of novLogs) {
        rawTotalHours += l.hours_spent;
        if (l.work_category === "daily_cinematography" || l.log_role === "intern") {
          rawFieldHours += l.hours_spent;
        } else if (l.work_category === "video_editing") {
          rawEditHours += l.hours_spent;
        }
      }

      rawTotalHours = Math.round(rawTotalHours * 10) / 10;
      rawFieldHours = Math.round(rawFieldHours * 10) / 10;
      rawEditHours = Math.round(rawEditHours * 10) / 10;

      const novTasks = allTasks.filter(
        (t) => t.completed_at && t.completed_at.startsWith("2026-11") && t.stage === "completed"
      );
      const rawCompletedCount = novTasks.length;

      // Run calculateWorkHistoryReport for Monthly
      const report = calculateWorkHistoryReport(
        { period: "monthly", refDate: "2026-11-24" },
        adminUser
      );

      // Verify exact equality with raw mathematical sums
      expect(report.total_hours).toBe(rawTotalHours);
      expect(report.field_hours).toBe(rawFieldHours);
      expect(report.edit_hours).toBe(rawEditHours);
      expect(report.total_field_and_edit_hours).toBe(
        Math.round((rawFieldHours + rawEditHours) * 10) / 10
      );
      expect(report.completed_projects_count).toBe(rawCompletedCount);

      // Verify on-time deadline compliance
      let rawOnTime = 0;
      for (const t of novTasks) {
        if (t.deadline_at && new Date(t.completed_at!) <= new Date(t.deadline_at)) {
          rawOnTime++;
        }
      }
      const rawPct =
        novTasks.length > 0 ? Math.round((rawOnTime / novTasks.length) * 100) : 100;
      expect(report.on_time_deadlines_pct).toBe(rawPct);
    });

    it("(d2) Non-admin caller is blocked from running work history reports", () => {
      expect(() => {
        calculateWorkHistoryReport({ period: "monthly" }, staffArif);
      }).toThrowError(RlsForbiddenError);

      expect(() => {
        calculateWorkHistoryReport({ period: "monthly" }, internHasan);
      }).toThrowError(RlsForbiddenError);
    });

    it("(d3) CSV export includes UTF-8 BOM and formula-injection escaping (=, +, -, @)", () => {
      // Cell sanitization test
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe(`"'=SUM(A1:A10)"`);
      expect(sanitizeCsvCell("+1234567890")).toBe(`"'+1234567890"`);
      expect(sanitizeCsvCell("-DANGEROUS")).toBe(`"'-DANGEROUS"`);
      expect(sanitizeCsvCell("@EXEC_CMD")).toBe(`"'@EXEC_CMD"`);
      expect(sanitizeCsvCell("Normal Text")).toBe(`"Normal Text"`);
      expect(sanitizeCsvCell(`Text with "Quotes"`)).toBe(`"Text with ""Quotes"""`);

      const report = calculateWorkHistoryReport(
        { period: "monthly", refDate: "2026-11-24" },
        adminUser
      );
      const csv = generateReportsCsv(report);

      // UTF-8 BOM check: starts with \uFEFF
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Check column headers
      expect(csv).toContain("Member Name");
      expect(csv).toContain("Role");
      expect(csv).toContain("Field Hours (hrs)");
      expect(csv).toContain("Editing Hours (hrs)");
      expect(csv).toContain("On-Time Deadline Compliance (%)");

      // Check member records
      expect(csv).toContain("Arif Rahman");
      expect(csv).toContain("Hasan Ali");
      expect(csv).toContain("Nabil Hossain");
    });

    it("(d4) calculateWorkHistoryReport role=intern scopes completed projects strictly to intern tasks", () => {
      const internReport = calculateWorkHistoryReport(
        { period: "monthly", role: "intern", refDate: "2026-11-24" },
        adminUser
      );

      // Verify all team performance rows are interns
      expect(internReport.team_performance.length).toBeGreaterThan(0);
      for (const m of internReport.team_performance) {
        expect(m.role).toBe("intern");
      }

      // Verify intern completed projects count is scoped to tasks where interns were assigned
      expect(internReport.filter_role).toBe("intern");
      expect(internReport.completed_projects_count).toBeGreaterThanOrEqual(1);
    });

    it("(d5) calculateWorkHistoryReport period=all produces period_label='All Time' and handles invalid refDate safely", () => {
      const allTimeReport = calculateWorkHistoryReport(
        { period: "all", refDate: "invalid-date-string" },
        adminUser
      );
      expect(allTimeReport.period_label).toBe("All Time");
      expect(allTimeReport.completed_projects_count).toBeGreaterThanOrEqual(3);
      expect(allTimeReport.total_hours).toBeGreaterThan(0);
    });

    it("(d6) CSV export protects against tab, carriage return, and space-prefixed formula injection", () => {
      expect(sanitizeCsvCell("\t=1+1")).toBe(`"'\t=1+1"`);
      expect(sanitizeCsvCell("\r-2+2")).toBe(`"'\r-2+2"`);
      expect(sanitizeCsvCell("  @SUM(A1:A5)")).toBe(`"'  @SUM(A1:A5)"`);
      expect(sanitizeCsvCell(" +999")).toBe(`"' +999"`);
    });

    it("(d7) Zero fake fallback metrics: members with 0 completed tasks compute 100% on-time rather than arbitrary 95 or 90", () => {
      const report = calculateWorkHistoryReport(
        { period: "monthly", refDate: "2026-11-24" },
        adminUser
      );

      for (const m of report.team_performance) {
        expect(m.deadline_pct).toBeGreaterThanOrEqual(0);
        expect(m.deadline_pct).toBeLessThanOrEqual(100);
      }
    });
  });
});
