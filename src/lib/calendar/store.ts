import { parseISO, addDays, format } from "date-fns";
import type {
  ProgramType,
  FramingType,
  TaskStage,
} from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import type { CalendarWindow } from "@/lib/validations/calendar";
import { PROGRAM_TYPE_LABELS } from "@/lib/validations/requisitions";
import {
  getAllRequisitionsRaw,
  type RequisitionItem,
  MASTER_VENUES,
} from "@/lib/requisitions/store";
import {
  getTasksStore,
  getAssigneesStore,
  deriveShootSlipData,
  type TaskItem,
  type ShootSlipData,
  type TaskAssigneeDetail,
} from "@/lib/tasks/store";
import {
  getAllGearItemsRaw,
  getAllBookings,
  type GearItem,
  type GearBooking,
} from "@/lib/gear/store";
import { DEMO_COURSES, getDemoUserById } from "@/lib/auth/demo-users";

// ----------------------------------------------------------------------------
// 1. Pure Date & Chronological Sorting Helpers (Asia/Dhaka Timezone)
// ----------------------------------------------------------------------------

/**
 * Returns current date string (YYYY-MM-DD) in Asia/Dhaka time zone.
 * Uses formatToParts for deterministic cross-environment YYYY-MM-DD output.
 */
export function getDhakaDateString(date: Date | string = new Date()): string {
  let targetDate: Date;
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    targetDate = new Date(trimmed);
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date();
    }
  } else {
    targetDate = date;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(targetDate);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (year && month && day) {
    return `${year}-${month}-${day}`;
  }
  return format(targetDate, "yyyy-MM-dd");
}

/**
 * Parses call time string (e.g. "09:00 AM", "02:30 PM", "14:00") into minutes from midnight.
 */
export function parseCallTimeToMinutes(callTime: string | null | undefined): number {
  if (!callTime) return 0;
  const str = callTime.trim().toUpperCase();
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  const clean = str.replace(/[^\d:]/g, "");
  const parts = clean.split(":");
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Compares two shoot items chronologically:
 * 1. shoot_date ascending (e.g. 2026-11-24 < 2026-11-25)
 * 2. call_time ascending (e.g. 09:00 AM < 11:00 AM < 02:00 PM)
 * 3. course_name / id deterministic tie-breaker
 */
export function compareShootChronological(
  a: { shoot_date: string; call_time: string; course_name?: string; id?: string },
  b: { shoot_date: string; call_time: string; course_name?: string; id?: string }
): number {
  const dateDiff = a.shoot_date.localeCompare(b.shoot_date);
  if (dateDiff !== 0) return dateDiff;
  const timeDiff = parseCallTimeToMinutes(a.call_time) - parseCallTimeToMinutes(b.call_time);
  if (timeDiff !== 0) return timeDiff;
  return (a.course_name || a.id || "").localeCompare(b.course_name || b.id || "");
}

export interface WindowBounds {
  todayStr: string;
  tomorrowStr: string;
  next3DaysEndStr: string;
  next7DaysEndStr: string;
}

/**
 * Computes exact Asia/Dhaka calendar window date boundaries.
 */
export function getWindowBounds(refDate: Date | string = new Date()): WindowBounds {
  const todayStr = getDhakaDateString(refDate);
  const baseDate = parseISO(todayStr);
  const safeBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const safeTodayStr = format(safeBaseDate, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(safeBaseDate, 1), "yyyy-MM-dd");
  const next3DaysEndStr = format(addDays(safeBaseDate, 3), "yyyy-MM-dd");
  const next7DaysEndStr = format(addDays(safeBaseDate, 7), "yyyy-MM-dd");

  return {
    todayStr: safeTodayStr,
    tomorrowStr,
    next3DaysEndStr,
    next7DaysEndStr,
  };
}

/**
 * Checks if a given shoot_date falls inside the specified calendar window.
 */
export function isDateInWindow(
  shootDate: string,
  windowType: CalendarWindow,
  refDate: Date | string = new Date()
): boolean {
  const bounds = getWindowBounds(refDate);

  if (windowType === "tomorrow") {
    return shootDate === bounds.tomorrowStr;
  }
  if (windowType === "next_3_days") {
    // Current shoots and next 3 days
    return shootDate >= bounds.todayStr && shootDate <= bounds.next3DaysEndStr;
  }
  if (windowType === "next_7_days") {
    // Current shoots and next 7 days
    return shootDate >= bounds.todayStr && shootDate <= bounds.next7DaysEndStr;
  }

  return false;
}

// ----------------------------------------------------------------------------
// 2. Data Types for Calendar & Dashboard
// ----------------------------------------------------------------------------

export interface CalendarShootItem {
  id: string; // task id
  task_id: string;
  requisition_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  program_type: ProgramType;
  program_type_label: string;
  format_duration: string;
  framing_type: FramingType;
  venue_id: string;
  venue_name: string;
  shoot_date: string;
  call_time: string;
  coordinator_name: string;
  coordinator_phone: string;
  stage: TaskStage;
  stage_label: string;
  lead_name: string;
  lead_phone: string;
  assignees: TaskAssigneeDetail[];
  gear_bookings: GearBooking[];
  gear_items: {
    id: string;
    name: string;
    serial_number: string;
    category: string;
  }[];
  gear_summary: string;
  is_emergency_override: boolean;
  override_reason: string | null;
  slip: ShootSlipData;
}

export interface DashboardKpiData {
  pending_requisitions_count: number;
  active_tasks_count: number;
  gear_kpi: {
    total: number;
    available: number;
    in_use: number;
    maintenance: number;
  };
  task_board_progress: {
    assigned: number;
    editing: number;
    review: number;
    completed: number;
    total: number;
  };
  approval_queue: RequisitionItem[];
  gear_stock_live: Array<
    GearItem & {
      current_booking?: GearBooking | null;
      assigned_to?: string | null;
    }
  >;
  calendar_preview_next_7_days: CalendarShootItem[];
  dhaka_today: string;
}

// ----------------------------------------------------------------------------
// 3. Helper: Map Task Stage to Display Label
// ----------------------------------------------------------------------------
function getStageLabel(stage: TaskStage): string {
  switch (stage) {
    case "pending":
      return "Pending";
    case "shoot_assigned":
      return "Shoot Assigned";
    case "shoot_done":
      return "Shoot Done";
    case "editing":
      return "Editing";
    case "review":
      return "Review";
    case "completed":
      return "Completed";
    default:
      return stage;
  }
}

// ----------------------------------------------------------------------------
// 4. Query All Calendar Shoots
// ----------------------------------------------------------------------------
export function getCalendarShoots({
  window,
  user,
  refDate,
}: {
  window?: CalendarWindow;
  user?: UserProfile;
  refDate?: Date | string;
} = {}): CalendarShootItem[] {
  const allReqs = getAllRequisitionsRaw();
  const allTasks = getTasksStore();
  const allAssignees = getAssigneesStore();
  const allBookings = getAllBookings();
  const allGear = getAllGearItemsRaw();

  // Find all shoots:
  // An approved requisition or a task with requisition link
  const shoots: CalendarShootItem[] = [];

  for (const task of allTasks) {
    const req = allReqs.find((r) => r.id === task.requisition_id);
    if (!req || req.status === "rejected") continue;

    // RLS: Coordinator can only see shoots for their own course
    if (user?.role === "coordinator" && req.course_id !== user.course_id) {
      continue;
    }

    const course = DEMO_COURSES.find((c) => c.id === req.course_id);
    const venue = MASTER_VENUES.find((v) => v.id === req.venue_id);

    // Assignees
    const taskAssignees = allAssignees.filter((a) => a.task_id === task.id);
    const assigneesDetail: TaskAssigneeDetail[] = [];
    let leadName = "Unassigned";
    let leadPhone = "";

    for (const a of taskAssignees) {
      const u = getDemoUserById(a.user_id);
      if (u) {
        assigneesDetail.push({
          user_id: u.id,
          full_name: u.full_name,
          phone: u.phone,
          role: u.role,
          assignment_role: a.assignment_role,
        });
        if (a.assignment_role === "lead" || u.id === task.lead_staff_id) {
          leadName = u.full_name;
          leadPhone = u.phone;
        }
      }
    }

    // Bookings & Gear
    const bookings = allBookings.filter(
      (b) => b.task_id === task.id && !b.returned_at
    );
    const gearItems = allGear
      .filter((g) => bookings.some((b) => b.gear_id === g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        serial_number: g.serial_number,
        category: g.category,
      }));

    const gearSummary =
      gearItems.length > 0
        ? gearItems.map((g) => `${g.name} (${g.serial_number})`).join(", ")
        : "No gear assigned";

    const slip = deriveShootSlipData(task, req, taskAssignees);
    const progType = req.program_type || "visitor_reel";
    const progLabel = PROGRAM_TYPE_LABELS[progType]?.en || progType;

    shoots.push({
      id: task.id,
      task_id: task.id,
      requisition_id: req.id,
      course_id: req.course_id,
      course_name: course?.name || req.course_name || "The Art of Creation",
      course_code: course?.code || req.course_code || "AOC",
      program_type: progType,
      program_type_label: progLabel,
      format_duration: req.format_duration || "30-40s Reel",
      framing_type: req.framing_type || "vertical_9_16",
      venue_id: req.venue_id,
      venue_name: venue?.name || req.venue_name || "50 Katha Campus",
      shoot_date: req.shoot_date,
      call_time: req.call_time,
      coordinator_name: req.coordinator_name || "Muhammad Abdullah",
      coordinator_phone: req.coordinator_phone || "01711000002",
      stage: task.stage,
      stage_label: getStageLabel(task.stage),
      lead_name: leadName,
      lead_phone: leadPhone,
      assignees: assigneesDetail,
      gear_bookings: bookings,
      gear_items: gearItems,
      gear_summary: gearSummary,
      is_emergency_override: req.is_emergency_override,
      override_reason: req.override_reason,
      slip,
    });
  }

  // Also include approved requisitions that don't have a task record yet (if any)
  for (const req of allReqs) {
    if (req.status !== "approved") continue;
    if (shoots.some((s) => s.requisition_id === req.id)) continue;

    if (user?.role === "coordinator" && req.course_id !== user.course_id) {
      continue;
    }

    const course = DEMO_COURSES.find((c) => c.id === req.course_id);
    const venue = MASTER_VENUES.find((v) => v.id === req.venue_id);
    const progType = req.program_type || "visitor_reel";
    const progLabel = PROGRAM_TYPE_LABELS[progType]?.en || progType;

    // Dummy task stub for slip derivation
    const taskStub: TaskItem = {
      id: `task-req-${req.id}`,
      requisition_id: req.id,
      stage: "shoot_assigned",
      lead_staff_id: null,
      deadline_at: null,
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: req.created_at,
      updated_at: req.updated_at,
    };
    const slip = deriveShootSlipData(taskStub, req, []);

    shoots.push({
      id: taskStub.id,
      task_id: taskStub.id,
      requisition_id: req.id,
      course_id: req.course_id,
      course_name: course?.name || req.course_name || "Course Shoot",
      course_code: course?.code || req.course_code || "",
      program_type: progType,
      program_type_label: progLabel,
      format_duration: req.format_duration,
      framing_type: req.framing_type,
      venue_id: req.venue_id,
      venue_name: venue?.name || req.venue_name || "Campus",
      shoot_date: req.shoot_date,
      call_time: req.call_time,
      coordinator_name: req.coordinator_name || "",
      coordinator_phone: req.coordinator_phone || "",
      stage: "shoot_assigned",
      stage_label: "Shoot Assigned",
      lead_name: "Unassigned",
      lead_phone: "",
      assignees: [],
      gear_bookings: [],
      gear_items: [],
      gear_summary: "No gear assigned",
      is_emergency_override: req.is_emergency_override,
      override_reason: req.override_reason,
      slip,
    });
  }

  // Filter by window if requested
  let filtered = shoots;
  if (window) {
    filtered = filtered.filter((s) => isDateInWindow(s.shoot_date, window, refDate));
  }

  // Sort chronologically ascending
  filtered.sort(compareShootChronological);

  return filtered;
}

// ----------------------------------------------------------------------------
// 5. Query Live Dashboard KPI & Panel Data
// ----------------------------------------------------------------------------
export function getDashboardKpiData(
  user?: UserProfile,
  refDate: Date | string = new Date()
): DashboardKpiData {
  const allReqs = getAllRequisitionsRaw();
  const allTasks = getTasksStore();
  const allGear = getAllGearItemsRaw();
  const allBookings = getAllBookings();

  // 1. Pending Requisitions count (enriched with course and venue names)
  const pendingReqs = allReqs
    .filter((r) => r.status === "pending")
    .map((r) => {
      const course = DEMO_COURSES.find((c) => c.id === r.course_id);
      const venue = MASTER_VENUES.find((v) => v.id === r.venue_id);
      return {
        ...r,
        course_name: course?.name || r.course_name || "Unknown Course",
        course_code: course?.code || r.course_code || "",
        venue_name: venue?.name || r.venue_name || "Unknown Venue",
      };
    });
  // Prioritize emergency overrides first, then newest
  pendingReqs.sort((a, b) => {
    if (a.is_emergency_override && !b.is_emergency_override) return -1;
    if (!a.is_emergency_override && b.is_emergency_override) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  // 2. Active Tasks count (stage !== 'completed')
  const activeTasks = allTasks.filter((t) => t.stage !== "completed");

  // 3. Gear Status Breakdown
  let inUseCount = 0;
  let maintenanceCount = 0;
  let availableCount = 0;

  for (const g of allGear) {
    if (g.status === "in_use") inUseCount++;
    else if (g.status === "maintenance") maintenanceCount++;
    else availableCount++;
  }

  // 4. Task Board Progress breakdown
  let assignedCount = 0;
  let editingCount = 0;
  let reviewCount = 0;
  let completedCount = 0;

  for (const t of allTasks) {
    if (t.stage === "shoot_assigned" || t.stage === "shoot_done") {
      assignedCount++;
    } else if (t.stage === "editing") {
      editingCount++;
    } else if (t.stage === "review") {
      reviewCount++;
    } else if (t.stage === "completed") {
      completedCount++;
    }
  }

  // 5. Live Gear Stock rows with booking information
  const gearStockLive = allGear.map((gear) => {
    const booking = allBookings.find(
      (b) => b.gear_id === gear.id && !b.returned_at
    );
    let assignedTo: string | null = null;
    if (booking) {
      const userObj = getDemoUserById(booking.responsible_lead_id);
      assignedTo = userObj?.full_name || "Team Lead";
    }
    return {
      ...gear,
      current_booking: booking || null,
      assigned_to: assignedTo,
    };
  });

  // 6. Master Calendar Preview (Next 7 Days)
  const calendarShoots = getCalendarShoots({
    window: "next_7_days",
    user,
    refDate,
  });

  return {
    pending_requisitions_count: pendingReqs.length,
    active_tasks_count: activeTasks.length,
    gear_kpi: {
      total: allGear.length,
      available: availableCount,
      in_use: inUseCount,
      maintenance: maintenanceCount,
    },
    task_board_progress: {
      assigned: assignedCount,
      editing: editingCount,
      review: reviewCount,
      completed: completedCount,
      total: allTasks.length,
    },
    approval_queue: pendingReqs,
    gear_stock_live: gearStockLive,
    calendar_preview_next_7_days: calendarShoots,
    dhaka_today: typeof refDate === "string" ? refDate : getDhakaDateString(refDate),
  };
}
