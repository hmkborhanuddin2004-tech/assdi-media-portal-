# ASSDI Central Media Management Portal — Agent Engineering Contract

Read `docs/spec.md`, `docs/data-model.md`, `feature_list.json`, and `PROGRESS.md` before writing code.

## 1. Stack & Architecture (Strict)
- Framework: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Database & Auth: Supabase PostgreSQL + `@supabase/ssr` (NEVER use deprecated `@supabase/auth-helpers-nextjs`)
- Validation & Dates: React Hook Form + Zod + `date-fns`
- Testing: Vitest + Playwright (Desktop 1280px & Mobile 390px)
- Scope: ASSDI Media Department & its courses ONLY. Never add Human Welfare or other foundation wings.

## 2. Exact Executable Commands
- Install/Setup check: `bash init.sh`
- Typecheck & Lint: `pnpm typecheck && pnpm lint`
- Unit & DB Tests: `pnpm test`
- Single Test File: `pnpm vitest run <path/to/file.test.ts>`
- E2E Browser Tests: `pnpm test:e2e`
- Production Build: `pnpm build`

## 3. Autonomous Build → Test → Bug-Fix → Verify Loop
Work on ONE `feature_list.json` step at a time in strict order (Step 1 → Step 9):
1. Read `PROGRESS.md` and `git log -n 10 --oneline` to inspect current state.
2. Implement ONLY the active step cleanly with zero placeholders or `TODO`s.
3. Run all 4 Verification Gates:
   - Gate 1 (Static): `pnpm typecheck && pnpm lint && pnpm build` must exit 0.
   - Gate 2 (DB/Security): Run automated DB/RLS/Trigger/Concurrency tests (including direct `supabase-js` bypass attempts).
   - Gate 3 (E2E UI): Run Playwright at `390x844` (mobile) and `1280x800` (desktop) with 0 console/page errors and 0 horizontal overflow.
   - Gate 4 (Fresh Diff Audit): Review `git diff` against `docs/spec.md` and `docs/data-model.md`.
4. If ANY gate fails: diagnose root cause, fix the source code (NEVER weaken tests), re-run the failed test first, then re-run all 4 gates.
5. Only when ALL 4 gates pass: flip `"passes": true` in `feature_list.json`, update `PROGRESS.md`, and create a clean git commit.

## 4. Failing-Suite Protocol
- Fix source code, never weaken assertions or delete failing tests.
- Debug with a single failing test file before re-running the full suite.
- If the exact same failure persists after 3 targeted fix attempts, stop, log exact diagnostics in `PROGRESS.md`, and ask the human.

## 5. Hard Prohibitions
- NEVER commit or expose `SUPABASE_SERVICE_ROLE_KEY` in client components or `NEXT_PUBLIC_*` vars.
- NEVER use `test.skip`, `.only`, or delete existing tests.
- NEVER edit `.env.local` or install new npm packages without human approval (only approved dependencies listed in `docs/spec.md`).
- NEVER leave public self-sign-up enabled in Supabase Auth; user creation is strictly via `/admin/users` (server-only `service_role`).
