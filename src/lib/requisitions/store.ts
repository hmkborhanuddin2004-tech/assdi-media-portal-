import type {
  ProgramType,
  FramingType,
  RequisitionStatus,
  TaskStage,
} from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import {
  checkLeadTimeCompliance,
  type CreateRequisitionInput,
} from "@/lib/validations/requisitions";
import { DEMO_COURSES } from "@/lib/auth/demo-users";

export interface Venue {
  id: string;
  name: string;
  is_active: boolean;
}

export interface RequisitionItem {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  coordinator_id: string;
  coordinator_name?: string;
  program_type: ProgramType;
  format_duration: string;
  framing_type: FramingType;
  venue_id: string;
  venue_name?: string;
  shoot_date: string;
  call_time: string;
  coordinator_phone: string;
  notes: string | null;
  is_emergency_override: boolean;
  override_reason: string | null;
  status: RequisitionStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Associated task fields (joined from tasks table)
  task_id?: string | null;
  task_stage?: TaskStage | null;
  final_drive_url?: string | null;
}

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

export const MASTER_VENUES: Venue[] = [
  { id: "ba000000-0000-0000-0000-000000000001", name: "50 Katha Campus", is_active: true },
  { id: "ba000000-0000-0000-0000-000000000002", name: "Kazibari Branch", is_active: true },
  { id: "ba000000-0000-0000-0000-000000000003", name: "Lab Room", is_active: true },
];

function getInitialRequisitions(): RequisitionItem[] {
  return [
    // AOC (The Art of Creation) mockups requisitions
    {
      id: "r1000000-0000-0000-0000-000000000001",
      course_id: "c1000000-0000-0000-0000-000000000007", // The Art of Creation
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Borhan",
      program_type: "visitor_reel",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000003", // Lab Room
      shoot_date: "2026-11-29",
      call_time: "09:00 AM",
      coordinator_phone: "01711000002",
      notes: "The Art of Creation Practical Session Reel",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-20T10:00:00Z",
      created_at: "2026-11-20T09:30:00Z",
      updated_at: "2026-11-20T10:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000001",
      task_stage: "shoot_assigned",
      final_drive_url: null,
    },
    {
      id: "r1000000-0000-0000-0000-000000000002",
      course_id: "c1000000-0000-0000-0000-000000000007", // The Art of Creation
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Borhan",
      program_type: "orientation",
      format_duration: "3-5m Documentary",
      framing_type: "horizontal_16_9",
      venue_id: "ba000000-0000-0000-0000-000000000001", // 50 Katha Campus
      shoot_date: "2026-12-05",
      call_time: "10:00 AM",
      coordinator_phone: "01711000002",
      notes: "Orientation Video for Batch 04",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-15T12:00:00Z",
      created_at: "2026-11-15T11:00:00Z",
      updated_at: "2026-11-18T18:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000002",
      task_stage: "completed",
      final_drive_url: "https://drive.google.com/drive/folders/1AOC-Orientation-Batch04",
    },
    {
      id: "r1000000-0000-0000-0000-000000000003",
      course_id: "c1000000-0000-0000-0000-000000000007", // The Art of Creation
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Borhan",
      program_type: "workshop",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000002", // Kazibari Branch
      shoot_date: "2026-11-24",
      call_time: "02:00 PM",
      coordinator_phone: "01711000002",
      notes: "Workshop Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "rejected",
      rejection_reason: "Submit 3 days prior",
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-23T14:00:00Z",
      created_at: "2026-11-23T13:00:00Z",
      updated_at: "2026-11-23T14:00:00Z",
      task_id: null,
      task_stage: null,
      final_drive_url: null,
    },
    // RAC Requisitions
    {
      id: "r1000000-0000-0000-0000-000000000004",
      course_id: "c1000000-0000-0000-0000-000000000001", // RAC
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Abdullah",
      program_type: "visitor_reel",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000003", // Lab Room
      shoot_date: "2026-11-29",
      call_time: "10:00 AM",
      coordinator_phone: "01711000002",
      notes: "প্র্যাকটিক্যাল ল্যাব সেশন রিল",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-20T10:00:00Z",
      created_at: "2026-11-20T09:30:00Z",
      updated_at: "2026-11-20T10:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000003",
      task_stage: "completed",
      final_drive_url: "https://drive.google.com/drive/folders/1RAC-Lab-Session-Reel",
    },
    {
      id: "r1000000-0000-0000-0000-000000000005",
      course_id: "c1000000-0000-0000-0000-000000000001", // RAC
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Abdullah",
      program_type: "workshop",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000001", // 50 Katha Campus
      shoot_date: "2026-11-30",
      call_time: "02:00 PM",
      coordinator_phone: "01711000002",
      notes: "RAC Trade Workshop Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-11-22T08:00:00Z",
      updated_at: "2026-11-22T08:00:00Z",
      task_id: null,
      task_stage: null,
      final_drive_url: null,
    },
    {
      id: "r1000000-0000-0000-0000-000000000006",
      course_id: "c1000000-0000-0000-0000-000000000001", // RAC
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Abdullah",
      program_type: "workshop",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000002", // Kazibari Branch
      shoot_date: "2026-11-24",
      call_time: "02:00 PM",
      coordinator_phone: "01711000002",
      notes: "Workshop Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "rejected",
      rejection_reason: "Submit 3 days prior",
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-23T14:00:00Z",
      created_at: "2026-11-23T13:00:00Z",
      updated_at: "2026-11-23T14:00:00Z",
      task_id: null,
      task_stage: null,
      final_drive_url: null,
    },
    // Professional Cooking Requisition (for Emergency Override demo)
    {
      id: "r1000000-0000-0000-0000-000000000007",
      course_id: "c1000000-0000-0000-0000-000000000008", // Professional Cooking
      coordinator_id: "00000000-0000-0000-0000-000000000001",
      coordinator_name: "Engr. Mahmudul Hasan",
      program_type: "final_exam",
      format_duration: "3-5m Documentary",
      framing_type: "horizontal_16_9",
      venue_id: "ba000000-0000-0000-0000-000000000003", // Lab Room
      shoot_date: "2026-11-25",
      call_time: "10:00 AM",
      coordinator_phone: "01711000001",
      notes: "Urgent Practical Cooking Exam Coverage",
      is_emergency_override: true,
      override_reason: "Special approval by Chairman for immediate external assessor visit",
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-11-23T16:00:00Z",
      updated_at: "2026-11-23T16:00:00Z",
      task_id: null,
      task_stage: null,
      final_drive_url: null,
    },
    // RAC Shoot Done Requisition (for Shoot Done live status tracking)
    {
      id: "r1000000-0000-0000-0000-000000000008",
      course_id: "c1000000-0000-0000-0000-000000000001", // RAC
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Abdullah",
      program_type: "documentary",
      format_duration: "3-5m Documentary",
      framing_type: "horizontal_16_9",
      venue_id: "ba000000-0000-0000-0000-000000000001", // 50 Katha Campus
      shoot_date: "2026-11-21",
      call_time: "11:00 AM",
      coordinator_phone: "01711000002",
      notes: "RAC Trade Annual Documentary",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-14T10:00:00Z",
      created_at: "2026-11-14T09:00:00Z",
      updated_at: "2026-11-21T18:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000004",
      task_stage: "shoot_done",
      final_drive_url: null,
    },
    // RAC Approved / Shoot Assigned Requisition
    {
      id: "r1000000-0000-0000-0000-000000000009",
      course_id: "c1000000-0000-0000-0000-000000000001", // RAC
      coordinator_id: "00000000-0000-0000-0000-000000000002",
      coordinator_name: "Muhammad Abdullah",
      program_type: "orientation",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000003", // Lab Room
      shoot_date: "2026-12-02",
      call_time: "09:30 AM",
      coordinator_phone: "01711000002",
      notes: "RAC Batch 05 Orientation Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-22T10:00:00Z",
      created_at: "2026-11-22T08:30:00Z",
      updated_at: "2026-11-22T10:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000005",
      task_stage: "shoot_assigned",
      final_drive_url: null,
    },
    // SBMC Bakery Reel (Pending)
    {
      id: "r1000000-0000-0000-0000-000000000010",
      course_id: "c1000000-0000-0000-0000-000000000005",
      coordinator_id: "00000000-0000-0000-0000-000000000001",
      coordinator_name: "Engr. Mahmudul Hasan",
      program_type: "visitor_reel",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000003",
      shoot_date: "2026-11-30",
      call_time: "10:00 AM",
      coordinator_phone: "01711000001",
      notes: "SBMC Bakery Reel",
      is_emergency_override: false,
      override_reason: null,
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-11-23T10:00:00Z",
      updated_at: "2026-11-23T10:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000010",
      task_stage: "pending",
      final_drive_url: null,
    },
    // Motorcycle Servicing (Editing)
    {
      id: "r1000000-0000-0000-0000-000000000011",
      course_id: "c1000000-0000-0000-0000-000000000002",
      coordinator_id: "00000000-0000-0000-0000-000000000001",
      coordinator_name: "Engr. Mahmudul Hasan",
      program_type: "workshop",
      format_duration: "3-5m Documentary",
      framing_type: "horizontal_16_9",
      venue_id: "ba000000-0000-0000-0000-000000000002",
      shoot_date: "2026-11-25",
      call_time: "02:00 PM",
      coordinator_phone: "01711000001",
      notes: "Motorcycle Servicing Workshop Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-18T10:00:00Z",
      created_at: "2026-11-18T09:00:00Z",
      updated_at: "2026-11-22T14:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000006",
      task_stage: "editing",
      final_drive_url: null,
    },
    // English Language (Review)
    {
      id: "r1000000-0000-0000-0000-000000000012",
      course_id: "c1000000-0000-0000-0000-000000000006",
      coordinator_id: "00000000-0000-0000-0000-000000000001",
      coordinator_name: "Engr. Mahmudul Hasan",
      program_type: "promotional_video",
      format_duration: "30-40s Reel",
      framing_type: "vertical_9_16",
      venue_id: "ba000000-0000-0000-0000-000000000003",
      shoot_date: "2026-11-26",
      call_time: "10:30 AM",
      coordinator_phone: "01711000001",
      notes: "English Language Promo",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-17T09:00:00Z",
      created_at: "2026-11-17T08:00:00Z",
      updated_at: "2026-11-23T15:00:00Z",
      task_id: "t1000000-0000-0000-0000-000000000008",
      task_stage: "review",
      final_drive_url: null,
    },
    // Professional Cooking (Completed)
    {
      id: "r1000000-0000-0000-0000-000000000013",
      course_id: "c1000000-0000-0000-0000-000000000008",
      coordinator_id: "00000000-0000-0000-0000-000000000001",
      coordinator_name: "Engr. Mahmudul Hasan",
      program_type: "final_exam",
      format_duration: "3-5m Documentary",
      framing_type: "horizontal_16_9",
      venue_id: "ba000000-0000-0000-0000-000000000003",
      shoot_date: "2026-11-20",
      call_time: "10:00 AM",
      coordinator_phone: "01711000001",
      notes: "Professional Cooking Final Delivery",
      is_emergency_override: false,
      override_reason: null,
      status: "approved",
      rejection_reason: null,
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: "2026-11-22T17:30:00Z",
      created_at: "2026-11-16T10:00:00Z",
      updated_at: "2026-11-22T17:30:00Z",
      task_id: "t1000000-0000-0000-0000-000000000009",
      task_stage: "completed",
      final_drive_url: "https://drive.google.com/drive/folders/1ProfCooking-Final-Delivery",
    },
  ];
}

function getInitialTasks(): TaskItem[] {
  return [
    {
      id: "t1000000-0000-0000-0000-000000000001",
      requisition_id: "r1000000-0000-0000-0000-000000000001",
      stage: "shoot_assigned",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-11-30T18:00:00Z",
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-20T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "t1000000-0000-0000-0000-000000000002",
      requisition_id: "r1000000-0000-0000-0000-000000000002",
      stage: "completed",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-11-18T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: "https://drive.google.com/drive/folders/1AOC-Orientation-Batch04",
      completed_at: "2026-11-18T18:00:00Z",
      created_at: "2026-11-15T12:00:00Z",
      updated_at: "2026-11-18T18:00:00Z",
    },
    {
      id: "t1000000-0000-0000-0000-000000000003",
      requisition_id: "r1000000-0000-0000-0000-000000000004",
      stage: "completed",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-11-20T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: "https://drive.google.com/drive/folders/1RAC-Lab-Session-Reel",
      completed_at: "2026-11-20T18:00:00Z",
      created_at: "2026-11-20T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "t1000000-0000-0000-0000-000000000004",
      requisition_id: "r1000000-0000-0000-0000-000000000008",
      stage: "shoot_done",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-11-28T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-14T10:00:00Z",
      updated_at: "2026-11-21T18:00:00Z",
    },
    {
      id: "t1000000-0000-0000-0000-000000000005",
      requisition_id: "r1000000-0000-0000-0000-000000000009",
      stage: "shoot_assigned",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-12-08T18:00:00Z",
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-22T10:00:00Z",
      updated_at: "2026-11-22T10:00:00Z",
    },
  ];
}

interface RequisitionsGlobalStore {
  __assdi_requisitions?: RequisitionItem[];
  __assdi_tasks?: TaskItem[];
}

const globalStore = globalThis as unknown as RequisitionsGlobalStore;

if (!globalStore.__assdi_requisitions) {
  globalStore.__assdi_requisitions = getInitialRequisitions();
}

if (!globalStore.__assdi_tasks) {
  globalStore.__assdi_tasks = getInitialTasks();
}

export function resetRequisitionsForTesting(): void {
  globalStore.__assdi_requisitions = getInitialRequisitions();
  globalStore.__assdi_tasks = getInitialTasks();
}

export function getAllRequisitionsRaw(): RequisitionItem[] {
  if (!globalStore.__assdi_requisitions) {
    globalStore.__assdi_requisitions = getInitialRequisitions();
  }
  return globalStore.__assdi_requisitions;
}

export function getAllVenues(): Venue[] {
  return MASTER_VENUES;
}

export function getVenueById(id: string): Venue | undefined {
  return MASTER_VENUES.find((v) => v.id === id);
}

function enrichRequisition(req: RequisitionItem): RequisitionItem {
  const course = DEMO_COURSES.find((c) => c.id === req.course_id);
  const venue = MASTER_VENUES.find((v) => v.id === req.venue_id);
  const task = globalStore.__assdi_tasks?.find((t) => t.requisition_id === req.id);

  return {
    ...req,
    course_name: course?.name || req.course_name || "Unknown Course",
    course_code: course?.code || req.course_code || "",
    venue_name: venue?.name || req.venue_name || "Unknown Venue",
    task_id: task?.id || req.task_id || null,
    task_stage: task?.stage || req.task_stage || null,
    final_drive_url: task?.final_drive_url || req.final_drive_url || null,
  };
}

/**
 * Strict RLS isolation query:
 * - Admin reads ALL requisitions
 * - Coordinator reads ONLY requisitions matching their assigned course_id
 */
export function getRequisitionsForUser(user: UserProfile): RequisitionItem[] {
  const list = globalStore.__assdi_requisitions || [];

  if (user.role === "admin") {
    return list.map(enrichRequisition).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  if (user.role === "coordinator") {
    const userCourseId = user.course_id;
    if (!userCourseId) return [];
    return list
      .filter((r) => r.course_id === userCourseId)
      .map(enrichRequisition)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  // Staff / Intern can read assigned
  return list
    .filter((r) => r.status === "approved")
    .map(enrichRequisition)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getRequisitionById(id: string, user: UserProfile): RequisitionItem | null {
  const list = globalStore.__assdi_requisitions || [];
  const req = list.find((r) => r.id === id);
  if (!req) return null;

  // Enforce RLS
  if (user.role === "coordinator" && req.course_id !== user.course_id) {
    return null; // Cross-course forbidden
  }

  return enrichRequisition(req);
}

/**
 * Creates a requisition with strict validation:
 * - Enforces lead-time rule (3 days routine / 7 days major in Asia/Dhaka time)
 * - Enforces admin-only Emergency Override
 * - Enforces Coordinator course locking (cannot submit for another course)
 */
export function createRequisition(
  input: CreateRequisitionInput,
  user: UserProfile
): RequisitionItem {
  // 1. Role & Course Isolation Check
  if (user.role === "coordinator") {
    if (user.course_id && input.course_id !== user.course_id) {
      throw new Error(
        "নিরাপত্তা লঙ্ঘন: আপনি শুধুমাত্র আপনার নির্ধারিত কোর্সের জন্য রিকুইজিশন তৈরি করতে পারেন। (Course isolation violation)"
      );
    }
    if (input.is_emergency_override) {
      throw new Error(
        "Lead-time rule violation: Only Media Head can apply Emergency Override."
      );
    }
  }

  // 2. Validate Lead-Time in Asia/Dhaka
  const leadCheck = checkLeadTimeCompliance({
    programType: input.program_type,
    shootDate: input.shoot_date,
    isEmergencyOverride: input.is_emergency_override,
    overrideReason: input.override_reason,
    callerRole: user.role,
  });

  if (!leadCheck.ok) {
    throw new Error(leadCheck.error || "Lead-time rule violation.");
  }

  // 3. Validate DB CHECK: chk_override_requires_reason
  if (input.is_emergency_override) {
    if (!input.override_reason || input.override_reason.trim().length === 0) {
      throw new Error("Emergency Override requires a non-empty override_reason.");
    }
  }

  const now = new Date().toISOString();
  const newReq: RequisitionItem = {
    id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    course_id: input.course_id,
    coordinator_id: user.id,
    coordinator_name: user.full_name,
    program_type: input.program_type,
    format_duration: input.format_duration,
    framing_type: input.framing_type,
    venue_id: input.venue_id,
    shoot_date: input.shoot_date,
    call_time: input.call_time,
    coordinator_phone: input.coordinator_phone,
    notes: input.notes || null,
    is_emergency_override: input.is_emergency_override || false,
    override_reason: input.is_emergency_override ? (input.override_reason?.trim() || null) : null,
    status: "pending",
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  };

  if (!globalStore.__assdi_requisitions) {
    globalStore.__assdi_requisitions = [];
  }
  globalStore.__assdi_requisitions.unshift(newReq);

  return enrichRequisition(newReq);
}

/**
 * Approve a requisition (Admin only).
 * Atomically creates a task in the tasks table.
 */
export function approveRequisition(
  id: string,
  user: UserProfile
): { requisition: RequisitionItem; task: TaskItem } {
  if (user.role !== "admin") {
    throw new Error("অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান রিকুইজিশন অনুমোদন করতে পারেন।");
  }

  const list = globalStore.__assdi_requisitions || [];
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error("রিকুইজিশন পাওয়া যায়নি। (Requisition not found)");
  }

  const now = new Date().toISOString();
  const req = list[index];

  req.status = "approved";
  req.rejection_reason = null;
  req.reviewed_by = user.id;
  req.reviewed_at = now;
  req.updated_at = now;

  // Atomically create task card in tasks table
  if (!globalStore.__assdi_tasks) {
    globalStore.__assdi_tasks = [];
  }

  let task = globalStore.__assdi_tasks.find((t) => t.requisition_id === req.id);
  if (!task) {
    task = {
      id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      requisition_id: req.id,
      stage: "shoot_assigned",
      lead_staff_id: null,
      deadline_at: null,
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    globalStore.__assdi_tasks.unshift(task);
  } else {
    task.stage = "shoot_assigned";
    task.updated_at = now;
  }

  req.task_id = task.id;
  req.task_stage = task.stage;

  return { requisition: enrichRequisition(req), task };
}

/**
 * Reject a requisition (Admin only).
 * Enforces DB CHECK:
 * CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)
 */
export function rejectRequisition(
  id: string,
  rejectionReason: string,
  user: UserProfile
): RequisitionItem {
  if (user.role !== "admin") {
    throw new Error("অননুমোদিত অ্যাক্সেস। শুধুমাত্র মিডিয়া প্রধান রিকুইজিশন বাতিল করতে পারেন।");
  }

  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new Error('new row for relation "requisitions" violates check constraint "chk_rejection_requires_reason"');
  }

  const list = globalStore.__assdi_requisitions || [];
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error("রিকুইজিশন পাওয়া যায়নি। (Requisition not found)");
  }

  const now = new Date().toISOString();
  const req = list[index];

  req.status = "rejected";
  req.rejection_reason = rejectionReason.trim();
  req.reviewed_by = user.id;
  req.reviewed_at = now;
  req.updated_at = now;

  return enrichRequisition(req);
}
