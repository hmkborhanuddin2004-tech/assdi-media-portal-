import type { TaskItem, TaskAssigneeItem } from "./store-types";

// ----------------------------------------------------------------------------
// Canonical 10 Seeded Tasks Matching docs/mockups/task-board.jpg & calendar-slip.jpg
// ----------------------------------------------------------------------------
export function getInitialTasks(): TaskItem[] {
  return [
    // 1. Pending: SBMC Bakery Reel (Reel • Nov 30)
    {
      id: "t1000000-0000-0000-0000-000000000010",
      requisition_id: "r1000000-0000-0000-0000-000000000010",
      stage: "pending",
      lead_staff_id: null,
      deadline_at: "2026-11-30T18:00:00Z",
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-23T10:00:00Z",
      updated_at: "2026-11-23T10:00:00Z",
    },
    // 2. Shoot Assigned: The Art of Creation (Team: Arif, Hasan • Due in 2d)
    {
      id: "t1000000-0000-0000-0000-000000000001",
      requisition_id: "r1000000-0000-0000-0000-000000000001",
      stage: "shoot_assigned",
      lead_staff_id: "00000000-0000-0000-0000-000000000007", // Arif Rahman (Permanent Staff Lead)
      deadline_at: "2026-11-26T18:00:00Z",
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-20T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    // 2b. Shoot Assigned: RAC Promo
    {
      id: "t1000000-0000-0000-0000-000000000005",
      requisition_id: "r1000000-0000-0000-0000-000000000009",
      stage: "shoot_assigned",
      lead_staff_id: "00000000-0000-0000-0000-000000000003", // Tariqul Islam
      deadline_at: "2026-12-04T18:00:00Z",
      raw_footage_uploaded: false,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-22T10:00:00Z",
      updated_at: "2026-11-22T10:00:00Z",
    },
    // 3. Shoot Done: RAC Trade Workshop (Raw Uploaded ✓)
    {
      id: "t1000000-0000-0000-0000-000000000004",
      requisition_id: "r1000000-0000-0000-0000-000000000008",
      stage: "shoot_done",
      lead_staff_id: "00000000-0000-0000-0000-000000000003", // Tariqul Islam
      deadline_at: "2026-11-27T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-14T10:00:00Z",
      updated_at: "2026-11-21T18:00:00Z",
    },
    // 4. Editing: Motorcycle Servicing (Editor: Nabil • Due in 1d)
    {
      id: "t1000000-0000-0000-0000-000000000006",
      requisition_id: "r1000000-0000-0000-0000-000000000011",
      stage: "editing",
      lead_staff_id: "00000000-0000-0000-0000-000000000009", // Nabil Hossain
      deadline_at: "2026-11-25T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-18T10:00:00Z",
      updated_at: "2026-11-22T14:00:00Z",
    },
    // 4b. Editing: Mobile Servicing
    {
      id: "t1000000-0000-0000-0000-000000000007",
      requisition_id: "r1000000-0000-0000-0000-000000000005",
      stage: "editing",
      lead_staff_id: "00000000-0000-0000-0000-000000000003", // Tariqul Islam
      deadline_at: "2026-11-28T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-19T10:00:00Z",
      updated_at: "2026-11-23T11:00:00Z",
    },
    // 5. Review: English Language Promo (Lead Review)
    {
      id: "t1000000-0000-0000-0000-000000000008",
      requisition_id: "r1000000-0000-0000-0000-000000000012",
      stage: "review",
      lead_staff_id: "00000000-0000-0000-0000-000000000007", // Arif Rahman
      deadline_at: "2026-11-26T12:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: null,
      completed_at: null,
      created_at: "2026-11-17T09:00:00Z",
      updated_at: "2026-11-23T15:00:00Z",
    },
    // 6. Completed: Professional Cooking (Delivered ✓)
    {
      id: "t1000000-0000-0000-0000-000000000009",
      requisition_id: "r1000000-0000-0000-0000-000000000013",
      stage: "completed",
      lead_staff_id: "00000000-0000-0000-0000-000000000003",
      deadline_at: "2026-11-22T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: "https://drive.google.com/drive/folders/1ProfCooking-Final-Delivery",
      completed_at: "2026-11-22T17:30:00Z",
      created_at: "2026-11-16T10:00:00Z",
      updated_at: "2026-11-22T17:30:00Z",
    },
    // 6b. Completed: The Art of Creation Orientation
    {
      id: "t1000000-0000-0000-0000-000000000002",
      requisition_id: "r1000000-0000-0000-0000-000000000002",
      stage: "completed",
      lead_staff_id: "00000000-0000-0000-0000-000000000007",
      deadline_at: "2026-11-18T18:00:00Z",
      raw_footage_uploaded: true,
      final_drive_url: "https://drive.google.com/drive/folders/1AOC-Orientation-Batch04",
      completed_at: "2026-11-18T18:00:00Z",
      created_at: "2026-11-15T12:00:00Z",
      updated_at: "2026-11-18T18:00:00Z",
    },
    // 6c. Completed: RAC Lab Session Reel
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
  ];
}

export function getInitialAssignees(): TaskAssigneeItem[] {
  return [
    // Task 1 (The Art of Creation) -> Arif (lead), Hasan (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000007", // Arif Rahman (Permanent Staff Lead)
      assignment_role: "lead",
      assigned_at: "2026-11-20T10:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000008", // Hasan Ali (Intern)
      assignment_role: "member",
      assigned_at: "2026-11-20T10:00:00Z",
    },
    // Task 5 (RAC Promo) -> Tariqul (lead), Habibur (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000005",
      user_id: "00000000-0000-0000-0000-000000000003",
      assignment_role: "lead",
      assigned_at: "2026-11-22T10:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000005",
      user_id: "00000000-0000-0000-0000-000000000004",
      assignment_role: "member",
      assigned_at: "2026-11-22T10:00:00Z",
    },
    // Task 4 (RAC Trade Workshop) -> Tariqul (lead), Hasan (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000004",
      user_id: "00000000-0000-0000-0000-000000000003",
      assignment_role: "lead",
      assigned_at: "2026-11-14T10:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000004",
      user_id: "00000000-0000-0000-0000-000000000008",
      assignment_role: "member",
      assigned_at: "2026-11-14T10:00:00Z",
    },
    // Task 6 (Motorcycle Servicing) -> Nabil (lead), Habibur (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000006",
      user_id: "00000000-0000-0000-0000-000000000009", // Nabil Hossain
      assignment_role: "lead",
      assigned_at: "2026-11-18T10:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000006",
      user_id: "00000000-0000-0000-0000-000000000004",
      assignment_role: "member",
      assigned_at: "2026-11-18T10:00:00Z",
    },
    // Task 8 (English Language) -> Arif (lead), Nabil (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000008",
      user_id: "00000000-0000-0000-0000-000000000007",
      assignment_role: "lead",
      assigned_at: "2026-11-17T09:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000008",
      user_id: "00000000-0000-0000-0000-000000000009",
      assignment_role: "member",
      assigned_at: "2026-11-17T09:00:00Z",
    },
    // Task 9 (Professional Cooking) -> Tariqul (lead), Hasan (member)
    {
      task_id: "t1000000-0000-0000-0000-000000000009",
      user_id: "00000000-0000-0000-0000-000000000003",
      assignment_role: "lead",
      assigned_at: "2026-11-16T10:00:00Z",
    },
    {
      task_id: "t1000000-0000-0000-0000-000000000009",
      user_id: "00000000-0000-0000-0000-000000000008",
      assignment_role: "member",
      assigned_at: "2026-11-16T10:00:00Z",
    },
  ];
}
