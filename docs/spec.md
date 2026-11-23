# ASSDI Central Media Management Portal — Complete Functional Specification

## 1. Scope Boundary
- **Included:** As-Sunnah Skill Development Institute (ASSDI) Media Team and all its courses/trades (Requisitions, Gear Stock, Central Task Board, Staff & Intern Daily Logs, Master Calendar, Work History Analytics, Automated Shoot Assignment Slip, User Management).
- **Excluded:** Other As-Sunnah Foundation wings (e.g., Human Welfare / মানবসেবা Department).

## 2. User Roles, Routes & Permissions (RBAC + RLS)
1. **Media Head / Admin (`/admin/*`)**
   - Routes: `/admin/dashboard`, `/admin/requisitions`, `/admin/calendar`, `/admin/tasks`, `/admin/gear`, `/admin/logs`, `/admin/reports`, `/admin/users`.
   - Powers: View/Approve/Reject all requisitions (with mandatory `rejection_reason`), Emergency Override (with mandatory `override_reason`), assign 2–3 member shoot teams & gear, manage Master Gear Inventory (Check-Out/Check-In), view Master Calendar & Work History Analytics, create/deactivate users and assign roles/courses via `/admin/users`.
2. **Course Coordinator (`/coordinator/*`)**
   - Routes: `/coordinator/new`, `/coordinator/requests`.
   - Powers: Submit requisitions respecting the 3-day / 7-day lead-time rule, track live status (`Pending`, `Approved`, `Shoot Done`, `Delivered`, `Rejected` with reason), download final Google Drive video links.
   - Strict Isolation: Can ONLY view/insert requisitions where `course_id = own_course_id`. Zero visibility into other courses.
3. **Permanent Staff (`/staff/*`)**
   - Routes: `/staff/tasks`, `/staff/daily-log`, `/staff/intern-status`.
   - Powers: View assigned tasks & deadlines, submit 5-category daily worklogs, and as Project Lead (`lead_staff_id = auth.uid()`) update intern/task stages (`Shoot Done`, `Editing`, `Review`) and attach final Google Drive links.
4. **Intern / Trainee (`/intern/*`)**
   - Routes: `/intern/schedule`, `/intern/daily-log`, `/intern/tasks`.
   - Powers: 100% mobile-first view of assigned shoots (call time, venue, team), submit daily worklogs (hours worked, indoor/outdoor, raw footage uploaded to Drive). Marking `raw_footage_uploaded = true` automatically syncs to the parent task card.

## 3. Core Modules (100% Proposal Coverage)
### Module A: Smart Course Requisition Portal
- **Courses Dropdown:** Refrigeration & Air Conditioning (RAC), Motorcycle Servicing, Mobile Servicing, Electrical, SBMC (Bakery & Pastry), English Language, The Art of Creation, Professional Cooking, Dawah (seeded in `courses` table).
- **Lead-Time Rule (App + PostgreSQL Trigger):**
  - Routine / Short shoots (`visitor_reel`, `promotional_video`, `workshop`): minimum **3 days** prior to `shoot_date` (Asia/Dhaka date).
  - Major Events / Documentaries (`orientation`, `final_exam`, `documentary`): minimum **7 days** prior to `shoot_date`.
  - Emergency Override: ONLY `admin` can bypass with `is_emergency_override = true` and mandatory `override_reason`.
- **Technical Fields:** `program_type`, `format_duration` (`30-40s Reel` vs `3-5m Documentary`), `framing_type` (`vertical_9_16` vs `horizontal_16_9`), `venue_id` (`50 Katha Campus`, `Kazibari Branch`, `Lab Room`), `shoot_date`, `call_time`, `coordinator_phone`.
- **Rejection Flow:** Rejecting requires `rejection_reason` (DB CHECK enforced), displayed clearly on `/coordinator/requests`.

### Module B: Equipment & Camera-Gear Stock Management
- **Master Inventory (`gear_items`):** Camera bodies (`Sony FX3`, `Sony FX30`, `Sony A7C`), Lenses (`Sony 24-105mm`), Drones (`DJI Mini 3 Pro`, `DJI Air 3S`), Gimbals (`DJI RS 4`, `DJI RS 5`), Microphones, Lights, Memory Cards — each with unique `serial_number` and live status (`available`, `in_use`, `maintenance`).
- **Task-Based Check-Out & Double-Booking Prevention:** Enforced at database level via PostgreSQL `EXCLUDE USING gist (gear_id WITH =, time_window WITH &&) WHERE (returned_at IS NULL)`. Conflicting bookings return a clear user-facing error.
- **Return & Condition Check-In:** Returns item to `available` (or `maintenance` if damage/battery/SD card issue is flagged in `return_condition_note`).

### Module C: Central Task Board (6-Stage Pipeline)
- Approving a requisition atomically creates a task card in `tasks`.
- **6 Internal Stages:** `pending` → `shoot_assigned` → `shoot_done` → `editing` → `review` → `completed`.
- **Coordinator Status Mapping:**
  - Requisition `pending` → `Pending`
  - Requisition `approved` / Task `shoot_assigned` → `Approved`
  - Task `shoot_done` / `editing` / `review` → `Shoot Done`
  - Task `completed` (with `final_drive_url`) → `Delivered`
  - Requisition `rejected` → `Rejected`
- **Card Details:** 2–3 assigned team members, live deadline countdown, raw footage uploaded indicator, final Google Drive URL.

### Module D: Staff & Intern Daily Worklogs
- **Permanent Staff:** 5 categories (`daily_cinematography`, `video_editing`, `book_review`, `script_research`, `content_management`) + `hours_spent` + `notes`.
- **Intern / Trainee:** Mobile-first form with `hours_spent`, `shoot_location_type` (`indoor` / `outdoor`), `raw_footage_uploaded` (boolean), optional `task_id` link, and `notes`. LocalStorage draft auto-save for weak outdoor networks.

### Module E: Master Calendar & Automated Shoot Assignment Slip
- **Master Calendar:** Tomorrow, Next 3 Days, and Next 7 Days chronological schedule showing Course, Call Time, Venue, Assigned Team, and Gear.
- **Automated Shoot Assignment Slip:** Auto-generated upon team/gear assignment with Team Members, Phone Numbers, Venue, Call Time, and Gear Serial List — 1-click Print/PDF download + zero-cost `wa.me` formatted WhatsApp share link.

### Module F: Work History & Analytics Reports
- Filters: Member Name, Role (`staff` / `intern`), Date Period (`daily`, `weekly`, `monthly`, or custom range).
- Metrics: Completed projects count, total field vs editing hours, on-time deadline compliance %, and UTF-8 CSV export.

## 4. UI/UX & Approved Dependencies
- **Visual Style:** Clean, high-contrast institutional design (`#0F172A` dark slate text, `#0F766E` deep emerald accent) with subtle frosted glassmorphism panels on desktop and ultra-crisp 1-column cards + bottom navigation on mobile (`390px`).
- **Approved Packages:** `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/*` (via shadcn/ui), `vitest`, `@playwright/test`, `tsx`.
