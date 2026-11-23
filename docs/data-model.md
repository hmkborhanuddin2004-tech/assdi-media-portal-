# ASSDI Media Portal — Audited 9-Table Data Model & Security Architecture

## Tables Overview
1. `courses` — Master list of ASSDI courses/trades & Dawah.
2. `venues` — Master list of shooting venues (`50 Katha Campus`, `Kazibari Branch`, `Lab Room`).
3. `profiles` — Linked 1:1 to `auth.users(id)`. Enforces `CHECK (role <> 'coordinator' OR course_id IS NOT NULL)`.
4. `requisitions` — Course shoot requests with `BEFORE INSERT/UPDATE` lead-time trigger (3 days routine / 7 days major events, admin-only Emergency Override) and `CHECK` for mandatory `rejection_reason` and `override_reason`.
5. `tasks` — Auto-created on requisition approval (`requisition_id UNIQUE`), tracks 6 stages, `lead_staff_id`, `deadline_at`, `raw_footage_uploaded`, and `final_drive_url`.
6. `task_assignees` — Composite PK `(task_id, user_id)` assigning 2–3 staff/interns per shoot.
7. `gear_items` — Master equipment inventory with unique `serial_number` and `status` (`available`, `in_use`, `maintenance`).
8. `gear_bookings` — Links `gear_id` + `task_id` + `responsible_lead_id` + `time_window tstzrange` with `EXCLUDE USING gist (gear_id WITH =, time_window WITH &&) WHERE (returned_at IS NULL)`.
9. `daily_logs` — Unified worklog table with role-based `CHECK` constraints (`staff` requires `work_category`; `intern` requires `shoot_location_type` & `raw_footage_uploaded`) plus trigger syncing `raw_footage_uploaded` to `tasks`.

## Non-Recursive RLS Strategy
- Two `SECURITY DEFINER` helpers (`public.current_user_role()` and `public.current_user_course_id()`) read `public.profiles` safely without triggering infinite RLS recursion.
- All 9 tables have `ENABLE ROW LEVEL SECURITY`.
- Public self-sign-up MUST be disabled in Supabase Auth settings (`enable_signup = false`).

## Performance & Backup Policy
- Use Supabase Transaction Connection Pooling (PgBouncer) for serverless Next.js Server Actions.
- Composite B-Tree & GiST indexes cover all filter, calendar, booking, and report queries.
- Production Backup: Upgrade to Supabase Pro (automated daily backups / PITR) OR enable a weekly scheduled GitHub Action running `pg_dump` to encrypted private storage.
