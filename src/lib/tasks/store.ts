import type { TaskStage, AssignmentRole, UserRole } from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import { DEMO_COURSES, getDemoUserById } from "@/lib/auth/demo-users";
import { getInitialTasks, getInitialAssignees } from "./seed-data";
import {
  MASTER_VENUES,
  getAllRequisitionsRaw,
  type RequisitionItem,
} from "@/lib/requisitions/store";
import {
  bookGearBatchForTask,
  getAllBookings,
  getAllGearItemsRaw,
  formatTimeWindow,
  PostgresExclusionError,
  type GearBooking,
  type GearItem,
} from "@/lib/gear/store";
import {
  GOOGLE_DRIVE_URL_REGEX,
  type ApproveAndAssignInput,
  type UpdateTaskStageInput,
  approveAndAssignSchema,
  updateTaskStageSchema,
} from "@/lib/validations/tasks";

// Custom PostgreSQL-like Error Classes
export class PostgresCheckConstraintError extends Error {
  code = "23514";
  constraint = "chk_completed_drive_url";

  constructor(message: string) {
    super(message);
    this.name = "PostgresCheckConstraintError";
  }
}

export class RlsForbiddenError extends Error {
  code = "42501";

  constructor(message: string) {
    super(message);
    this.name = "RlsForbiddenError";
  }
}

export { PostgresExclusionError };

export interface TaskItem {
  id: string;
  requisition_id: string;
  stage: TaskStage;
  lead_staff_id: string | null;
  deadline_at: string | null;
  raw_footage_uploaded: boolean;
  final_drive_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssigneeItem {
  task_id: string;
  user_id: string;
  assignment_role: AssignmentRole;
  assigned_at: string;
}

export interface TaskAssigneeDetail {
  user_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  assignment_role: AssignmentRole;
}

export interface EnrichedTask extends TaskItem {
  course_name: string;
  course_code: string;
  venue_name: string;
  coordinator_name: string;
  coordinator_phone: string;
  program_type: string;
  format_duration: string;
  framing_type: string;
  shoot_date: string;
  call_time: string;
  notes: string | null;
  assignees: TaskAssigneeDetail[];
  lead_name: string;
  lead_phone: string;
  gear_bookings: GearBooking[];
  gear_items: GearItem[];
  gear_summary: string;
  countdown_label: string;
  is_overdue: boolean;
}

export interface ShootSlipData {
  slip_number: string;
  task_id: string;
  course_title: string;
  venue_name: string;
  call_time_formatted: string;
  team_members: {
    name: string;
    phone: string;
    role_label: string;
    is_lead: boolean;
  }[];
  assigned_gear: {
    id: string;
    name: string;
    serial_number: string;
    category: string;
  }[];
  gear_summary: string;
  whatsapp_text: string;
  whatsapp_url: string;
}

// Global Store Persistence
interface TasksGlobalStore {
  __assdi_tasks?: TaskItem[];
  __assdi_task_assignees?: TaskAssigneeItem[];
  __assdi_requisitions?: RequisitionItem[];
}

const tasksGlobal = globalThis as unknown as TasksGlobalStore;
export function getTasksStore(): TaskItem[] {
  if (!tasksGlobal.__assdi_tasks) {
    tasksGlobal.__assdi_tasks = getInitialTasks();
  }
  return tasksGlobal.__assdi_tasks;
}

export function getAssigneesStore(): TaskAssigneeItem[] {
  if (!tasksGlobal.__assdi_task_assignees) {
    tasksGlobal.__assdi_task_assignees = getInitialAssignees();
  }
  return tasksGlobal.__assdi_task_assignees;
}

export function resetTasksForTesting() {
  const tasks = getTasksStore();
  const assignees = getAssigneesStore();
  tasks.length = 0;
  tasks.push(...getInitialTasks());
  assignees.length = 0;
  assignees.push(...getInitialAssignees());
}

// ----------------------------------------------------------------------------
// Helper: Live Deadline Countdown Formatting
// ----------------------------------------------------------------------------
export function calculateDeadlineCountdown(deadlineAt: string | null): {
  label: string;
  isOverdue: boolean;
} {
  if (!deadlineAt) {
    return { label: "No deadline", isOverdue: false };
  }

  const now = Date.now();
  const deadline = new Date(deadlineAt).getTime();
  const diffMs = deadline - now;

  if (diffMs < 0) {
    const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    if (overdueHours < 24) {
      return { label: `Overdue ${overdueHours}h`, isOverdue: true };
    }
    const overdueDays = Math.floor(overdueHours / 24);
    return { label: `Overdue ${overdueDays}d`, isOverdue: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return { label: `Due in ${hours}h`, isOverdue: false };
  }
  const days = Math.floor(hours / 24);
  return { label: `Due in ${days}d`, isOverdue: false };
}

// ----------------------------------------------------------------------------
// Helper: Build Shoot Slip Data
// ----------------------------------------------------------------------------
export function deriveShootSlipData(
  task: TaskItem,
  req?: RequisitionItem | null,
  assignees?: TaskAssigneeItem[]
): ShootSlipData {
  const allReqs = getAllRequisitionsRaw();
  const requisition = req || allReqs.find((r) => r.id === task.requisition_id);

  const course = DEMO_COURSES.find((c) => c.id === requisition?.course_id);
  const venue = MASTER_VENUES.find((v) => v.id === requisition?.venue_id);

  const courseTitle = course
    ? `${course.name} (${requisition?.format_duration || "Reel"})`
    : requisition?.course_name || "The Art of Creation (Reel)";

  const venueName = venue?.name || requisition?.venue_name || "50 Katha Campus";

  // Slip number: #204 matching calendar-slip.jpg
  const numPart = task.id.replace(/[^0-9]/g, "").slice(-3) || "204";
  const slipNumber = `#${numPart.padStart(3, "0")}`;

  // Call Time formatted
  let callTimeFormatted = "Nov 24 • 09:00 AM";
  if (requisition?.shoot_date && requisition?.call_time) {
    try {
      const d = new Date(requisition.shoot_date);
      const monthStr = d.toLocaleDateString("en-US", { month: "short" });
      const dayStr = d.toLocaleDateString("en-US", { day: "numeric" });
      callTimeFormatted = `${monthStr} ${dayStr} • ${requisition.call_time}`;
    } catch {
      callTimeFormatted = `${requisition.shoot_date} • ${requisition.call_time}`;
    }
  }

  // Team Members
  const taskAssigneesList = assignees || getAssigneesStore().filter((a) => a.task_id === task.id);
  const teamMembers: ShootSlipData["team_members"] = [];

  for (const a of taskAssigneesList) {
    const user = getDemoUserById(a.user_id);
    if (user) {
      const isLead = a.assignment_role === "lead" || task.lead_staff_id === user.id;
      teamMembers.push({
        name: user.full_name,
        phone: user.phone,
        role_label: isLead ? "Lead" : user.role === "intern" ? "Intern" : "Member",
        is_lead: isLead,
      });
    }
  }

  // Sort lead first
  teamMembers.sort((a, b) => (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0));

  // Assigned Gear
  const bookings = getAllBookings().filter(
    (b) => b.task_id === task.id && !b.returned_at
  );
  const allGear = getAllGearItemsRaw();
  const assignedGear: ShootSlipData["assigned_gear"] = [];

  for (const b of bookings) {
    const gear = allGear.find((g) => g.id === b.gear_id);
    if (gear) {
      assignedGear.push({
        id: gear.id,
        name: gear.name,
        serial_number: gear.serial_number,
        category: gear.category,
      });
    }
  }

  const gearSummary = assignedGear.length > 0
    ? assignedGear.map((g) => `${g.name} (${g.serial_number})`).join(", ")
    : "No gear assigned";

  // Zero-cost WhatsApp Formatted Message
  const teamText = teamMembers.length > 0
    ? teamMembers.map((m) => `• ${m.name}${m.is_lead ? " (Lead)" : ""} - ${m.phone}`).join("\n")
    : "• Unassigned";

  const gearText = assignedGear.length > 0
    ? assignedGear.map((g) => `• ${g.name} (${g.serial_number})`).join("\n")
    : "• No gear assigned";

  const whatsappText = `*ASSDI MEDIA • SHOOT SLIP ${slipNumber}*\n\n📹 Course: ${courseTitle}\n📍 Venue: ${venueName}\n⏰ Call Time: ${callTimeFormatted}\n\n👥 Team:\n${teamText}\n\n🎥 Assigned Gear:\n${gearText}\n\n_Please arrive 15 minutes before call time._`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return {
    slip_number: slipNumber,
    task_id: task.id,
    course_title: courseTitle,
    venue_name: venueName,
    call_time_formatted: callTimeFormatted,
    team_members: teamMembers,
    assigned_gear: assignedGear,
    gear_summary: gearSummary,
    whatsapp_text: whatsappText,
    whatsapp_url: whatsappUrl,
  };
}

// ----------------------------------------------------------------------------
// Helper: Enrich Task Item for UI & API
// ----------------------------------------------------------------------------
function enrichTask(task: TaskItem): EnrichedTask {
  const allReqs = getAllRequisitionsRaw();
  const req = allReqs.find((r) => r.id === task.requisition_id);

  const course = DEMO_COURSES.find((c) => c.id === req?.course_id);
  const venue = MASTER_VENUES.find((v) => v.id === req?.venue_id);

  // Assignees
  const taskAssignees = getAssigneesStore().filter((a) => a.task_id === task.id);
  const assigneesDetail: TaskAssigneeDetail[] = [];
  let leadName = "Unassigned";
  let leadPhone = "";

  for (const a of taskAssignees) {
    const user = getDemoUserById(a.user_id);
    if (user) {
      assigneesDetail.push({
        user_id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        assignment_role: a.assignment_role,
      });
      if (a.assignment_role === "lead" || user.id === task.lead_staff_id) {
        leadName = user.full_name;
        leadPhone = user.phone;
      }
    }
  }

  // Gear Bookings
  const bookings = getAllBookings().filter(
    (b) => b.task_id === task.id && !b.returned_at
  );
  const allGear = getAllGearItemsRaw();
  const gearItems = allGear.filter((g) => bookings.some((b) => b.gear_id === g.id));
  const gearSummary = gearItems.map((g) => g.name).join(", ") || "No gear assigned";

  const { label: countdownLabel, isOverdue } = calculateDeadlineCountdown(task.deadline_at);

  return {
    ...task,
    course_name: course?.name || req?.course_name || "The Art of Creation",
    course_code: course?.code || req?.course_code || "AOC",
    venue_name: venue?.name || req?.venue_name || "50 Katha Campus",
    coordinator_name: req?.coordinator_name || "Muhammad Abdullah",
    coordinator_phone: req?.coordinator_phone || "01711000002",
    program_type: req?.program_type || "visitor_reel",
    format_duration: req?.format_duration || "30-40s Reel",
    framing_type: req?.framing_type || "vertical_9_16",
    shoot_date: req?.shoot_date || "2026-11-24",
    call_time: req?.call_time || "09:00 AM",
    notes: req?.notes || null,
    assignees: assigneesDetail,
    lead_name: leadName,
    lead_phone: leadPhone,
    gear_bookings: bookings,
    gear_items: gearItems,
    gear_summary: gearSummary,
    countdown_label: countdownLabel,
    is_overdue: isOverdue,
  };
}

// ----------------------------------------------------------------------------
// 1. Get All Tasks (RLS tasks_select_policy)
// ----------------------------------------------------------------------------
export function getAllTasks(user?: UserProfile): EnrichedTask[] {
  let list = getTasksStore();

  if (user) {
    if (user.role === "admin") {
      // Admin reads all
    } else if (user.role === "staff" || user.role === "intern") {
      // Staff/Intern reads assigned tasks or tasks where user is lead
      list = list.filter((t) => {
        const isLead = t.lead_staff_id === user.id;
        const isAssignee = getAssigneesStore().some(
          (a) => a.task_id === t.id && a.user_id === user.id
        );
        return isLead || isAssignee;
      });
    } else if (user.role === "coordinator") {
      // Coordinator reads tasks for their own course
      const allReqs = getAllRequisitionsRaw();
      list = list.filter((t) => {
        const req = allReqs.find((r) => r.id === t.requisition_id);
        return req && req.course_id === user.course_id;
      });
    }
  }

  return list.map(enrichTask);
}

// ----------------------------------------------------------------------------
// 2. Get Single Task By ID
// ----------------------------------------------------------------------------
export function getTaskById(taskId: string, user?: UserProfile): EnrichedTask | null {
  const task = getTasksStore().find((t) => t.id === taskId);
  if (!task) return null;

  // Check RLS select policy
  if (user) {
    if (user.role === "admin") {
      // Allowed
    } else if (user.role === "staff" || user.role === "intern") {
      const isLead = task.lead_staff_id === user.id;
      const isAssignee = getAssigneesStore().some(
        (a) => a.task_id === task.id && a.user_id === user.id
      );
      if (!isLead && !isAssignee) {
        throw new RlsForbiddenError("RLS Policy Violation: You are not assigned to this task (tasks_select_policy).");
      }
    } else if (user.role === "coordinator") {
      const allReqs = getAllRequisitionsRaw();
      const req = allReqs.find((r) => r.id === task.requisition_id);
      if (!req || req.course_id !== user.course_id) {
        throw new RlsForbiddenError("RLS Policy Violation: Task does not belong to your course.");
      }
    }
  }

  return enrichTask(task);
}

// ----------------------------------------------------------------------------
// 3. Atomic Approve & Assign (Admin Only)
// ----------------------------------------------------------------------------
export function approveAndAssignTask(
  input: ApproveAndAssignInput,
  user: UserProfile
): {
  task: EnrichedTask;
  slip: ShootSlipData;
} {
  // 1. RLS admin check
  if (user.role !== "admin") {
    throw new RlsForbiddenError("অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান রিকুইজিশন অনুমোদন ও টিম অ্যাসাইন করতে পারেন।");
  }

  // 2. Validate input schema
  const validated = approveAndAssignSchema.parse(input);

  // 3. Find target requisition
  const allReqs = getAllRequisitionsRaw();
  const req = allReqs.find((r) => r.id === validated.requisition_id);
  if (!req) {
    throw new Error("রিকুইজিশন পাওয়া যায়নি। (Requisition not found)");
  }
  if (req.status === "rejected") {
    throw new Error("বাতিলকৃত রিকুইজিশন অনুমোদন করা সম্ভব নয়।");
  }

  // Determine time window for gear booking
  const shootDate = req.shoot_date || new Date().toISOString().split("T")[0];
  const startIso = `${shootDate}T09:00:00Z`;
  const endIso = `${shootDate}T17:00:00Z`;
  const timeWindow = formatTimeWindow(startIso, endIso);

  // 4. Resolve Lead User and enforce permanent staff role
  const leadUser = getDemoUserById(validated.lead_staff_id);
  if (!leadUser) {
    throw new Error("নির্ধারিত টিম লিডকে ব্যবহারকারী তালিকায় পাওয়া যায়নি।");
  }
  if (leadUser.role !== "staff") {
    throw new Error(
      "প্রজেক্ট লিড অবশ্যই একজন পার্মানেন্ট স্টাফ সদস্য হতে হবে। ইন্টার্ন বা অন্য কাউকে লিড করা যাবে না। (tasks_lead_staff_update)"
    );
  }
  const leadName = leadUser.full_name;
  const course = DEMO_COURSES.find((c) => c.id === req.course_id);
  const taskTitle = course ? `${course.name} Shoot` : "ASSDI Media Shoot";

  // 5. Create or find Task ID
  const tasksStore = getTasksStore();
  const task = tasksStore.find((t) => t.requisition_id === req.id);
  const taskId = task ? task.id : `t-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 6. ATOMIC GEAR BOOKING FIRST (Handles 23P01 conflict without partial state)
  bookGearBatchForTask({
    gearIds: validated.gear_ids,
    taskId: taskId,
    responsibleLeadId: validated.lead_staff_id,
    leadName: leadName,
    taskTitle: taskTitle,
    teamLabel: `${leadName}'s Team`,
    timeWindow: timeWindow,
  });

  // 7. Update Requisition
  req.status = "approved";
  req.reviewed_by = user.id;
  req.reviewed_at = now;
  req.updated_at = now;
  req.task_id = taskId;
  req.task_stage = "shoot_assigned";

  // 8. Create or Update Task Record
  let savedTask: TaskItem;
  if (!task) {
    savedTask = {
      id: taskId,
      requisition_id: req.id,
      stage: "shoot_assigned",
      lead_staff_id: validated.lead_staff_id,
      deadline_at: validated.deadline_at,
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    tasksStore.unshift(savedTask);
  } else {
    task.stage = "shoot_assigned";
    task.lead_staff_id = validated.lead_staff_id;
    task.deadline_at = validated.deadline_at;
    task.updated_at = now;
    savedTask = task;
  }

  // 9. Insert Task Assignees (2–3 members)
  // Remove any previous assignees for this task
  const assigneesStore = getAssigneesStore();
  const filtered = assigneesStore.filter((a) => a.task_id !== taskId);
  assigneesStore.length = 0;
  assigneesStore.push(...filtered);

  for (const uid of validated.assignee_ids) {
    const isLead = uid === validated.lead_staff_id;
    assigneesStore.push({
      task_id: taskId,
      user_id: uid,
      assignment_role: isLead ? "lead" : "member",
      assigned_at: now,
    });
  }

  const enriched = enrichTask(savedTask);
  const slip = deriveShootSlipData(savedTask, req);

  return { task: enriched, slip };
}

// ----------------------------------------------------------------------------
// 4. Update Task Stage & Google Drive URL
// Enforces RLS tasks_lead_staff_update & DB CHECK chk_completed_drive_url
// ----------------------------------------------------------------------------
export function updateTaskStage(
  taskId: string,
  input: UpdateTaskStageInput,
  user: UserProfile
): EnrichedTask {
  const task = getTasksStore().find((t) => t.id === taskId);
  if (!task) {
    throw new Error("টাস্ক পাওয়া যায়নি। (Task not found)");
  }

  // 1. RLS Authorization: Admin or Lead Staff
  if (user.role === "admin") {
    // Admin has full access (tasks_admin_all)
  } else if (user.role === "staff") {
    // Staff MUST be lead_staff_id (tasks_lead_staff_update)
    if (task.lead_staff_id !== user.id) {
      throw new RlsForbiddenError(
        'RLS Policy Violation: Only the assigned Project Lead (lead_staff_id) can update this task (tasks_lead_staff_update).'
      );
    }
  } else {
    // Intern / Coordinator cannot update tasks
    throw new RlsForbiddenError("অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন অথবা প্রজেক্ট লিড টাস্ক স্টেজ পরিবর্তন করতে পারেন।");
  }

  // 2. PostgreSQL DB CHECK Constraint chk_completed_drive_url
  if (input.final_drive_url && !GOOGLE_DRIVE_URL_REGEX.test(input.final_drive_url)) {
    throw new PostgresCheckConstraintError(
      'new row for relation "tasks" violates check constraint "chk_completed_drive_url"'
    );
  }

  // 3. Validate input
  const validated = updateTaskStageSchema.parse(input);

  // 4. Enforce Completed requires Google Drive URL
  const targetStage = validated.stage || task.stage;
  if (targetStage === "completed") {
    const effectiveDriveUrl =
      validated.final_drive_url !== undefined
        ? validated.final_drive_url
        : task.final_drive_url;
    if (!effectiveDriveUrl || !GOOGLE_DRIVE_URL_REGEX.test(effectiveDriveUrl)) {
      throw new Error("টাস্ক 'Completed' করতে হলে একটি বৈধ গুগল ড্রাইভ ডেলিভারি লিংক আবশ্যক।");
    }
  }

  const now = new Date().toISOString();
  if (validated.stage !== undefined) {
    task.stage = validated.stage;
  }
  task.updated_at = now;

  if (validated.final_drive_url !== undefined) {
    task.final_drive_url = validated.final_drive_url || null;
  }

  if (validated.raw_footage_uploaded !== undefined) {
    task.raw_footage_uploaded = validated.raw_footage_uploaded;
  }

  if (task.stage === "completed") {
    task.completed_at = now;
  }

  // Sync to parent requisition
  const allReqs = getAllRequisitionsRaw();
  const req = allReqs.find((r) => r.id === task.requisition_id);
  if (req) {
    req.task_stage = task.stage;
    req.final_drive_url = task.final_drive_url;
    req.updated_at = now;
  }

  return enrichTask(task);
}

// ----------------------------------------------------------------------------
// 5. Get Shoot Assignment Slip
// ----------------------------------------------------------------------------
export function getShootSlip(taskId: string, user?: UserProfile): ShootSlipData {
  const task = getTaskById(taskId, user);
  if (!task) {
    throw new Error("টাস্ক পাওয়া যায়নি। (Task not found)");
  }
  return deriveShootSlipData(task);
}

// ----------------------------------------------------------------------------
// 6. Trigger B Simulation: Intern Footage Upload Sync
// ----------------------------------------------------------------------------
export function syncInternFootageUpload(taskId: string): void {
  const task = getTasksStore().find((t) => t.id === taskId);
  if (task) {
    task.raw_footage_uploaded = true;
    task.updated_at = new Date().toISOString();
  }
}
