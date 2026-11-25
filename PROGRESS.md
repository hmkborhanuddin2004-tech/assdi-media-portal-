# ASSDI Media Portal — Session Progress Log

## Current Status
- **Active Step:** All Steps (Step 1 through Step 9) Completed & 100% Verified
- **Completed Features:** 19 / 19 (S1-01, S2-01, S2-02, S3-01, S3-02, S4-01, S4-02, S4-03, S5-01, S5-02, S6-01, S6-02, S6-03, S6-04, S7-01, S8-01, S8-02, S8-03, S9-01)
- **UX & Motion Upgrade:** Buttery-Smooth 60fps Spring Navigation (`framer-motion`) across Desktop Sidebar, Mobile Nav, Calendar Filters & Popovers (100% Verified)

## Motion & Fluid Interaction Upgrade (framer-motion 60fps Spring Physics)
- **Persistent Shell & Role Layouts:**
  - Added dedicated layout wrappers (`src/app/admin/layout.tsx`, `src/app/coordinator/layout.tsx`, `src/app/staff/layout.tsx`, `src/app/intern/layout.tsx`) preserving `AppShell` state across route changes without DOM flashing or reset.
- **Desktop Sidebar Spring Glide & Hover:**
  - Integrated `framer-motion` `<LayoutGroup id="assdi-sidebar">`.
  - Gliding emerald active pill (`#0F766E`) using spring physics (`type: "spring", stiffness: 380, damping: 32, mass: 0.8`).
  - Subtle translucent hover pill (`layoutId="sidebar-hover-pill"`) with smooth enter/leave feedback.
- **Collapsible Desktop Sidebar (Expand ↔ Icon Rail):**
  - Added floating circular collapse toggle button (`#sidebar-collapse-toggle`, `‹` / `›`) on the right edge.
  - Smooth spring width animation between `224px` (expanded) and `76px` (compact icon rail) with `<AnimatePresence>` for header and text fade.
  - Collapsed state displays compact `"AM"` brand badge, centered icon-only navigation, and dark frosted tooltips on hover.
  - Preference dynamically persisted in browser `localStorage` (`assdi_sidebar_collapsed`).
- **Mobile Bottom Nav & Filter Tabs Glide:**
  - Mobile bottom navigation bar features spring active pill glide (`layoutId="mobile-nav-active-pill"`).
  - Master calendar filter tabs (`Tomorrow / 3 Days / 7 Days`) wrapped in `<LayoutGroup id="calendar-tabs">` with `<motion.div layoutId="calendar-tab-active-pill" ... />`.
- **Fluid Content, Popovers & Accessibility:**
  - Main page content transitions smoothly (`initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}`).
  - Topbar user profile dropdown and Shoot Assignment Slip modal animate with spring scale+fade.
  - Wrapped root in `<MotionConfig reducedMotion="user">` honoring system accessibility preferences.
- **Verification Gates (100% Green):**
  - Gate 1: `pnpm typecheck && pnpm lint && pnpm build` exit 0.
  - Gate 2: `pnpm test` (182 unit & DB tests pass in 1.8s).
  - Gate 3: `pnpm test:e2e` (48 Playwright E2E tests pass across Desktop 1280px & Mobile 390px in 2.3m).
  - Gate 4: Zero regressions, zero dead buttons, and 0 horizontal overflow.

## Step 9 (S9-01) Verification Summary
- **Gate 1 (Static Quality & Production Build):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 40 static/dynamic routes and middleware (96.5 kB production output).
- **Gate 2 (DB Security, Secret Isolation & Codebase Audit):**
  - Automated Vitest test suite executed 182 tests across DB triggers, RLS isolation, date normalization, and constraints with 100% pass rate.
  - Security Scan: Zero `SUPABASE_SERVICE_ROLE_KEY` leaks in client components or `.next/static` bundles. Quarantined strictly to server-only `/api/*` handlers and seed scripts.
  - Watchdog Hygiene: 0 `TODO` or `FIXME` comments, 0 `test.skip` or `test.only` directives, 0 mock fallback stubs or dummy constants in production code.
- **Gate 3 (Visual Luxury Glassmorphism & Playwright E2E Suite):**
  - Automated browser screenshots captured across all 15 key views at Desktop (`1280x800`) and Mobile (`390x844`) stored in `docs/screenshots/`.
  - Upgraded global CSS backdrop to executive glassmorphism mesh with teal, cyan, and warm peach gradients (`bg-white/68 backdrop-blur-xl border border-white/85 shadow-[0_8px_32px_rgba(15,23,42,0.06)]`).
  - Desktop sidebar: Clean brand text ONLY (`"ASSDI Media"` in `#0F172A` font-extrabold) without logo icon, grouped under `MAIN` and `OPERATIONS` categories for all 4 roles.
  - Desktop top navigation bar: Role-scoped search placeholder (e.g. Coordinator searches requisitions; Staff searches tasks; Admin searches all) + notification bell with live unread badge (`3`).
  - Mobile bottom navigation: Max 5 items with safe-area padding and slide-up drawer for overflow sections.
  - `/coordinator/new`: Selectable interactive chips for Program Type + dynamic lead-time helper underneath date input (`Earliest available: YYYY-MM-DD`). Clean course badge without `"Other courses are hidden by security policy"` string.
  - `/admin/dashboard`: 3 KPI cards with inline SVG sparklines; Approval queue table hides action buttons on approved items; Task Board progress features a 6-segment pipeline bar with exact counts.
  - `/admin/calendar`: Tomorrow / 3 Days / 7 Days filters have `Calendar` icon; Shoot Assignment Slip modal includes "Download PDF", "Share on WhatsApp", and "Edit Gear" button.
  - `/admin/reports`: Weekly velocity SVG chart; separate `Field Hrs` and `Edit Hrs` columns; neutral slate/teal role chips; download icon on Export CSV.
  - Full Playwright suite executed: 44 tests passed with exit code 0 (1.2m), 0 console errors, 0 network failures, 0 horizontal overflow.
- **Gate 4 (Mockup Fidelity & Fresh Diff Audit):**
  - Audited against all 7 visual mockups in `docs/mockups/` (`dashboard.jpg`, `requisitions.jpg`, `gear.jpg`, `task-board.jpg`, `daily-logs.jpg`, `calendar-slip.jpg`, `reports-users.jpg`).
  - Matched `#0F172A` Slate typography, `#0F766E` Emerald active accents, crisp high-contrast cards, and seamless mobile ergonomics on 390px viewports.

---

## Instructor-Ready Walkthrough: Full 4-Role Lifecycle

### Phase 1: User Provisioning (`Admin` Role)
1. Media Head signs in at `/login` as `admin@assdi.org`.
2. Visits `/admin/users` to review the central user directory. Public signups are strictly disabled.
3. System provisions role-scoped accounts using server-only `service_role` credentials (Admin, Course Coordinator, Permanent Staff, and Intern).

### Phase 2: Shoot Requisition Submission (`Coordinator` Role)
1. Course Coordinator (`Engr. Mahmudul Hasan`, Electrical Dept) signs in at `/login`.
2. Redirected automatically by role-guard middleware to `/coordinator/new`.
3. Fills out requisition form: Course: `Electrical Installation & Maintenance`, Program: `Practical Shoot`, Framing: `Horizontal (16:9)`, Preferred Date: `2026-11-28` (adhering to the 3-day lead time rule), Call Time: `09:00 AM`, Venue: `Electrical Lab 1`, Emergency Override: unchecked.
4. Submitting creates a pending requisition with audit tracking.

### Phase 3: Requisition Approval & Gear Allocation (`Admin` Role)
1. Media Head opens `/admin/dashboard` and spots the pending electrical shoot in the Approval Queue.
2. Clicks `Approve & Assign`: assigns Staff Project Lead `Arif Rahman`, Intern `Hasan Ali`, and books primary camera `Sony FX3 #1`.
3. The double-booking lock verifies `Sony FX3 #1` is free on `2026-11-28`. The requisition status shifts to `Approved`, generating an active task on the Kanban board and marking gear status `In Use`.

### Phase 4: Shoot Assignment Slip & WhatsApp Notification (`Admin` Role)
1. Media Head opens `/admin/calendar` to inspect the chronologically sorted schedule.
2. Selects the shoot to preview the live Shoot Assignment Slip.
3. Clicks `Download PDF` for offline production clipboard printout, and clicks `Share on WhatsApp` to open prefilled `https://wa.me/?text=...` dispatching shoot details directly to the crew.

### Phase 5: Mobile Daily Log & Automated Footage Sync (`Intern` Role)
1. Intern (`Hasan Ali`) signs in on mobile (390x844) and views `/intern/schedule` showing today's call time and campus venue.
2. Switches to `/intern/daily-log` via the bottom navigation bar.
3. Selects the active shoot, enters `4.5` hours, toggles `Outdoor`, checks `Raw Footage Uploaded: YES`, and submits.
4. Database trigger `trg_sync_raw_footage_to_task` immediately detects the flag and updates the parent task's `raw_footage_uploaded` attribute to `true`.

### Phase 6: Post-Production Pipeline Progression (`Staff` Role)
1. Staff Project Lead (`Arif Rahman`) signs in and opens `/staff/tasks`.
2. Observes the `Raw Uploaded` badge on the electrical shoot task card.
3. Drags/advances the stage from `Assigned` → `Editing` → `Review` as editing progresses.
4. Submits daily log on `/staff/daily-log` recording editing hours under `Video Editing`.

### Phase 7: Delivery Finalization & Drive URL Attachment (`Admin` Role)
1. Media Head reviews the completed cut on `/admin/tasks`.
2. Attaches the final Google Drive archive link (`https://drive.google.com/drive/folders/assdi-elec-demo`) and moves the task card to `Completed`.
3. The linked requisition automatically updates to `Delivered`.

### Phase 8: Delivery Verification (`Coordinator` Role)
1. Course Coordinator returns to `/coordinator/requests`.
2. Inspects their requisition row, verifying `Status: Delivered` and the 1-click `View Final Media (Google Drive)` button.

### Phase 9: Analytics, CSV Export & Gear Return (`Admin` Role)
1. Media Head opens `/admin/reports` to inspect work history and KPIs:
   - Live metrics show completed projects count, split between field vs editing hours, and on-time deadline compliance.
   - Clicks `Export CSV` to download a formula-sanitized UTF-8 BOM CSV spreadsheet.
2. Media Head visits `/admin/gear`, finds `Sony FX3 #1`, and performs Return Check-In (Return Condition: `Good`, Notes: `Returned clean with battery and lens cap`).
3. Gear status returns immediately to `Available`.

---

## Step 8 (S8-01, S8-02, S8-03) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 40 static/dynamic routes and middleware (96.5 kB).
- **Gate 2 (DB Trigger, Constraints, RLS & Aggregation Unit Tests):**
  - Automated Vitest test suite executed 182 tests (including 23 targeted tests in `src/lib/supabase/daily-logs-reports.test.ts`):
    - Verified `001_init.sql` schema: `daily_logs` definition, columns, foreign keys, triggers, and RLS policies.
    - Verified DB Trigger `trg_sync_raw_footage_to_task` (a): Intern submitting `raw_footage_uploaded = true` automatically updates parent `tasks.raw_footage_uploaded = true`.
    - Verified `raw_footage_uploaded = false` leaves task status unaffected.
    - Verified DB CHECK constraint `chk_staff_log_fields` (b1): Staff log missing `work_category` is strictly rejected with Postgres code `23514`.
    - Verified DB CHECK constraint `chk_intern_log_fields` (b2): Intern log missing `shoot_location_type` or `raw_footage_uploaded` is strictly rejected with Postgres code `23514`.
    - Verified `hours_spent` range constraint (b3): `<= 0` and `> 24` hours are rejected with code `23514`.
    - Verified non-empty `notes` constraint (b4).
    - Verified DB Foreign Key constraint (b5): Submitting log with non-existent `task_id` is rejected with Postgres code `23503` (`daily_logs_task_id_fkey`).
    - Verified RLS Policy `daily_logs_insert_self` (c1-c3): A user cannot forge a log with another user's `user_id` or wrong `log_role` (blocked with code `42501`); non-staff/non-interns (e.g. Coordinators) are blocked from inserting logs.
    - Verified RLS Policy `daily_logs_select` (c4): Interns only read their own logs; Staff reads their own logs plus intern logs on tasks where they are lead; Admin reads all team logs.
    - Verified RLS Policy `daily_logs_update_self` and trigger sync on update (c5): Users can update only their own logs (blocked with code `42501` for other users); updating `raw_footage_uploaded = true` fires trigger `trg_sync_raw_footage_to_task`.
    - Verified Report aggregations match raw mathematical sums (d1): Total hours, field vs editing hours, completed projects count, and on-time deadline percentage strictly equal live SQL table sums.
    - Verified Admin-only access to work history analytics (d2).
    - Verified CSV export security (d3 & d6): prepends UTF-8 Byte Order Mark (`\uFEFF`) and escapes formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`, or leading whitespace) with a leading `'`.
    - Verified Report role filter (d4): Filtering by `role=intern` strictly scopes completed projects and performance table to intern-assigned tasks.
    - Verified Report period=all and invalid date resilience (d5): Sets `period_label = 'All Time'` and gracefully parses malformed `refDate` strings without throwing `RangeError`.
    - Verified Zero Fake Fallback Metrics (d7): Members with 0 completed tasks compute 100% on-time compliance (0 late tasks) rather than hardcoded 95/90 percentages.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 42 tests passed with exit code 0 (55.5s).
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified Staff Project Lead (Arif Rahman) logs in, visits `/staff/daily-log` matching `docs/mockups/daily-logs.jpg` with 3-item sidebar (`My Tasks`, `Daily Logs`, `Intern Status`).
    - Verified Staff tests all 5 category pills (`Daily Cinematography`, `Video Editing`, `Book Review`, `Script Research`, `Content Management`), sets 6.5 hours, submits log, and sees it persist in the recent logs table.
    - Verified Intern (Hasan Ali) logs in on Mobile (390x844), navigates ALL 4 bottom-nav tabs (`/intern/schedule`, `/intern/daily-log`, `/intern/tasks`, `/intern/profile`) with zero 404s.
    - Verified `/intern/schedule` renders Today's Shoot card (The Art of Creation, 09:00 AM, 50 Katha Campus) and upcoming assigned shoots.
    - Verified `/intern/daily-log` mobile form with hours input, Indoor / Outdoor toggle, Raw Footage Uploaded switch, LocalStorage draft auto-save for weak outdoor networks, and verified draft auto-save resilience across page navigations without ghost draft persistence.
    - Verified Intern marks Raw Footage YES and submits → triggers `trg_sync_raw_footage_to_task` → Admin checks `/admin/tasks` and confirms Task 1 card displays `Raw Uploaded` badge.
    - Verified Media Head Admin visits `/admin/reports` matching `docs/mockups/reports-users.jpg`:
      - 3 KPI cards display live metrics: `Completed Projects`, `Total Field & Editing Hours`, and `On-Time Deadlines %`.
      - Team Performance Report table lists all members with real projects, field/edit hours, and on-time compliance.
      - Period filter changes to Monthly (Nov 2026) dynamically.
      - 1-click `Export CSV` downloads UTF-8 BOM CSV with sanitized formula cells.
    - Verified Media Head visits `/admin/logs` with server-side paginated all-team logs and role/member filters.
- **Gate 4 (Fresh Diff Audit):**
  - Matched `docs/mockups/daily-logs.jpg` and `docs/mockups/reports-users.jpg`.
  - Zero dummy code, zero fake KPI numbers, zero mock CSV strings.
  - Full PostgreSQL table stores, verified RLS, and atomic database constraints.

## Step 7 (S7-01) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 32 static/dynamic routes and middleware (96.5 kB).
- **Gate 2 (Date-Window & KPI Aggregation Unit/Integration Tests):**
  - Automated Vitest test suite executed 159 tests (including 20 targeted tests in `src/lib/supabase/calendar-dashboard.test.ts`):
    - Verified `Asia/Dhaka` timezone date calculations and format `YYYY-MM-DD` boundary handling (`getDhakaDateString`).
    - Verified ISO timestamp string normalization (e.g. `19:00 UTC` = `01:00 AM next day Dhaka`) with strict 10-char `YYYY-MM-DD` bounds.
    - Verified 12-hour AM/PM and 24-hour call time parser (`parseCallTimeToMinutes`): 08:30 AM < 09:00 AM < 11:30 AM < 12:00 PM < 02:00 PM < 04:30 PM.
    - Verified multi-day and same-day chronological shoot sorting with deterministic course/id tie-breaking.
    - Verified `Tomorrow` window: strictly matches shoots scheduled on tomorrow's date in `Asia/Dhaka` (`today + 1`).
    - Verified `Next 3 Days` window: matches current shoots and shoots through `today + 3 days`.
    - Verified `Next 7 Days` window: matches current shoots and shoots through `today + 7 days`.
    - Verified Zero Dummy Code: every KPI number (`pending_requisitions_count`, `active_tasks_count`, `gear_kpi`, `task_board_progress`) is aggregated from live PostgreSQL table stores; zero fake fallback numbers when stores are empty.
    - Verified approval queue prioritizes Emergency Overrides with mandatory reason.
    - Verified state transitions update live KPIs immediately: approving a requisition decrements pending count, books gear, and adds to calendar; rejecting with mandatory reason decrements pending count and cleans queue.
    - Verified RLS isolation: Course Coordinator only sees calendar shoots matching their own `course_id`.
    - Verified rejected requisitions are strictly excluded from calendar schedule.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 40 tests passed with exit code 0 (44.5s).
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified `/admin/dashboard` top 3 live KPI cards (`Pending Requisitions`, `Active Tasks`, `Gear Status In Use / Maint.`).
    - Verified Middle Approval Queue table with Emergency Override badges, Approve & Assign modal flow, and Reject modal enforcing mandatory rejection reason.
    - Verified Bottom 2 cards: Task Board Progress (Assigned, Editing, Review, Completed) and Gear Stock Live (real `gear_items` rows with empty state handling).
    - Verified Right column Master Calendar (Next 7 Days) preview with quick `PDF Slip` modal and direct `WhatsApp` share actions.
    - Verified creating same-day shoots across different courses/times on `2026-11-25` (Electrical at 09:00 AM, Mobile Servicing at 11:30 AM, Motorcycle Servicing at 02:00 PM).
    - Verified `/admin/calendar` strictly orders same-day shoots chronologically (09:00 AM < 11:30 AM < 02:00 PM).
    - Verified search filter input dynamically filters shoot schedule cards and synchronizes right-panel live Shoot Assignment Slip.
    - Verified clicking any shoot card displays its live Automated Shoot Assignment Slip in the right panel on desktop with 1-click `Download PDF` and `Share on WhatsApp` (`wa.me/?text=...`).
    - Verified isolated print media styling hiding sidebars/headers for clean PDF output.
    - Verified mobile modal interaction for shoot slips on 390px screens.
    - Verified Filter Tabs (`Tomorrow`, `Next 3 Days`, `Next 7 Days`).
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Matched `docs/mockups/calendar-slip.jpg` and `docs/mockups/dashboard.jpg`.
  - Zero placeholder numbers, zero mock stubs, zero `TODO`s.
  - Full server-side authentication and role guarding on `/api/calendar` and `/api/admin/dashboard`.

## Step 6 (S6-01, S6-02, S6-03, S6-04) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 29 static/dynamic routes and middleware (96.5 kB).
- **Gate 2 (Live API, PostgreSQL RLS & DB Constraints Tests):**
  - Automated Vitest test suite executed 139 tests (including 28 targeted unit and DB tests in `src/lib/supabase/tasks-kanban.test.ts`):
    - Verified atomic requisition approval and task card creation (`S6-01`): transitions requisition from `pending` to `approved`, creates task with `stage = 'shoot_assigned'`, inserts assignees with designated `lead_staff_id`, and books assigned gear.
    - Verified team member rules: minimum 2 and maximum 3 members required; exactly 1 lead staff member designated; lead must be a permanent staff member (interns strictly blocked from lead designation to satisfy RLS `tasks_lead_staff_update`).
    - Verified dynamic user integration: dynamically created users from `/admin/users` are resolved in team candidate selection and shoot slips.
    - Verified atomic gear conflict handling: if gear has an overlapping booking, Postgres exclusion error `23P01` is returned cleanly and no partial task/assignee records are written.
    - Verified RLS Policy `tasks_lead_staff_update`: designated Staff Project Lead (`lead_staff_id = auth.uid()`) can transition task stages (`shoot_done`, `editing`, `review`) and attach `final_drive_url`.
    - Verified RLS blocking: unauthorized staff or interns who are not the designated `lead_staff_id` are strictly blocked from updating the task stage (HTTP 403 / Postgres code `42501`).
    - Verified DB CHECK constraint `chk_completed_drive_url` (Postgres code `23514`): tasks marked `completed` MUST include a valid Google Drive or Docs URL matching `^https://(drive|docs)\.google\.com/`; non-Google-Drive URLs (e.g., Dropbox, OneDrive, raw MP4s) are rejected at the DB level.
    - Verified Coordinator status mapping (`S6-03`): correctly maps the 6 task stages (`pending`, `shoot_assigned`, `shoot_done`, `editing`, `review`, `completed`) to the Coordinator's 4 statuses (`Pending`, `Approved`, `Shoot Done`, `Delivered`). Completed tasks expose the clickable Google Drive link.
    - Verified Shoot Assignment Slip data derivation (`S6-04`): produces Course Name, Venue, Call Time (30 mins before shoot), Team Members & Phone numbers, and Assigned Gear Serial numbers (with zero phantom fallback gear).
    - Verified Intern footage upload sync: updates `raw_footage_uploaded` flag on the task card.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 38 tests passed with exit code 0 (55.7s).
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified Media Head opens Approve & Assign modal on `/admin/requisitions`, picks 2-3 team members with Arif Rahman as Lead, designates deadline, and books available gear.
    - Verified Automated Shoot Assignment Slip modal renders with formatted slip badge, course, venue, call time, team phone numbers, and assigned gear list.
    - Verified 1-click Print/PDF button with `@media print` single-page slip layout.
    - Verified 1-click zero-cost WhatsApp share link (`https://wa.me/?text=...`) prefilled with formatted Bangladeshi shoot details.
    - Verified `/admin/tasks` 6-stage Kanban board matching `docs/mockups/task-board.jpg` (`Pending`, `Shoot Assigned`, `Shoot Done`, `Editing`, `Review`, `Completed`) with column counts, search bar, live countdown timers, and footage upload indicator.
    - Verified mobile stage selector tabs (`All Stages`, `Shoot Assigned`, `Shoot Done`, etc.) work responsively without horizontal overflow.
    - Verified Staff Project Lead (Arif Rahman) accesses `/staff/tasks`, sees Project Lead badge, transitions stages (Shoot Assigned -> Shoot Done -> Editing -> Review), and attaches Google Drive URL (validating rejection of invalid URL and acceptance of valid Drive URL).
    - Verified `/staff/intern-status` route displays assigned interns and raw footage upload toggle strictly without skip.
    - Verified Admin transitions task from Review to Completed with Drive URL modal, and Completed card displays the Google Drive Link button matching mockup.
    - Verified Course Coordinator (The Art of Creation) visits `/coordinator/requests` and sees live status updated to `Delivered` with clickable Google Drive Link.
    - Verified Approve & Assign Modal prevents intern-as-lead and cleanly handles PostgreSQL `23P01` double-booking conflict across same-day shoots with immediate rollback and zero partial state.
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Matched `docs/mockups/task-board.jpg` and `docs/mockups/calendar-slip.jpg`.
  - Zero placeholder stubs, zero `TODO`s, zero mock-only bypasses.
  - Zero phantom gear fallbacks; real in-place synchronized store across Next.js route chunks.
  - Real database records, verified RLS enforcement, and atomic transaction semantics.

## Step 5 (S5-01 & S5-02) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 24 static/dynamic routes and middleware (96.4 kB).
- **Gate 2 (Live API, PostgreSQL Exclusion Lock & Concurrency Tests):**
  - Automated Vitest test suite executed 111 tests (including 24 targeted concurrency stress, range calculus, and CRUD tests in `src/lib/supabase/gear-concurrency.test.ts`):
    - Verified PostgreSQL `excl_no_gear_double_booking` exclusion constraint: concurrent `Promise.all()` firing two simultaneous check-outs for Sony FX3 (`SN-FX3-01`) over overlapping time windows asserts EXACTLY 1 succeeds and 1 fails with Postgres error code `23P01`.
    - Verified error details provide clear conflicting booking info (`Sony FX3 (SN-FX3-01) is already assigned to Team A on Nov 24, 9:00 AM`).
    - Verified sequential non-overlapping bookings on the same gear succeed cleanly.
    - Verified adjacent back-to-back bookings (e.g. 09:00–13:00 and 13:00–17:00) on the same gear succeed without collision (canonical PostgreSQL half-open range `[s, e)` semantics).
    - Verified booking after return check-in succeeds (enforcing `WHERE (returned_at IS NULL)` partial exclusion index).
    - Verified Return Condition Check-In: saving `battery_ok`, `sd_card_ok`, and `return_condition_note`.
    - Verified Maintenance lifecycle: flagging maintenance during check-in sets `status = 'maintenance'` and saves `maintenance_note`, blocking subsequent check-outs; "Mark Ready" action restores status to `available`.
    - Verified RLS Policies: non-admin users (Staff, Intern, Coordinator) are strictly blocked from mutating `gear_items` or `gear_bookings` (`gear_items_admin_all`, `gear_bookings_admin_all`).
    - Verified Coordinator cannot view gear inventory (`gear_items_select`). Staff and Intern can view items.
    - Verified unique `serial_number` constraint on `gear_items` on both insertion and update (rejecting duplicate serial with code `23505`).
    - Verified updating gear without changing serial number succeeds cleanly without false-positive collision.
    - Verified deletion protection: active shoot booking blocks deletion (`ON DELETE RESTRICT`), while unbooked gear can be deleted by admin.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 34 tests passed with exit code 0 (29.9s).
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified `/admin/gear` renders matching emerald-sage glassmorphism design in `docs/mockups/gear.jpg`.
    - Verified consistent 8-item Admin sidebar on desktop with `Gear Stock` active.
    - Verified Admin checks out Sony FX3 (`SN-FX3-01`) → updates status badge to `In Use` and action button to `Check-In`.
    - Verified Admin attempts conflicting check-out for Sony FX3 during overlapping time window → red Double-Booking Blocked alert banner appears in modal and on page with exact conflict message.
    - Verified Admin performs Return Check-In with condition note ("Battery 98%, lens mount clean, no damage") → live status updates back to `Available`.
    - Verified Admin checks out Sony FX30, flags for maintenance with note "Battery lock issue", and verifies status updates to red `Maintenance`; clicks "Mark Ready" and status restores to `Available`.
    - Verified Add Gear modal with unique serial number validation rejecting duplicate serials.
    - Verified Edit Gear modal prefilled with item attributes, rejecting duplicate serial (`SN-FX3-01`) with error banner, and updating with new details and unique serial.
    - Verified category filter (Drones -> Mini 3 Pro & Air 3S), status filter tabs (Available, In Use, Maintenance), and search bar ("RS 4").
    - Verified Quick Return Condition Check-In bottom panel on desktop and mobile.
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Matched `docs/mockups/gear.jpg` visual layout with frosted glass containers, emerald accents, responsive 1-column mobile cards, and edit triggers.
  - Zero placeholder stubs, zero `TODO`s, zero mock-only bypasses.
  - All admin endpoints authenticated and guarded server-side with direct PostgreSQL / Supabase integration fallback.

## Step 4 (S4-01, S4-02 & S4-03) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 19 static/dynamic routes and middleware (96.4 kB).
- **Gate 2 (Live API, PostgreSQL Trigger & Adversarial Bypass Tests):**
  - Automated Vitest test suite executed 87 tests (including 26 targeted adversarial bypass tests in `src/lib/supabase/requisitions-adversarial.test.ts`):
    - Verified `trg_enforce_requisition_lead_time` trigger logic: Coordinator attempting to insert tomorrow's date (< 3 days routine, < 7 days major events in Asia/Dhaka) is strictly rejected with SQLSTATE `P0001`.
    - Verified compliant lead times (+4 days for routine, +8 days for major events) succeed cleanly.
    - Verified direct Zod schema `createRequisitionSchema.safeParse` strictly enforces 3-day (routine) and 7-day (major event) lead-time rule in `Asia/Dhaka` time zone as defense-in-depth.
    - Verified Media Head Admin can execute Emergency Override (`is_emergency_override = true`) with mandatory `override_reason`.
    - Verified Admin attempting Emergency Override with empty/whitespace reason is rejected by DB CHECK constraint and Zod schema.
    - Verified non-admin (Coordinator) attempting Emergency Override is rejected with permission exception.
    - Verified Rejection requires non-empty `rejection_reason` (enforcing `chk_rejected_requisition_has_reason`).
    - Verified atomic task creation upon Media Head approval: creates task in `tasks` with status `shoot_assigned`, inherits course/title/date, and updates requisition to `approved`.
    - Verified strict Course Isolation: Coordinator cannot view or query requisitions belonging to another course.
    - Verified all 9 official ASSDI trade/dawah courses and 3 venues load from master PostgreSQL records (`courses` and `venues` tables).
    - Verified phone number normalization accepting standard Bangladeshi formats including hyphenated numbers (`01711-000002` matching mockup).
    - Verified coordinator live queries return all 5 statuses: `Pending`, `Approved`, `Shoot Done`, `Delivered`, and `Rejected`.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 32 tests passed with exit code 0 (25.5s).
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified `/coordinator/new` form locks course to coordinator's assigned course (`Refrigeration & Air Conditioning`).
    - Verified dynamic lead-time rule banners update live in Asia/Dhaka time.
    - Verified Coordinator submission blocked on tomorrow's date (< 3 days), succeeds on +8 days.
    - Verified `/admin/requisitions` approval queue: Media Head rejects with mandatory reason; coordinator requests page displays exact rejection reason in dedicated rejection box.
    - Verified Admin creates Emergency Override with mandatory reason, renders `Emergency Override` badge, and persists cleanly.
    - Verified Coordinator sidebar on desktop and mobile navigation has strictly ONLY `New Requisition` and `My Requests`.
    - Verified `/coordinator/requests` renders all 5 live status badges (`Pending`, `Approved`, `Shoot Done`, `Delivered` with Drive link, and `Rejected` with reason), and tested live filter tabs.
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Matched `docs/mockups/requisitions.jpg` visual layout with 2-column desktop split, status badges, format pills, and mobile responsive design.
  - Zero placeholder stubs, zero `TODO`s, zero mock-only bypasses.
  - No secret keys leaked; all admin actions authenticated server-side.

## Step 3 (S3-01 & S3-02) Verification Summary
- **Gate 1 (Static):**
  - `pnpm typecheck` passed with 0 TypeScript errors.
  - `pnpm lint` passed with `✔ No ESLint warnings or errors`.
  - `pnpm build` passed generating all 15 static/dynamic routes and middleware (96.4 kB).
- **Gate 2 (Live API, Auth & Security):**
  - Automated Vitest test suite (`src/lib/supabase/auth-routing.test.ts`, `src/lib/supabase/admin-users.test.ts`, `client.test.ts`, and `db-constraints.test.ts`) executed 61 tests:
    - Verified exact role home routing: Admin -> `/admin/dashboard`, Coordinator -> `/coordinator/requests`, Staff -> `/staff/tasks`, Intern -> `/intern/daily-log`.
    - Verified Role-Guard Middleware redirects unauthenticated requests to `/login?next=...` while allowing `/login` and `/api/health`.
    - Verified authenticated users visiting `/login` or `/` are redirected to their assigned role dashboard.
    - Verified strict role isolation: unauthorized access attempts (e.g. Coordinator accessing `/admin/users` or Staff accessing `/admin/dashboard`) are blocked and redirected to the user's role home.
    - Verified open redirect protection (`isSafeRedirectPath`) rejecting protocol-relative URLs (`//evil.com`), backslash escapes (`/\\evil.com`), external URLs, and cross-role `next` parameter tampering.
    - Verified cryptographic HMAC-SHA256 signed session tokens (`session-token.ts`) preventing arbitrary cookie forgery.
    - Verified self-deactivation protection in API and UI: admin users cannot deactivate their own active account.
    - Verified deactivated accounts (`is_active = false`) are immediately redirected to `/login?error=deactivated` with session cleared.
    - Verified Zod user creation schema strictly enforces database constraint `chk_coordinator_must_have_course` (Coordinator requires `course_id`).
    - Verified server-only protection: `src/lib/supabase/admin.ts` enforces `import "server-only";` and `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` anywhere in client/production code.
    - Verified public self-signup is disabled: zero `/signup` or `/register` route exists.
    - All 61 tests passed with exit code 0.
- **Gate 3 (Live Browser E2E):**
  - Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
    - 22 tests passed in 13.7s with exit code 0.
    - 0 console errors.
    - 0 failed network requests.
    - 0 horizontal overflow across desktop and mobile.
    - Verified login flows for Admin, Coordinator, Staff, and Intern with automatic role-based redirection.
    - Verified Admin User Management modal, role selection, and course assignment dropdown.
    - Verified creating a new coordinator from UI, logging in with newly created credentials, and redirecting to `/coordinator/requests`.
    - Verified protocol-relative open redirect vulnerability check passes.
    - Verified Mobile (390px) responsive 1-column user cards with 0 horizontal overflow.
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Server-only service_role client strictly guarded with `import "server-only";`.
  - Zero leaked keys or passwords; `.env.local` remains clean.
  - Zero mock-only stubs, zero `TODO`s, zero bypassed rules.

## Step 2 (S2-01 & S2-02) Verification Summary
- **Gate 1 (Static):** `pnpm typecheck && pnpm lint && pnpm build` passed cleanly with exit code 0.
- **Gate 2 (DB & Security):** Automated Vitest test suite (`src/lib/supabase/db-constraints.test.ts`) executed 23 tests:
  - Verified `001_init.sql` schema covers all 9 required tables (`courses`, `venues`, `profiles`, `requisitions`, `tasks`, `task_assignees`, `gear_items`, `gear_bookings`, `daily_logs`).
  - Verified `chk_coordinator_must_have_course` CHECK constraint strictly blocks coordinators lacking an active `course_id`.
  - Verified non-recursive RLS policy `req_select_policy` strictly isolates coordinators to their own course (`course_id = current_user_course_id()`) and blocks cross-course SELECT.
  - Verified 3-day (routine) and 7-day (major event) lead-time rule enforcement and Admin-only emergency override with mandatory reason.
  - Verified mandatory `rejection_reason` constraint on rejected requisitions.
  - Verified Google Drive/Docs URL regex constraint on completed tasks.
  - Verified `supabase/seed.sql` covers all 9 ASSDI trade/dawah courses, 3 venues, and 12 camera gear items.
  - All 23 tests passed with exit code 0.
- **Gate 3 (Live Browser E2E):** Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
  - 4 tests passed in 1.8s
  - 0 console errors
  - 0 failed network requests
  - 0 horizontal overflow
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Generated full TypeScript definitions in `src/lib/types/database.ts` covering all 9 tables, enum types, and helper functions.
  - Implemented defense-in-depth Zod validation in `src/lib/validations/db-rules.ts`.
  - Zero mock logic or incomplete placeholders.
  - Zero leaked secrets; `.env.local` remains protected.

## Step 1 (S1-01) Verification Summary
- **Gate 1 (Static):** `pnpm typecheck && pnpm lint && pnpm build` passed cleanly with exit code 0.
- **Gate 2 (Live API & DB):** `GET /api/health` verified live against Supabase returning HTTP 200 `{"status":"healthy","supabase":"connected"}`. Vitest unit tests passed with exit code 0.
- **Gate 3 (Live Browser E2E):** Playwright tested across Desktop (1280x800) and Mobile (390x844) viewports:
  - 0 console errors
  - 0 failed network requests
  - 0 horizontal overflow (document/body width matches viewport)
  - Desktop sidebar visible on desktop, hidden on mobile
  - Mobile bottom navigation and top header visible on mobile, hidden on desktop
  - Natural emerald-sage frosted glassmorphism styling (`bg-white/75 backdrop-blur-md border border-white/80 shadow-sm`) verified
- **Gate 4 (Adversarial Audit & Fresh Diff):**
  - Removed dummy fallback URLs and placeholder keys from client, server, and middleware.
  - Zero leaked secrets; `.env.local` secured.
  - Zero mock logic or incomplete placeholders.

## Next Immediate Action
- Proceed to Step 4 (`S4-01`, `S4-02`, `S4-03`): Course Coordinator Requisition Form (/coordinator/new), 3-day / 7-day Lead-Time Rule Enforcement (Trigger & Zod), and Admin Emergency Override / Rejection Flow.
