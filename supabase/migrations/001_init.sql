-- ============================================================================
-- ASSDI Central Media Management Portal — Audited Production Schema (001_init)
-- PostgreSQL 15+ / Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'coordinator', 'staff', 'intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.program_type AS ENUM (
    'orientation',
    'final_exam',
    'workshop',
    'documentary',
    'visitor_reel',
    'promotional_video'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.framing_type AS ENUM ('vertical_9_16', 'horizontal_16_9');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.requisition_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_stage AS ENUM (
    'pending',
    'shoot_assigned',
    'shoot_done',
    'editing',
    'review',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_role AS ENUM ('lead', 'member', 'intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gear_category AS ENUM (
    'camera_body',
    'lens',
    'drone',
    'gimbal',
    'microphone',
    'light',
    'memory_card',
    'accessory'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gear_status AS ENUM ('available', 'in_use', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_work_category AS ENUM (
    'daily_cinematography',
    'video_editing',
    'book_review',
    'script_research',
    'content_management'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shoot_location_type AS ENUM ('indoor', 'outdoor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE TABLES (9 Tables)
-- ----------------------------------------------------------------------------

-- Table 1: Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: Venues
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role public.user_role NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_coordinator_must_have_course
    CHECK (role <> 'coordinator' OR course_id IS NOT NULL)
);

-- Table 4: Requisitions
CREATE TABLE IF NOT EXISTS public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  coordinator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  program_type public.program_type NOT NULL,
  format_duration TEXT NOT NULL,
  framing_type public.framing_type NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
  shoot_date DATE NOT NULL,
  call_time TIME NOT NULL,
  coordinator_phone TEXT NOT NULL,
  notes TEXT,
  is_emergency_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  status public.requisition_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rejection_requires_reason
    CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL),
  CONSTRAINT chk_override_requires_reason
    CHECK (is_emergency_override = false OR NULLIF(BTRIM(override_reason), '') IS NOT NULL)
);

-- Table 5: Tasks (Central Task Board)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL UNIQUE REFERENCES public.requisitions(id) ON DELETE CASCADE,
  stage public.task_stage NOT NULL DEFAULT 'shoot_assigned',
  lead_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline_at TIMESTAMPTZ,
  raw_footage_uploaded BOOLEAN NOT NULL DEFAULT false,
  final_drive_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_completed_drive_url
    CHECK (
      final_drive_url IS NULL
      OR final_drive_url ~* '^https://(drive|docs)\.google\.com/'
    )
);

-- Table 6: Task Assignees (2-3 Member Teams)
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_role public.assignment_role NOT NULL DEFAULT 'member',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Table 7: Gear Master Inventory
CREATE TABLE IF NOT EXISTS public.gear_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.gear_category NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status public.gear_status NOT NULL DEFAULT 'available',
  maintenance_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 8: Gear Bookings (Zero Double-Booking via Exclusion Constraint)
CREATE TABLE IF NOT EXISTS public.gear_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES public.gear_items(id) ON DELETE RESTRICT,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  responsible_lead_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  time_window TSTZRANGE NOT NULL,
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  battery_ok BOOLEAN,
  sd_card_ok BOOLEAN,
  return_condition_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_non_empty_window CHECK (NOT isempty(time_window)),
  CONSTRAINT excl_no_gear_double_booking
    EXCLUDE USING gist (
      gear_id WITH =,
      time_window WITH &&
    ) WHERE (returned_at IS NULL)
);

-- Table 9: Staff & Intern Daily Logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_role public.user_role NOT NULL CHECK (log_role IN ('staff', 'intern')),
  log_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Dhaka')::date),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  work_category public.staff_work_category,
  hours_spent NUMERIC(4,2) NOT NULL CHECK (hours_spent > 0 AND hours_spent <= 24),
  shoot_location_type public.shoot_location_type,
  raw_footage_uploaded BOOLEAN,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_staff_log_fields
    CHECK (log_role <> 'staff' OR work_category IS NOT NULL),
  CONSTRAINT chk_intern_log_fields
    CHECK (
      log_role <> 'intern'
      OR (shoot_location_type IS NOT NULL AND raw_footage_uploaded IS NOT NULL)
    )
);

-- ----------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES (Zero-Lag Queries)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role_course ON public.profiles(role, course_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_course_date ON public.requisitions(course_id, shoot_date DESC);
CREATE INDEX IF NOT EXISTS idx_requisitions_status_date ON public.requisitions(status, shoot_date ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_stage_deadline ON public.tasks(stage, deadline_at ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_staff ON public.tasks(lead_staff_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_status_cat ON public.gear_items(status, category);
CREATE INDEX IF NOT EXISTS idx_gear_bookings_task ON public.gear_bookings(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_role_date ON public.daily_logs(log_role, log_date DESC);

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPERS (Prevent RLS Recursion)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_course_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT course_id FROM public.profiles WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 5. BUSINESS RULE TRIGGERS (Defense-in-Depth)
-- ----------------------------------------------------------------------------

-- Trigger A: Enforce 3-day (routine) / 7-day (major event) Lead-Time Rule in DB
CREATE OR REPLACE FUNCTION public.enforce_requisition_lead_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Dhaka')::date;
  v_required_days INT;
  v_caller_role public.user_role := public.current_user_role();
BEGIN
  -- Determine lead days by program type
  IF NEW.program_type IN ('orientation', 'final_exam', 'documentary') THEN
    v_required_days := 7;
  ELSE
    v_required_days := 3;
  END IF;

  -- On INSERT or when shoot_date/program_type changes, enforce lead-time
  IF TG_OP = 'INSERT' OR NEW.shoot_date <> OLD.shoot_date OR NEW.program_type <> OLD.program_type THEN
    IF NEW.shoot_date < (v_today + v_required_days) THEN
      -- Only Admin (or service_role where auth.uid() is NULL) may use Emergency Override
      IF NEW.is_emergency_override = true AND (v_caller_role = 'admin' OR auth.uid() IS NULL) THEN
        IF NULLIF(BTRIM(NEW.override_reason), '') IS NULL THEN
          RAISE EXCEPTION 'Emergency Override requires a non-empty override_reason.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Lead-time rule violation: % requires at least % days notice before shoot_date (Asia/Dhaka). Only Media Head can apply Emergency Override.',
          NEW.program_type, v_required_days;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_requisition_lead_time ON public.requisitions;
CREATE TRIGGER trg_enforce_requisition_lead_time
  BEFORE INSERT OR UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_requisition_lead_time();

-- Trigger B: Sync Intern Raw Footage Upload Flag to Parent Task Card
CREATE OR REPLACE FUNCTION public.sync_raw_footage_to_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.log_role = 'intern' AND NEW.raw_footage_uploaded = true AND NEW.task_id IS NOT NULL THEN
    UPDATE public.tasks
       SET raw_footage_uploaded = true,
           updated_at = NOW()
     WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_raw_footage_to_task ON public.daily_logs;
CREATE TRIGGER trg_sync_raw_footage_to_task
  AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_raw_footage_to_task();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES ON ALL 9 TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- courses & venues: all authenticated active users can read; only admin writes
CREATE POLICY courses_select_auth ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY courses_admin_all ON public.courses FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY venues_select_auth ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY venues_admin_all ON public.venues FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- profiles: users read own profile; staff/admin read team directory; only admin modifies
CREATE POLICY profiles_select_self_or_team ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_role() IN ('admin', 'staff'));
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- requisitions: strict course isolation for coordinators
CREATE POLICY req_select_policy ON public.requisitions FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'coordinator' AND course_id = public.current_user_course_id())
    OR (
      public.current_user_role() IN ('staff', 'intern')
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.task_assignees ta ON ta.task_id = t.id
        WHERE t.requisition_id = requisitions.id AND ta.user_id = auth.uid()
      )
    )
  );

CREATE POLICY req_insert_coordinator_or_admin ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'coordinator'
      AND course_id = public.current_user_course_id()
      AND coordinator_id = auth.uid()
      AND is_emergency_override = false
      AND status = 'pending'
    )
  );

CREATE POLICY req_update_admin_only ON public.requisitions FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- tasks: admin full access; coordinator reads own course tasks; staff/intern read assigned; lead_staff updates stage/drive_url
CREATE POLICY tasks_select_policy ON public.tasks FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
    )
    OR (
      public.current_user_role() = 'coordinator'
      AND EXISTS (
        SELECT 1 FROM public.requisitions r
        WHERE r.id = tasks.requisition_id AND r.course_id = public.current_user_course_id()
      )
    )
  );

CREATE POLICY tasks_admin_all ON public.tasks FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY tasks_lead_staff_update ON public.tasks FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'staff' AND lead_staff_id = auth.uid())
  WITH CHECK (public.current_user_role() = 'staff' AND lead_staff_id = auth.uid());

-- task_assignees: admin manages; assigned users & staff leads view
CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'staff')
    OR user_id = auth.uid()
  );
CREATE POLICY task_assignees_admin_all ON public.task_assignees FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- gear_items & gear_bookings: admin manages; staff/intern read
CREATE POLICY gear_items_select ON public.gear_items FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'staff', 'intern'));
CREATE POLICY gear_items_admin_all ON public.gear_items FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY gear_bookings_select ON public.gear_bookings FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'staff')
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = gear_bookings.task_id AND ta.user_id = auth.uid()
    )
  );
CREATE POLICY gear_bookings_admin_all ON public.gear_bookings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- daily_logs: users manage own logs; admin reads all; staff leads read intern logs on their tasks
CREATE POLICY daily_logs_select ON public.daily_logs FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR user_id = auth.uid()
    OR (
      public.current_user_role() = 'staff'
      AND log_role = 'intern'
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = daily_logs.task_id AND t.lead_staff_id = auth.uid()
      )
    )
  );

CREATE POLICY daily_logs_insert_self ON public.daily_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND log_role = public.current_user_role()
    AND public.current_user_role() IN ('staff', 'intern')
  );

CREATE POLICY daily_logs_update_self ON public.daily_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'admin');
