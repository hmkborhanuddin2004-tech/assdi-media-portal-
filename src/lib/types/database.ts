export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "coordinator" | "staff" | "intern";

export type ProgramType =
  | "orientation"
  | "final_exam"
  | "workshop"
  | "documentary"
  | "visitor_reel"
  | "promotional_video";

export type FramingType = "vertical_9_16" | "horizontal_16_9";

export type RequisitionStatus = "pending" | "approved" | "rejected";

export type TaskStage =
  | "pending"
  | "shoot_assigned"
  | "shoot_done"
  | "editing"
  | "review"
  | "completed";

export type AssignmentRole = "lead" | "member" | "intern";

export type GearCategory =
  | "camera_body"
  | "lens"
  | "drone"
  | "gimbal"
  | "microphone"
  | "light"
  | "memory_card"
  | "accessory";

export type GearStatus = "available" | "in_use" | "maintenance";

export type StaffWorkCategory =
  | "daily_cinematography"
  | "video_editing"
  | "book_review"
  | "script_research"
  | "content_management";

export type ShootLocationType = "indoor" | "outdoor";

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          role: UserRole;
          course_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone: string;
          role: UserRole;
          course_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          role?: UserRole;
          course_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      requisitions: {
        Row: {
          id: string;
          course_id: string;
          coordinator_id: string;
          program_type: ProgramType;
          format_duration: string;
          framing_type: FramingType;
          venue_id: string;
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
        };
        Insert: {
          id?: string;
          course_id: string;
          coordinator_id: string;
          program_type: ProgramType;
          format_duration: string;
          framing_type: FramingType;
          venue_id: string;
          shoot_date: string;
          call_time: string;
          coordinator_phone: string;
          notes?: string | null;
          is_emergency_override?: boolean;
          override_reason?: string | null;
          status?: RequisitionStatus;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          coordinator_id?: string;
          program_type?: ProgramType;
          format_duration?: string;
          framing_type?: FramingType;
          venue_id?: string;
          shoot_date?: string;
          call_time?: string;
          coordinator_phone?: string;
          notes?: string | null;
          is_emergency_override?: boolean;
          override_reason?: string | null;
          status?: RequisitionStatus;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
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
        };
        Insert: {
          id?: string;
          requisition_id: string;
          stage?: TaskStage;
          lead_staff_id?: string | null;
          deadline_at?: string | null;
          raw_footage_uploaded?: boolean;
          final_drive_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requisition_id?: string;
          stage?: TaskStage;
          lead_staff_id?: string | null;
          deadline_at?: string | null;
          raw_footage_uploaded?: boolean;
          final_drive_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_assignees: {
        Row: {
          task_id: string;
          user_id: string;
          assignment_role: AssignmentRole;
          assigned_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          assignment_role?: AssignmentRole;
          assigned_at?: string;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          assignment_role?: AssignmentRole;
          assigned_at?: string;
        };
      };
      gear_items: {
        Row: {
          id: string;
          name: string;
          category: GearCategory;
          serial_number: string;
          status: GearStatus;
          maintenance_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: GearCategory;
          serial_number: string;
          status?: GearStatus;
          maintenance_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: GearCategory;
          serial_number?: string;
          status?: GearStatus;
          maintenance_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      gear_bookings: {
        Row: {
          id: string;
          gear_id: string;
          task_id: string;
          responsible_lead_id: string;
          time_window: string;
          checked_out_at: string;
          returned_at: string | null;
          battery_ok: boolean | null;
          sd_card_ok: boolean | null;
          return_condition_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gear_id: string;
          task_id: string;
          responsible_lead_id: string;
          time_window: string;
          checked_out_at?: string;
          returned_at?: string | null;
          battery_ok?: boolean | null;
          sd_card_ok?: boolean | null;
          return_condition_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gear_id?: string;
          task_id?: string;
          responsible_lead_id?: string;
          time_window?: string;
          checked_out_at?: string;
          returned_at?: string | null;
          battery_ok?: boolean | null;
          sd_card_ok?: boolean | null;
          return_condition_note?: string | null;
          created_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_role: UserRole;
          log_date: string;
          task_id: string | null;
          work_category: StaffWorkCategory | null;
          hours_spent: number;
          shoot_location_type: ShootLocationType | null;
          raw_footage_uploaded: boolean | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_role: UserRole;
          log_date?: string;
          task_id?: string | null;
          work_category?: StaffWorkCategory | null;
          hours_spent: number;
          shoot_location_type?: ShootLocationType | null;
          raw_footage_uploaded?: boolean | null;
          notes: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_role?: UserRole;
          log_date?: string;
          task_id?: string | null;
          work_category?: StaffWorkCategory | null;
          hours_spent?: number;
          shoot_location_type?: ShootLocationType | null;
          raw_footage_uploaded?: boolean | null;
          notes?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      current_user_course_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
  };
}
