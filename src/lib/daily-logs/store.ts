import type {
  StaffWorkCategory,
  ShootLocationType,
} from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import { getInitialDailyLogs } from "./seed-data";
import { getDemoUserById } from "@/lib/auth/demo-users";
import { getTasksStore, syncInternFootageUpload } from "@/lib/tasks/store";
import { getAllRequisitionsRaw } from "@/lib/requisitions/store";
import { getDhakaDateString } from "@/lib/calendar/store";
import { parseISO, startOfWeek, endOfWeek, format } from "date-fns";

// PostgreSQL Error Emulation Classes
export class PostgresCheckConstraintError extends Error {
  code = "23514";
  constraint: string;

  constructor(message: string, constraint: string = "chk_daily_logs") {
    super(message);
    this.name = "PostgresCheckConstraintError";
    this.constraint = constraint;
  }
}

export class RlsForbiddenError extends Error {
  code = "42501";

  constructor(message: string) {
    super(message);
    this.name = "RlsForbiddenError";
  }
}

export interface DailyLogItem {
  id: string;
  user_id: string;
  log_role: "staff" | "intern";
  log_date: string; // YYYY-MM-DD
  task_id: string | null;
  work_category: StaffWorkCategory | null;
  hours_spent: number;
  shoot_location_type: ShootLocationType | null;
  raw_footage_uploaded: boolean | null;
  notes: string;
  created_at: string;
}

export interface EnrichedDailyLog extends DailyLogItem {
  user_name: string;
  user_email: string;
  user_phone: string;
  task_title: string | null;
  course_name: string | null;
}

interface DailyLogsGlobalStore {
  __assdi_daily_logs?: DailyLogItem[];
}

const dailyLogsGlobal = globalThis as unknown as DailyLogsGlobalStore;

export function getDailyLogsStore(): DailyLogItem[] {
  if (!dailyLogsGlobal.__assdi_daily_logs) {
    dailyLogsGlobal.__assdi_daily_logs = getInitialDailyLogs();
  }
  return dailyLogsGlobal.__assdi_daily_logs;
}

export function resetDailyLogsForTesting(): void {
  const logs = getDailyLogsStore();
  logs.length = 0;
  logs.push(...getInitialDailyLogs());
}

/**
 * Enriches a raw DailyLogItem with profile, task, and course information
 */
export function enrichDailyLog(log: DailyLogItem): EnrichedDailyLog {
  const user = getDemoUserById(log.user_id);
  const userName = user?.full_name || "Unknown Member";
  const userEmail = user?.email || "";
  const userPhone = user?.phone || "";

  let taskTitle: string | null = null;
  let courseName: string | null = null;

  if (log.task_id) {
    const task = getTasksStore().find((t) => t.id === log.task_id);
    if (task) {
      const allReqs = getAllRequisitionsRaw();
      const req = allReqs.find((r) => r.id === task.requisition_id);
      if (req) {
        taskTitle = `${req.course_name || "Media"} Shoot`;
        courseName = req.course_name || null;
      } else {
        taskTitle = "Media Production Shoot";
      }
    }
  }

  return {
    ...log,
    user_name: userName,
    user_email: userEmail,
    user_phone: userPhone,
    task_title: taskTitle,
    course_name: courseName,
  };
}

export interface CreateDailyLogParams {
  user_id?: string;
  log_role?: "staff" | "intern";
  log_date?: string;
  task_id?: string | null;
  work_category?: StaffWorkCategory | null;
  hours_spent: number;
  shoot_location_type?: ShootLocationType | null;
  raw_footage_uploaded?: boolean | null;
  notes: string;
}

/**
 * Creates a daily log enforcing:
 * 1. RLS daily_logs_insert_self: user_id = auth.uid() AND log_role = current_user_role() AND current_user_role() IN ('staff', 'intern')
 * 2. DB CHECK chk_staff_log_fields: CHECK (log_role <> 'staff' OR work_category IS NOT NULL)
 * 3. DB CHECK chk_intern_log_fields: CHECK (log_role <> 'intern' OR (shoot_location_type IS NOT NULL AND raw_footage_uploaded IS NOT NULL))
 * 4. DB CHECK hours_spent: CHECK (hours_spent > 0 AND hours_spent <= 24)
 * 5. DB Trigger trg_sync_raw_footage_to_task: if intern + raw_footage_uploaded=true + task_id, syncs to tasks
 */
export function createDailyLog(
  params: CreateDailyLogParams,
  caller: UserProfile
): EnrichedDailyLog {
  // 1. RLS Policy Enforcement: daily_logs_insert_self
  const targetUserId = params.user_id || caller.id;
  const targetRole = params.log_role || caller.role;

  if (
    targetUserId !== caller.id ||
    targetRole !== caller.role ||
    (caller.role !== "staff" && caller.role !== "intern")
  ) {
    throw new RlsForbiddenError(
      "RLS Policy Violation: You can only insert logs for your own account matching your assigned role (daily_logs_insert_self)."
    );
  }

  // 2. CHECK constraint: hours_spent > 0 AND hours_spent <= 24
  const hours = Number(params.hours_spent);
  if (isNaN(hours) || hours <= 0 || hours > 24) {
    throw new PostgresCheckConstraintError(
      `CHECK constraint violation: hours_spent must be greater than 0 and less than or equal to 24 (received ${params.hours_spent}).`,
      "chk_hours_spent"
    );
  }

  // 3. CHECK constraint: notes not empty
  if (!params.notes || params.notes.trim().length === 0) {
    throw new PostgresCheckConstraintError(
      "CHECK constraint violation: notes cannot be empty.",
      "chk_notes_not_empty"
    );
  }

  // 4. Role-specific DB CHECK constraints
  if (caller.role === "staff") {
    if (!params.work_category) {
      throw new PostgresCheckConstraintError(
        "CHECK constraint violation: Staff daily logs require a work_category (chk_staff_log_fields).",
        "chk_staff_log_fields"
      );
    }
  } else if (caller.role === "intern") {
    if (
      !params.shoot_location_type ||
      params.raw_footage_uploaded === undefined ||
      params.raw_footage_uploaded === null
    ) {
      throw new PostgresCheckConstraintError(
        "CHECK constraint violation: Intern daily logs require shoot_location_type and raw_footage_uploaded (chk_intern_log_fields).",
        "chk_intern_log_fields"
      );
    }
  }

  // 5. Build canonical record
  const logDate = params.log_date || getDhakaDateString();
  const newLog: DailyLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    user_id: caller.id,
    log_role: caller.role,
    log_date: logDate,
    task_id: params.task_id || null,
    work_category: caller.role === "staff" ? params.work_category || null : null,
    hours_spent: Math.round(hours * 100) / 100,
    shoot_location_type:
      caller.role === "intern" ? params.shoot_location_type || null : null,
    raw_footage_uploaded:
      caller.role === "intern" ? Boolean(params.raw_footage_uploaded) : null,
    notes: params.notes.trim(),
    created_at: new Date().toISOString(),
  };

  // 6. DB Trigger: trg_sync_raw_footage_to_task
  if (
    newLog.log_role === "intern" &&
    newLog.raw_footage_uploaded === true &&
    newLog.task_id
  ) {
    syncInternFootageUpload(newLog.task_id);
  }

  // 7. Persist to store
  const store = getDailyLogsStore();
  store.unshift(newLog);

  return enrichDailyLog(newLog);
}

export interface GetDailyLogsFilter {
  user_id?: string;
  role?: "all" | "staff" | "intern";
  period?: "daily" | "weekly" | "monthly" | "all";
  refDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDailyLogs {
  logs: EnrichedDailyLog[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Returns filtered and paginated daily logs with RLS daily_logs_select enforcement:
 * - Admin: reads all logs
 * - Staff: reads own logs OR intern logs on tasks where caller is lead_staff_id
 * - Intern: reads only own logs
 */
export function getDailyLogs(
  filter: GetDailyLogsFilter,
  caller: UserProfile
): PaginatedDailyLogs {
  let list = [...getDailyLogsStore()];

  // 1. RLS Policy Enforcement: daily_logs_select
  if (caller.role === "admin") {
    // Admin reads all
  } else if (caller.role === "staff") {
    const tasks = getTasksStore();
    const leadTaskIds = new Set(
      tasks.filter((t) => t.lead_staff_id === caller.id).map((t) => t.id)
    );

    list = list.filter((log) => {
      if (log.user_id === caller.id) return true;
      if (
        log.log_role === "intern" &&
        log.task_id &&
        leadTaskIds.has(log.task_id)
      ) {
        return true;
      }
      return false;
    });
  } else if (caller.role === "intern") {
    list = list.filter((log) => log.user_id === caller.id);
  } else {
    // Other roles have no log access
    list = [];
  }

  // 2. Query Filters: user_id
  if (filter.user_id && filter.user_id !== "all") {
    list = list.filter((log) => log.user_id === filter.user_id);
  }

  // 3. Query Filters: role
  if (filter.role && filter.role !== "all") {
    list = list.filter((log) => log.log_role === filter.role);
  }

  // 4. Query Filters: period in Asia/Dhaka
  const refDateStr = filter.refDate || getDhakaDateString();
  const refDate = parseISO(refDateStr);

  if (filter.period === "daily") {
    list = list.filter((log) => log.log_date === refDateStr);
  } else if (filter.period === "weekly") {
    const weekStartStr = format(
      startOfWeek(refDate, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    const weekEndStr = format(
      endOfWeek(refDate, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    list = list.filter(
      (log) => log.log_date >= weekStartStr && log.log_date <= weekEndStr
    );
  } else if (filter.period === "monthly") {
    const yearMonth = refDateStr.substring(0, 7); // e.g. "2026-11"
    list = list.filter((log) => log.log_date.startsWith(yearMonth));
  }

  // 5. Chronological Sort (latest logs first)
  list.sort((a, b) => {
    const dateComp = b.log_date.localeCompare(a.log_date);
    if (dateComp !== 0) return dateComp;
    return b.created_at.localeCompare(a.created_at);
  });

  const total = list.length;
  const page = Math.max(1, filter.page || 1);
  const limit = Math.max(1, filter.limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const startIndex = (page - 1) * limit;
  const paginatedLogs = list.slice(startIndex, startIndex + limit);

  return {
    logs: paginatedLogs.map(enrichDailyLog),
    total,
    page,
    totalPages,
    limit,
  };
}
