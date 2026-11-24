import { describe, it, expect, beforeEach } from "vitest";
import {
  getDhakaDateString,
  parseCallTimeToMinutes,
  compareShootChronological,
  getWindowBounds,
  isDateInWindow,
  getCalendarShoots,
  getDashboardKpiData,
} from "@/lib/calendar/store";
import {
  resetRequisitionsForTesting,
  getAllRequisitionsRaw,
  rejectRequisition,
} from "@/lib/requisitions/store";
import { resetTasksForTesting, getTasksStore, approveAndAssignTask } from "@/lib/tasks/store";
import { resetGearForTesting, getAllGearItemsRaw } from "@/lib/gear/store";
import { DEMO_USERS } from "@/lib/auth/demo-users";

describe("Step 7 (S7-01): Master Calendar & Live Dashboard Aggregation Engine", () => {
  const adminUser = DEMO_USERS["admin@assdi.org"];
  const coordinatorAoc = DEMO_USERS["aoc@assdi.org"];

  beforeEach(() => {
    resetRequisitionsForTesting();
    resetTasksForTesting();
    resetGearForTesting({ withMockupSeed: true });
  });

  // ==========================================================================
  // 1. ASIA/DHAKA TIMEZONE & CHRONOLOGICAL SORTING UNIT TESTS
  // ==========================================================================
  describe("1. Asia/Dhaka Timezone & Chronological Sort Utilities", () => {
    it("computes Asia/Dhaka date format YYYY-MM-DD correctly", () => {
      const dhakaDateStr = getDhakaDateString();
      expect(dhakaDateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify explicit UTC timestamp on boundary: 18:30 UTC -> next day in Dhaka (+6h)
      const lateUtcDate = new Date("2026-11-24T19:00:00Z");
      const dhakaBoundStr = getDhakaDateString(lateUtcDate);
      expect(dhakaBoundStr).toBe("2026-11-25"); // 19:00 UTC = 01:00 AM next day Dhaka
    });

    it("parses 12-hour AM/PM and 24-hour call times into accurate minutes from midnight", () => {
      expect(parseCallTimeToMinutes("12:00 AM")).toBe(0);
      expect(parseCallTimeToMinutes("08:30 AM")).toBe(510);
      expect(parseCallTimeToMinutes("09:00 AM")).toBe(540);
      expect(parseCallTimeToMinutes("09:30 AM")).toBe(570);
      expect(parseCallTimeToMinutes("11:45 AM")).toBe(705);
      expect(parseCallTimeToMinutes("12:00 PM")).toBe(720);
      expect(parseCallTimeToMinutes("01:15 PM")).toBe(795);
      expect(parseCallTimeToMinutes("02:00 PM")).toBe(840);
      expect(parseCallTimeToMinutes("03:30 PM")).toBe(930);
      expect(parseCallTimeToMinutes("11:59 PM")).toBe(1439);
      expect(parseCallTimeToMinutes(null)).toBe(0);
      expect(parseCallTimeToMinutes("")).toBe(0);
    });

    it("sorts same-day shoots chronologically ascending by call time", () => {
      const shootA = { shoot_date: "2026-11-25", call_time: "02:00 PM" };
      const shootB = { shoot_date: "2026-11-25", call_time: "09:00 AM" };
      const shootC = { shoot_date: "2026-11-25", call_time: "11:30 AM" };
      const shootD = { shoot_date: "2026-11-25", call_time: "08:15 AM" };

      const list = [shootA, shootB, shootC, shootD];
      list.sort(compareShootChronological);

      expect(list.map((s) => s.call_time)).toEqual([
        "08:15 AM",
        "09:00 AM",
        "11:30 AM",
        "02:00 PM",
      ]);
    });

    it("sorts multi-day shoots strictly by shoot_date ascending first, then call_time", () => {
      const shoot1 = { shoot_date: "2026-11-26", call_time: "09:00 AM" };
      const shoot2 = { shoot_date: "2026-11-25", call_time: "03:00 PM" };
      const shoot3 = { shoot_date: "2026-11-25", call_time: "09:30 AM" };
      const shoot4 = { shoot_date: "2026-11-27", call_time: "10:00 AM" };

      const list = [shoot1, shoot2, shoot3, shoot4];
      list.sort(compareShootChronological);

      expect(list).toEqual([
        { shoot_date: "2026-11-25", call_time: "09:30 AM" },
        { shoot_date: "2026-11-25", call_time: "03:00 PM" },
        { shoot_date: "2026-11-26", call_time: "09:00 AM" },
        { shoot_date: "2026-11-27", call_time: "10:00 AM" },
      ]);
    });
  });

  // ==========================================================================
  // 2. DATE WINDOW BOUNDARIES (Tomorrow, Next 3 Days, Next 7 Days)
  // ==========================================================================
  describe("2. Date Window Calculation in Asia/Dhaka", () => {
    const fixedRefDate = "2026-11-24"; // Reference: Tuesday, Nov 24, 2026

    it("computes exact window bounds for Tomorrow, Next 3 Days, and Next 7 Days", () => {
      const bounds = getWindowBounds(fixedRefDate);
      expect(bounds.todayStr).toBe("2026-11-24");
      expect(bounds.tomorrowStr).toBe("2026-11-25");
      expect(bounds.next3DaysEndStr).toBe("2026-11-27");
      expect(bounds.next7DaysEndStr).toBe("2026-12-01");
    });

    it("verifies 'tomorrow' window strictly matches tomorrow's date ONLY", () => {
      expect(isDateInWindow("2026-11-23", "tomorrow", fixedRefDate)).toBe(false); // Yesterday
      expect(isDateInWindow("2026-11-24", "tomorrow", fixedRefDate)).toBe(false); // Today
      expect(isDateInWindow("2026-11-25", "tomorrow", fixedRefDate)).toBe(true);  // Tomorrow (Match)
      expect(isDateInWindow("2026-11-26", "tomorrow", fixedRefDate)).toBe(false); // Day +2
      expect(isDateInWindow("2026-11-27", "tomorrow", fixedRefDate)).toBe(false); // Day +3
      expect(isDateInWindow("2026-12-01", "tomorrow", fixedRefDate)).toBe(false); // Day +7
    });

    it("verifies 'next_3_days' window matches today through day +3", () => {
      expect(isDateInWindow("2026-11-23", "next_3_days", fixedRefDate)).toBe(false); // Past
      expect(isDateInWindow("2026-11-24", "next_3_days", fixedRefDate)).toBe(true);  // Today
      expect(isDateInWindow("2026-11-25", "next_3_days", fixedRefDate)).toBe(true);  // Tomorrow
      expect(isDateInWindow("2026-11-26", "next_3_days", fixedRefDate)).toBe(true);  // Day +2
      expect(isDateInWindow("2026-11-27", "next_3_days", fixedRefDate)).toBe(true);  // Day +3
      expect(isDateInWindow("2026-11-28", "next_3_days", fixedRefDate)).toBe(false); // Day +4 (Out)
      expect(isDateInWindow("2026-12-01", "next_3_days", fixedRefDate)).toBe(false); // Day +7 (Out)
    });

    it("verifies 'next_7_days' window matches today through day +7", () => {
      expect(isDateInWindow("2026-11-23", "next_7_days", fixedRefDate)).toBe(false); // Past
      expect(isDateInWindow("2026-11-24", "next_7_days", fixedRefDate)).toBe(true);  // Today
      expect(isDateInWindow("2026-11-25", "next_7_days", fixedRefDate)).toBe(true);  // Tomorrow
      expect(isDateInWindow("2026-11-27", "next_7_days", fixedRefDate)).toBe(true);  // Day +3
      expect(isDateInWindow("2026-11-30", "next_7_days", fixedRefDate)).toBe(true);  // Day +6
      expect(isDateInWindow("2026-12-01", "next_7_days", fixedRefDate)).toBe(true);  // Day +7 (In)
      expect(isDateInWindow("2026-12-02", "next_7_days", fixedRefDate)).toBe(false); // Day +8 (Out)
    });
  });

  // ==========================================================================
  // 3. MASTER CALENDAR ENRICHMENT & SHOOT SLIP DERIVATION
  // ==========================================================================
  describe("3. Master Calendar Shoots Query & Slip Integration", () => {
    const fixedRefDate = "2026-11-24";

    it("returns chronological shoots for 'tomorrow' (Nov 25, 2026)", () => {
      const tomorrowShoots = getCalendarShoots({
        window: "tomorrow",
        user: adminUser,
        refDate: fixedRefDate,
      });

      expect(tomorrowShoots.length).toBeGreaterThanOrEqual(1);

      // Verify all returned shoots have shoot_date = 2026-11-25
      for (const s of tomorrowShoots) {
        expect(s.shoot_date).toBe("2026-11-25");
      }

      // Verify chronological sort
      for (let i = 0; i < tomorrowShoots.length - 1; i++) {
        const timeA = parseCallTimeToMinutes(tomorrowShoots[i].call_time);
        const timeB = parseCallTimeToMinutes(tomorrowShoots[i + 1].call_time);
        expect(timeA).toBeLessThanOrEqual(timeB);
      }
    });

    it("enriches calendar shoot cards with full Slip details, Lead, and Gear list", () => {
      const shoots = getCalendarShoots({
        window: "next_7_days",
        user: adminUser,
        refDate: fixedRefDate,
      });

      expect(shoots.length).toBeGreaterThanOrEqual(2);

      const firstShoot = shoots[0];
      expect(firstShoot.id).toBeDefined();
      expect(firstShoot.course_name).toBeDefined();
      expect(firstShoot.venue_name).toBeDefined();
      expect(firstShoot.call_time).toBeDefined();
      expect(firstShoot.slip).toBeDefined();
      expect(firstShoot.slip.slip_number).toMatch(/^#\d{3}$/);
      expect(firstShoot.slip.whatsapp_url).toContain("https://wa.me/?text=");
    });

    it("enforces RLS isolation: Course Coordinator only sees their own course shoots", () => {
      const coordinatorShoots = getCalendarShoots({
        window: "next_7_days",
        user: coordinatorAoc,
        refDate: fixedRefDate,
      });

      // Coordinator course is "c1000000-0000-0000-0000-000000000007" (The Art of Creation)
      for (const shoot of coordinatorShoots) {
        expect(shoot.course_id).toBe("c1000000-0000-0000-0000-000000000007");
        expect(shoot.course_name).toBe("The Art of Creation");
      }
    });
  });

  // ==========================================================================
  // 4. LIVE DASHBOARD KPI AGGREGATION ENGINE
  // ==========================================================================
  describe("4. Live Dashboard KPI Aggregation Accuracy", () => {
    const fixedRefDate = "2026-11-24";

    it("aggregates exact live KPI counts from PostgreSQL stores (Zero Dummy Numbers)", () => {
      const dashboard = getDashboardKpiData(adminUser, fixedRefDate);

      // Live Pending Requisitions
      const rawReqs = getAllRequisitionsRaw();
      const expectedPending = rawReqs.filter((r) => r.status === "pending").length;
      expect(dashboard.pending_requisitions_count).toBe(expectedPending);

      // Live Active Tasks (stage != 'completed')
      const rawTasks = getTasksStore();
      const expectedActive = rawTasks.filter((t) => t.stage !== "completed").length;
      expect(dashboard.active_tasks_count).toBe(expectedActive);

      // Live Gear Status KPI
      const rawGear = getAllGearItemsRaw();
      const expectedInUse = rawGear.filter((g) => g.status === "in_use").length;
      const expectedMaint = rawGear.filter((g) => g.status === "maintenance").length;
      const expectedAvail = rawGear.filter((g) => g.status === "available").length;

      expect(dashboard.gear_kpi.total).toBe(rawGear.length);
      expect(dashboard.gear_kpi.in_use).toBe(expectedInUse);
      expect(dashboard.gear_kpi.maintenance).toBe(expectedMaint);
      expect(dashboard.gear_kpi.available).toBe(expectedAvail);

      // Live Task Board Progress counts
      const assignedCount = rawTasks.filter(
        (t) => t.stage === "shoot_assigned" || t.stage === "shoot_done"
      ).length;
      const editingCount = rawTasks.filter((t) => t.stage === "editing").length;
      const reviewCount = rawTasks.filter((t) => t.stage === "review").length;
      const completedCount = rawTasks.filter((t) => t.stage === "completed").length;

      expect(dashboard.task_board_progress.assigned).toBe(assignedCount);
      expect(dashboard.task_board_progress.editing).toBe(editingCount);
      expect(dashboard.task_board_progress.review).toBe(reviewCount);
      expect(dashboard.task_board_progress.completed).toBe(completedCount);
      expect(dashboard.task_board_progress.total).toBe(rawTasks.length);
    });

    it("prioritizes Emergency Overrides in Course Requisitions Approval Queue", () => {
      const dashboard = getDashboardKpiData(adminUser, fixedRefDate);
      const queue = dashboard.approval_queue;

      if (queue.length > 0) {
        // First item should be the emergency override if one exists
        const hasOverride = queue.some((r) => r.is_emergency_override);
        if (hasOverride) {
          expect(queue[0].is_emergency_override).toBe(true);
          expect(queue[0].override_reason).toBeTruthy();
        }
      }
    });

    it("updates KPIs dynamically when a requisition is approved and assigned", () => {
      const initialDashboard = getDashboardKpiData(adminUser, fixedRefDate);
      const initialPending = initialDashboard.pending_requisitions_count;
      const initialActive = initialDashboard.active_tasks_count;

      // Find pending requisition: r10 (SBMC Bakery Reel)
      const targetReq = initialDashboard.approval_queue.find(
        (r) => r.id === "r1000000-0000-0000-0000-000000000010"
      );
      expect(targetReq).toBeDefined();

      // Approve & Assign
      approveAndAssignTask(
        {
          requisition_id: targetReq!.id,
          lead_staff_id: "00000000-0000-0000-0000-000000000007", // Arif Rahman
          assignee_ids: [
            "00000000-0000-0000-0000-000000000007",
            "00000000-0000-0000-0000-000000000004",
          ],
          deadline_at: "2026-11-28T18:00:00Z",
          gear_ids: ["g1000000-0000-0000-0000-000000000005"], // Sony A7C
        },
        adminUser
      );

      // Re-fetch KPIs
      const updatedDashboard = getDashboardKpiData(adminUser, fixedRefDate);

      // Pending count must decrement by 1
      expect(updatedDashboard.pending_requisitions_count).toBe(initialPending - 1);
      // Active tasks must remain active (stage shoot_assigned)
      expect(updatedDashboard.active_tasks_count).toBeGreaterThanOrEqual(initialActive);
      // Gear in_use must increment
      expect(updatedDashboard.gear_kpi.in_use).toBe(initialDashboard.gear_kpi.in_use + 1);
    });

    it("updates KPIs dynamically when a requisition is rejected with mandatory reason", () => {
      const initialDashboard = getDashboardKpiData(adminUser, fixedRefDate);
      const initialPending = initialDashboard.pending_requisitions_count;

      // Find pending requisition: r7 (Professional Cooking Emergency)
      const targetReq = initialDashboard.approval_queue.find(
        (r) => r.id === "r1000000-0000-0000-0000-000000000007"
      );
      expect(targetReq).toBeDefined();

      // Reject with mandatory reason
      rejectRequisition(
        targetReq!.id,
        "Crew fully occupied with RAC orientation shoot.",
        adminUser
      );

      const updatedDashboard = getDashboardKpiData(adminUser, fixedRefDate);

      // Pending count must decrement by 1
      expect(updatedDashboard.pending_requisitions_count).toBe(initialPending - 1);
      // Item must disappear from approval queue
      const stillInQueue = updatedDashboard.approval_queue.some((r) => r.id === targetReq!.id);
      expect(stillInQueue).toBe(false);
    });
  });
});
