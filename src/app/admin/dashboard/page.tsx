"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  Kanban,
  Camera,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowRight,
  Share2,
  FileText,
  MapPin,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import type { RequisitionItem } from "@/lib/requisitions/store";
import type { DashboardKpiData, CalendarShootItem } from "@/lib/calendar/store";
import { ApproveAndAssignModal } from "@/components/tasks/ApproveAndAssignModal";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";
import type { EnrichedTask, ShootSlipData } from "@/lib/tasks/store";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardKpiData | null>(null);
  const [loading, setLoading] = useState(true);

  // Rejection modal state
  const [rejectingReq, setRejectingReq] = useState<RequisitionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [rejectingLoading, setRejectingLoading] = useState(false);

  // Approve & Assign Modal state
  const [approvingReq, setApprovingReq] = useState<RequisitionItem | null>(null);

  // Shoot Slip Modal state
  const [activeSlip, setActiveSlip] = useState<ShootSlipData | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Approve Success
  const handleApproveSuccess = (_task: EnrichedTask, slip: ShootSlipData) => {
    setApprovingReq(null);
    setActiveSlip(slip);
    setShowSlipModal(true);
    fetchDashboardData();
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;

    if (!rejectionReason.trim()) {
      setRejectionError("বাতিলকরণের কারণ উল্লেখ করা বাধ্যতামূলক।");
      return;
    }

    setRejectingLoading(true);
    setRejectionError(null);

    try {
      const res = await fetch(`/api/requisitions/${rejectingReq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejection_reason: rejectionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "রিকুইজিশন বাতিল করতে ব্যর্থ হয়েছে");
      }

      setRejectingReq(null);
      setRejectionReason("");
      fetchDashboardData();
    } catch (err: unknown) {
      setRejectionError(
        err instanceof Error ? err.message : "বাতিলকরণ ব্যর্থ হয়েছে"
      );
    } finally {
      setRejectingLoading(false);
    }
  };

  // Quick Slip action from Calendar Preview
  const handleQuickSlip = (shoot: CalendarShootItem) => {
    setActiveSlip(shoot.slip);
    setShowSlipModal(true);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
        <p className="text-xs text-slate-500 font-medium">
          লাইভ ড্যাশবোর্ড ডাটা লোড হচ্ছে...
        </p>
      </div>
    );
  }

  const kpis = data?.gear_kpi || { total: 0, available: 0, in_use: 0, maintenance: 0 };
  const progress = data?.task_board_progress || {
    assigned: 0,
    editing: 0,
    review: 0,
    completed: 0,
    total: 0,
  };
  const queue = data?.approval_queue || [];
  const gearRows = data?.gear_stock_live || [];
  const upcomingShoots = data?.calendar_preview_next_7_days || [];

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* 1. Top Emerald Glassmorphic Banner */}
      <div className="glass-emerald-card rounded-2xl p-5 md:p-8 border border-emerald-600/20 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50">
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>মিডিয়া হেড ও কেন্দ্রীয় অ্যাডমিন ড্যাশবোর্ড • Media Head Control</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
            সেন্ট্রাল মিডিয়া অ্যাডমিনিস্ট্রেশন হাব
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের সকল কোর্সের রিকুইজিশন
            অনুমোদন, গিয়ার বরাদ্দ, কেন্দ্রীয় টাস্ক বোর্ড ও শিডিউল ট্র্যাকিং।
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link
              href="/admin/requisitions"
              id="dashboard-nav-requisitions-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              <span>অনুমোদন কিউ ({data?.pending_requisitions_count || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/calendar"
              id="dashboard-nav-calendar-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold border border-slate-200/90 shadow-xs transition-all"
            >
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>মাস্টার ক্যালেন্ডার</span>
            </Link>

            <Link
              href="/admin/tasks"
              id="dashboard-nav-tasks-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold border border-slate-200/90 shadow-xs transition-all"
            >
              <Kanban className="w-4 h-4 text-[#0F766E]" />
              <span>টাস্ক বোর্ড</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top 3 Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
        {/* KPI 1: Pending Requisitions */}
        <Link
          href="/admin/requisitions"
          id="kpi-card-pending-requisitions"
          className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-amber-400/60 hover:shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">
              পেন্ডিং রিকুইজিশন • Pending
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                id="kpi-pending-count"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900"
              >
                {data?.pending_requisitions_count || 0}টি
              </span>
              <span className="text-[11px] font-semibold text-amber-600">
                রিভিউ আবশ্যক
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              অনুমোদনের অপেক্ষায় থাকা কোর্স শুট রিকুইজিশন
            </p>
          </div>
        </Link>

        {/* KPI 2: Active Tasks */}
        <Link
          href="/admin/tasks"
          id="kpi-card-active-tasks"
          className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">
              সক্রিয় টাস্ক • Active Tasks
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-[#0F766E] group-hover:scale-105 transition-transform">
              <Kanban className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                id="kpi-active-tasks-count"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900"
              >
                {data?.active_tasks_count || 0}টি
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                চলমান পাইপলাইন
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              মাঠে শুটিং, ফুটেজ আপলোড ও ভিডিও এডিটিং চলমান
            </p>
          </div>
        </Link>

        {/* KPI 3: Gear Status (In Use / Maint.) */}
        <Link
          href="/admin/gear"
          id="kpi-card-gear-status"
          className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-400/60 hover:shadow-sm transition-all flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">
              গিয়ার স্ট্যাটাস • Gear Status
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                id="kpi-gear-inuse-count"
                className="text-xl sm:text-2xl font-extrabold text-slate-900"
              >
                {kpis.in_use}টি ইন ইউজ
              </span>
              <span className="text-slate-300">•</span>
              <span
                id="kpi-gear-maint-count"
                className="text-xs sm:text-sm font-bold text-amber-600"
              >
                {kpis.maintenance}টি মেইনটেন্যান্স
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {kpis.available}টি ব্যবহারযোগ্য (মোট {kpis.total}টি ক্যামেরা ও গিয়ার)
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Main Dashboard Layout (Left: 8 cols, Right: 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Approval Queue + Bottom 2 Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Middle: Course Requisitions (Approval Queue) Table */}
          <div
            id="dashboard-approval-queue-section"
            className="glass-panel rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0F766E]" />
                  <span>কোর্স রিকুইজিশন অনুমোদন কিউ • Approval Queue</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  অনুমোদনের অপেক্ষায় থাকা কোর্স শুট রিকুইজিশনসমূহ
                </p>
              </div>

              <Link
                href="/admin/requisitions"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                <span>সব রিকুইজিশন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {queue.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  বর্তমানে কোনো পেন্ডিং রিকুইজিশন নেই
                </p>
                <p className="text-[11px] text-slate-400">
                  সকল কোর্স রিকুইজিশন যথাযথভাবে রিভিউ ও প্রসেস করা হয়েছে।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {queue.map((req) => (
                  <div
                    key={req.id}
                    id={`approval-queue-item-${req.id}`}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Requisition Meta */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {req.course_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono">
                          {req.course_code}
                        </span>
                        {req.is_emergency_override && (
                          <span
                            id={`override-badge-${req.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold tracking-wide uppercase"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Override</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1 text-[#0F766E] font-semibold font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{req.shoot_date}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.call_time}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.venue_name}</span>
                        </span>

                        <span className="text-slate-400">•</span>
                        <span>{req.format_duration}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {req.coordinator_name} ({req.coordinator_phone})
                        </span>
                      </div>

                      {req.is_emergency_override && req.override_reason && (
                        <p className="text-[11px] text-red-600 font-medium bg-red-50/80 px-2.5 py-1 rounded-lg border border-red-100">
                          জরুরি অনুমোদনের কারণ: {req.override_reason}
                        </p>
                      )}
                    </div>

                    {/* Actions: Approve & Assign / Reject */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                      <button
                        type="button"
                        id={`dashboard-approve-btn-${req.id}`}
                        onClick={() => setApprovingReq(req)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Assign</span>
                      </button>

                      <button
                        type="button"
                        id={`dashboard-reject-btn-${req.id}`}
                        onClick={() => {
                          setRejectingReq(req);
                          setRejectionReason("");
                          setRejectionError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-semibold border border-red-200 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom 2 Live Cards: Task Board Progress + Gear Stock Live */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Task Board Progress */}
            <div
              id="dashboard-task-progress-card"
              className="glass-panel p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#0F766E]" />
                  <span>টাস্ক বোর্ড অগ্রগতি • Task Progress</span>
                </h3>
                <Link
                  href="/admin/tasks"
                  className="text-[11px] font-semibold text-[#0F766E] hover:underline"
                >
                  বোর্ডে যান
                </Link>
              </div>

              {/* Stage Progress Pills */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-blue-700">
                    Assigned / Field
                  </span>
                  <span
                    id="progress-count-assigned"
                    className="text-lg font-bold text-blue-900 mt-1"
                  >
                    {progress.assigned}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-teal-700">
                    Editing
                  </span>
                  <span
                    id="progress-count-editing"
                    className="text-lg font-bold text-teal-900 mt-1"
                  >
                    {progress.editing}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-purple-700">
                    Review
                  </span>
                  <span
                    id="progress-count-review"
                    className="text-lg font-bold text-purple-900 mt-1"
                  >
                    {progress.review}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Completed
                  </span>
                  <span
                    id="progress-count-completed"
                    className="text-lg font-bold text-emerald-900 mt-1"
                  >
                    {progress.completed}টি
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>মোট অ্যাক্টিভ টাস্ক: {progress.total}টি</span>
                <span className="text-[#0F766E] font-semibold">
                  সম্পূর্ণতার হার:{" "}
                  {progress.total > 0
                    ? Math.round((progress.completed / progress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Card 2: Gear Stock Live */}
            <div
              id="dashboard-gear-stock-card"
              className="glass-panel p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>লাইভ গিয়ার স্টক • Gear Stock</span>
                </h3>
                <Link
                  href="/admin/gear"
                  className="text-[11px] font-semibold text-[#0F766E] hover:underline"
                >
                  স্টকে যান
                </Link>
              </div>

              {/* Scrollable Gear Rows */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {gearRows.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 space-y-1">
                    <Camera className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      কোনো গিয়ার তালিকাভুক্ত নেই
                    </p>
                  </div>
                ) : (
                  gearRows.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.serial_number}
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === "available"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "in_use"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status === "available"
                            ? "Available"
                            : item.status === "in_use"
                            ? "In Use"
                            : "Maintenance"}
                        </span>
                        {item.assigned_to && (
                          <p className="text-[9px] text-slate-500 truncate max-w-[100px]">
                            {item.assigned_to}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Master Calendar Preview (Next 7 Days) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>মাস্টার ক্যালেন্ডার (আগামী ৭ দিন)</span>
            </h2>
            <Link
              href="/admin/calendar"
              id="dashboard-view-full-calendar-link"
              className="text-[11px] font-semibold text-[#0F766E] hover:underline"
            >
              সম্পূর্ণ ক্যালেন্ডার
            </Link>
          </div>

          <div
            id="dashboard-calendar-preview-section"
            className="glass-panel p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
          >
            {upcomingShoots.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  আগামী ৭ দিনে কোনো শুটিং নির্ধারিত নেই
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingShoots.slice(0, 5).map((shoot) => (
                  <div
                    key={shoot.id}
                    id={`preview-shoot-card-${shoot.id}`}
                    className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-100 hover:border-emerald-500/40 hover:bg-white transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {shoot.course_name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#0F766E] font-mono shrink-0">
                        {shoot.shoot_date}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#0F766E]" />
                        <span>{shoot.call_time}</span>
                      </span>
                      <span className="truncate text-slate-500 max-w-[120px]">
                        {shoot.venue_name}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="truncate">টিম: {shoot.lead_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {shoot.slip.slip_number}
                      </span>
                    </div>

                    {/* Quick Slip & WhatsApp Actions */}
                    <div className="pt-1.5 border-t border-slate-200/70 flex items-center gap-2">
                      <button
                        type="button"
                        id={`quick-slip-btn-${shoot.id}`}
                        onClick={() => handleQuickSlip(shoot)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF Slip</span>
                      </button>

                      <a
                        href={shoot.slip.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`quick-whatsapp-btn-${shoot.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-[11px] font-medium transition-all"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve & Assign Modal */}
      <ApproveAndAssignModal
        requisition={approvingReq}
        isOpen={Boolean(approvingReq)}
        onClose={() => setApprovingReq(null)}
        onSuccess={handleApproveSuccess}
      />

      {/* Shoot Assignment Slip Modal */}
      <ShootAssignmentSlipModal
        slip={activeSlip}
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
      />

      {/* Reject Requisition Modal */}
      {rejectingReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          id="dashboard-reject-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingReq(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4"
            id="dashboard-reject-modal"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  রিকুইজিশন বাতিলকরণ • Reject Requisition
                </h3>
              </div>
              <button
                onClick={() => setRejectingReq(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                id="close-reject-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>কোর্স:</strong> {rejectingReq.course_name}
              </p>
              <p>
                <strong>তারিখ ও সময়:</strong> {rejectingReq.shoot_date} •{" "}
                {rejectingReq.call_time}
              </p>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="rejection-reason-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  বাতিলকরণের কারণ (বাধ্যতামূলক) *
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="যেমন: ৩ দিন পূর্বে রিকুইজিশন জমা দেওয়া আবশ্যক / একই সময়ে অন্য কোর্সের শুট রয়েছে..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {rejectionError && (
                <div
                  id="reject-error-banner"
                  className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectionError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  id="confirm-reject-btn"
                  disabled={rejectingLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {rejectingLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>বাতিল নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
