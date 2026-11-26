import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getRequisitionsForUser } from "@/lib/requisitions/store";
import { getAllGearItems } from "@/lib/gear/store";
import { getAllTasks } from "@/lib/tasks/store";
import { getDailyLogs } from "@/lib/daily-logs/store";
import { getAllDemoUsers, DEMO_COURSES } from "@/lib/auth/demo-users";

function isPlaceholderSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url.includes("your-project-ref") || key === "your-service-role-key" || !url || !key;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Requisition" | "Gear" | "Task" | "Course" | "User" | "Daily Log";
  url: string;
  badge?: string;
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const queryParam = request.nextUrl.searchParams.get("q") || "";
  const query = queryParam.trim().toLowerCase();

  if (!query) {
    return NextResponse.json({ success: true, results: [], total: 0 });
  }

  const role = currentUser.role;
  const results: SearchResultItem[] = [];

  // 1. Try Supabase live database if configured
  if (!isPlaceholderSupabaseConfig()) {
    try {
      const supabase = await createServerSupabase();

      // Admin searches
      if (role === "admin") {
        const [reqsRes, gearRes, tasksRes, usersRes, coursesRes] = await Promise.all([
          supabase
            .from("requisitions")
            .select("id, status, program_type, notes, courses(name), venues(name)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("gear_items")
            .select("id, name, serial_number, category, status, maintenance_note")
            .limit(100),
          supabase
            .from("tasks")
            .select("id, stage, requisitions(program_type, notes, courses(name), venues(name))")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("profiles")
            .select("id, full_name, role, phone")
            .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5),
          supabase
            .from("courses")
            .select("id, name, code")
            .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
            .limit(5),
        ]);

        if (reqsRes.data) {
          const matchedReqs = reqsRes.data.filter((item) => {
            const courseName = (item.courses as { name?: string } | null)?.name || "";
            const venueName = (item.venues as { name?: string } | null)?.name || "";
            return (
              courseName.toLowerCase().includes(query) ||
              venueName.toLowerCase().includes(query) ||
              String(item.program_type || "").toLowerCase().includes(query) ||
              String(item.notes || "").toLowerCase().includes(query)
            );
          });
          for (const item of matchedReqs.slice(0, 5)) {
            const courseName = (item.courses as { name?: string } | null)?.name || "";
            const venueName = (item.venues as { name?: string } | null)?.name || "";
            const displayTitle = courseName ? `${courseName} - ${item.program_type}` : item.program_type || "Requisition";
            results.push({
              id: item.id,
              title: displayTitle,
              subtitle: item.notes ? item.notes.slice(0, 60) : `${venueName || "Req"} • ${item.status}`,
              category: "Requisition",
              url: `/admin/requisitions?search=${encodeURIComponent(courseName || item.program_type)}`,
              badge: item.status,
            });
          }
        }

        if (gearRes.data) {
          const matchedGear = gearRes.data.filter((item) =>
            item.name.toLowerCase().includes(query) ||
            item.serial_number.toLowerCase().includes(query) ||
            String(item.category || "").toLowerCase().includes(query) ||
            String(item.maintenance_note || "").toLowerCase().includes(query)
          );
          for (const item of matchedGear.slice(0, 5)) {
            results.push({
              id: item.id,
              title: item.name,
              subtitle: `SN: ${item.serial_number} • ${item.category}`,
              category: "Gear",
              url: `/admin/gear?search=${encodeURIComponent(item.name)}`,
              badge: item.status,
            });
          }
        }

        if (tasksRes.data) {
          const matchedTasks = tasksRes.data.filter((item) => {
            const reqData = item.requisitions as {
              program_type?: string;
              notes?: string | null;
              courses?: { name?: string } | null;
              venues?: { name?: string } | null;
            } | null;
            return (
              String(item.stage || "").toLowerCase().includes(query) ||
              String(reqData?.program_type || "").toLowerCase().includes(query) ||
              String(reqData?.notes || "").toLowerCase().includes(query) ||
              String(reqData?.courses?.name || "").toLowerCase().includes(query) ||
              String(reqData?.venues?.name || "").toLowerCase().includes(query)
            );
          });
          for (const item of matchedTasks.slice(0, 5)) {
            const reqData = item.requisitions as {
              program_type?: string;
              notes?: string | null;
              courses?: { name?: string } | null;
            } | null;
            const titleText = reqData?.courses?.name
              ? `${reqData.courses.name} - ${reqData.program_type || "Task"}`
              : `Task #${item.id.slice(0, 8)}`;
            results.push({
              id: item.id,
              title: titleText,
              subtitle: reqData?.notes ? reqData.notes.slice(0, 60) : `Stage: ${item.stage}`,
              category: "Task",
              url: `/admin/tasks`,
              badge: item.stage,
            });
          }
        }

        if (usersRes.data) {
          for (const item of usersRes.data) {
            results.push({
              id: item.id,
              title: item.full_name,
              subtitle: `${item.phone} • ${item.role}`,
              category: "User",
              url: `/admin/users`,
              badge: item.role,
            });
          }
        }

        if (coursesRes.data) {
          for (const item of coursesRes.data) {
            results.push({
              id: item.id,
              title: item.name,
              subtitle: `Course Code: ${item.code}`,
              category: "Course",
              url: `/admin/requisitions`,
              badge: item.code,
            });
          }
        }

        return NextResponse.json({ success: true, results, total: results.length });
      }

      // Coordinator search: ONLY their course's requisitions
      if (role === "coordinator" && currentUser.course_id) {
        const { data: reqs } = await supabase
          .from("requisitions")
          .select("id, status, program_type, notes, courses(name), venues(name)")
          .eq("course_id", currentUser.course_id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (reqs) {
          const matchedReqs = reqs.filter((item) => {
            const venueName = (item.venues as { name?: string } | null)?.name || "";
            return (
              venueName.toLowerCase().includes(query) ||
              String(item.program_type || "").toLowerCase().includes(query) ||
              String(item.notes || "").toLowerCase().includes(query)
            );
          });
          for (const item of matchedReqs.slice(0, 10)) {
            const courseName = (item.courses as { name?: string } | null)?.name || "Course";
            const displayTitle = `${courseName} - ${item.program_type || "Request"}`;
            results.push({
              id: item.id,
              title: displayTitle,
              subtitle: item.notes ? item.notes.slice(0, 60) : `Status: ${item.status}`,
              category: "Requisition",
              url: `/coordinator/requests?search=${encodeURIComponent(item.program_type || "")}`,
              badge: item.status,
            });
          }
        }
        return NextResponse.json({ success: true, results, total: results.length });
      }

      // Staff or Intern search: Assigned tasks and daily logs
      if (role === "staff" || role === "intern") {
        const homeTasksRoute = role === "staff" ? "/staff/tasks" : "/intern/tasks";
        const homeLogsRoute = role === "staff" ? "/staff/daily-log" : "/intern/daily-log";

        const [tasksRes, logsRes] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, stage, lead_staff_id, task_assignees(user_id), requisitions(program_type, notes, courses(name))")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("daily_logs")
            .select("id, log_date, notes")
            .eq("user_id", currentUser.id)
            .ilike("notes", `%${query}%`)
            .limit(5),
        ]);

        if (tasksRes.data) {
          const matchedTasks = tasksRes.data.filter((item) => {
            const assignees = (item.task_assignees as Array<{ user_id: string }> | null) || [];
            const isAssigned =
              item.lead_staff_id === currentUser.id ||
              assignees.some((a) => a.user_id === currentUser.id);
            if (!isAssigned) return false;
            const reqData = item.requisitions as {
              program_type?: string;
              notes?: string | null;
              courses?: { name?: string } | null;
            } | null;
            return (
              String(item.stage || "").toLowerCase().includes(query) ||
              String(reqData?.program_type || "").toLowerCase().includes(query) ||
              String(reqData?.notes || "").toLowerCase().includes(query) ||
              String(reqData?.courses?.name || "").toLowerCase().includes(query)
            );
          });
          for (const item of matchedTasks.slice(0, 5)) {
            const reqData = item.requisitions as {
              program_type?: string;
              notes?: string | null;
              courses?: { name?: string } | null;
            } | null;
            const titleText = reqData?.courses?.name
              ? `${reqData.courses.name} - ${reqData.program_type || "Task"}`
              : `Task #${item.id.slice(0, 8)}`;
            results.push({
              id: item.id,
              title: titleText,
              subtitle: reqData?.notes ? reqData.notes.slice(0, 60) : `Stage: ${item.stage}`,
              category: "Task",
              url: homeTasksRoute,
              badge: item.stage,
            });
          }
        }

        if (logsRes.data) {
          for (const item of logsRes.data) {
            results.push({
              id: item.id,
              title: `Daily Log (${item.log_date})`,
              subtitle: item.notes ? item.notes.slice(0, 60) : item.log_date,
              category: "Daily Log",
              url: homeLogsRoute,
              badge: item.log_date,
            });
          }
        }

        return NextResponse.json({ success: true, results, total: results.length });
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  // 2. Authoritative Fallback In-Memory Stores
  if (role === "admin") {
    // Requisitions
    const allReqs = getRequisitionsForUser(currentUser);
    const matchedReqs = allReqs.filter(
      (r) =>
        r.course_name?.toLowerCase().includes(query) ||
        r.program_type?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query) ||
        r.venue_name?.toLowerCase().includes(query)
    );
    for (const r of matchedReqs.slice(0, 5)) {
      const displayTitle = `${r.course_name || "Course"} - ${r.program_type}`;
      results.push({
        id: r.id,
        title: displayTitle,
        subtitle: r.notes ? r.notes.slice(0, 60) : `${r.venue_name || "Venue"} • ${r.status}`,
        category: "Requisition",
        url: `/admin/requisitions?search=${encodeURIComponent(r.course_name || r.program_type)}`,
        badge: r.status,
      });
    }

    // Gear
    const allGear = getAllGearItems(currentUser);
    const matchedGear = allGear.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.serial_number.toLowerCase().includes(query) ||
        g.category.toLowerCase().includes(query) ||
        g.maintenance_note?.toLowerCase().includes(query)
    );
    for (const g of matchedGear.slice(0, 5)) {
      results.push({
        id: g.id,
        title: g.name,
        subtitle: `SN: ${g.serial_number} • ${g.category}`,
        category: "Gear",
        url: `/admin/gear?search=${encodeURIComponent(g.name)}`,
        badge: g.status,
      });
    }

    // Tasks
    const allTasks = getAllTasks(currentUser);
    const matchedTasks = allTasks.filter(
      (t) =>
        t.course_name?.toLowerCase().includes(query) ||
        t.program_type?.toLowerCase().includes(query) ||
        t.lead_name?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query) ||
        t.venue_name?.toLowerCase().includes(query)
    );
    for (const t of matchedTasks.slice(0, 5)) {
      results.push({
        id: t.id,
        title: `${t.course_name} - ${t.program_type}`,
        subtitle: `Lead: ${t.lead_name || "None"} • Stage: ${t.stage}`,
        category: "Task",
        url: `/admin/tasks`,
        badge: t.stage,
      });
    }

    // Users
    const allUsers = getAllDemoUsers();
    const matchedUsers = allUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.phone.includes(query) ||
        u.role.toLowerCase().includes(query)
    );
    for (const u of matchedUsers.slice(0, 5)) {
      results.push({
        id: u.id,
        title: u.full_name,
        subtitle: `${u.email} • ${u.role}`,
        category: "User",
        url: `/admin/users`,
        badge: u.role,
      });
    }

    // Courses
    const matchedCourses = DEMO_COURSES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
    for (const c of matchedCourses.slice(0, 5)) {
      results.push({
        id: c.id,
        title: c.name,
        subtitle: `Course Code: ${c.code}`,
        category: "Course",
        url: `/admin/requisitions`,
        badge: c.code,
      });
    }
  } else if (role === "coordinator") {
    // Only their course requisitions
    const userReqs = getRequisitionsForUser(currentUser);
    const matchedReqs = userReqs.filter(
      (r) =>
        r.program_type?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query) ||
        r.venue_name?.toLowerCase().includes(query)
    );
    for (const r of matchedReqs.slice(0, 10)) {
      const displayTitle = `${r.course_name || "Course"} - ${r.program_type}`;
      results.push({
        id: r.id,
        title: displayTitle,
        subtitle: r.notes ? r.notes.slice(0, 60) : `${r.venue_name || "Venue"} • ${r.status}`,
        category: "Requisition",
        url: `/coordinator/requests?search=${encodeURIComponent(r.program_type)}`,
        badge: r.status,
      });
    }
  } else if (role === "staff" || role === "intern") {
    const homeTasksRoute = role === "staff" ? "/staff/tasks" : "/intern/tasks";
    const homeLogsRoute = role === "staff" ? "/staff/daily-log" : "/intern/daily-log";

    // Tasks assigned to user
    const userTasks = getAllTasks(currentUser);
    const matchedTasks = userTasks.filter(
      (t) =>
        t.course_name?.toLowerCase().includes(query) ||
        t.program_type?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
    );
    for (const t of matchedTasks.slice(0, 5)) {
      results.push({
        id: t.id,
        title: `${t.course_name} - ${t.program_type}`,
        subtitle: `Stage: ${t.stage}`,
        category: "Task",
        url: homeTasksRoute,
        badge: t.stage,
      });
    }

    // Daily Logs by user
    const { logs } = getDailyLogs({}, currentUser);
    const matchedLogs = logs.filter(
      (l) =>
        l.notes?.toLowerCase().includes(query) ||
        l.task_title?.toLowerCase().includes(query) ||
        l.course_name?.toLowerCase().includes(query)
    );
    for (const l of matchedLogs.slice(0, 5)) {
      results.push({
        id: l.id,
        title: l.task_title || `Daily Log (${l.log_date})`,
        subtitle: l.notes ? l.notes.slice(0, 60) : l.log_date,
        category: "Daily Log",
        url: homeLogsRoute,
        badge: l.log_date,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    total: results.length,
  });
}
