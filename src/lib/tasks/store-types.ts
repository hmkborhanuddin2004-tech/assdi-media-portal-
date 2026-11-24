import type { TaskStage, AssignmentRole } from "@/lib/types/database";

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
