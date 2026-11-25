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
import { motion } from "framer-motion";
import { SILKY_EASE, MODAL_TRANSITION, CARD_STAGGER_DELAY } from "@/lib/motion";
import { FrostedPageSkeleton } from "@/components/shell/FrostedSkeleton";
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
    return <FrostedPageSkeleton />;
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
    <div className="space-y-4 w-full max-w-full">
      {/* 1. Top Emerald Glassmorphic Banner */}
      <div className="glass-emerald-card rounded-[18px] p-5 md:p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f766e]/15 text-[#0b5a54] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>মিডিয়া হেড ও কেন্দ্রীয় অ্যাডমিন ড্যাশবোর্ড • Media Head Control</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0b1f3a] tracking-tight leading-snug">
            সেন্ট্রাল মিডিয়া অ্যাডমিনিস্ট্রেশন হাব
          </h1>

          <p className="text-xs sm:text-[13px] text-[#33475f] leading-relaxed font-medium">
            আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউটের সকল কোর্সের রিকুইজিশন
            অনুমোদন, গিয়ার বরাদ্দ, কেন্দ্রীয় টাস্ক বোর্ড ও শিডিউল ট্র্যাকিং।
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <Link
              href="/admin/requisitions"
              id="dashboard-nav-requisitions-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs sm:text-sm font-semibold shadow-[0_6px_14px_rgba(15,118,110,0.3)] transition-all"
            >
              <span>অনুমোদন কিউ ({data?.pending_requisitions_count || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/calendar"
              id="dashboard-nav-calendar-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/55 hover:bg-white/80 text-[#0b1f3a] text-xs sm:text-sm font-semibold border border-white/80 shadow-xs transition-all"
            >
              <Calendar className="w-4 h-4 text-[#0F766E]" />
              <span>মাস্টার ক্যালেন্ডার</span>
            </Link>

            <Link
              href="/admin/tasks"
              id="dashboard-nav-tasks-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/55 hover:bg-white/80 text-[#0b1f3a] text-xs sm:text-sm font-semibold border border-white/80 shadow-xs transition-all"
            >
              <Kanban className="w-4 h-4 text-[#0F766E]" />
              <span>টাস্ক বোর্ড</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top 3 Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {/* KPI 1: Pending Requisitions */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0, ease: SILKY_EASE }}
        >
          <Link
            href="/admin/requisitions"
            id="kpi-card-pending-requisitions"
            className="glass-panel p-4 sm:p-5 flex flex-col justify-between group h-full"
          >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f]">
              পেন্ডিং রিকুইজিশন • Pending
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-[#b45309] group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span
                  id="kpi-pending-count"
                  className="text-2xl sm:text-[26px] font-extrabold text-[#0b1f3a] leading-none"
                >
                  {data?.pending_requisitions_count || 0}টি
                </span>
                <span className="text-[11px] font-bold text-[#b45309]">
                  রিভিউ আবশ্যক
                </span>
              </div>
              <svg className="w-[74px] h-[30px] text-[#b45309] shrink-0" viewBox="0 0 74 30" fill="none">
                <polyline points="2,22 14,18 26,20 38,12 50,14 62,7 72,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="72" cy="9" r="2.6" fill="currentColor" />
              </svg>
            </div>
            <p className="text-[11.5px] text-[#33475f] mt-1.5 font-medium">
              অনুমোদনের অপেক্ষায় থাকা কোর্স শুট রিকুইজিশন
            </p>
          </div>
          </Link>
        </motion.div>

        {/* KPI 2: Active Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: CARD_STAGGER_DELAY, ease: SILKY_EASE }}
        >
          <Link
            href="/admin/tasks"
            id="kpi-card-active-tasks"
            className="glass-panel p-4 sm:p-5 flex flex-col justify-between group h-full"
          >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f]">
              সক্রিয় টাস্ক • Active Tasks
            </span>
            <div className="p-2 rounded-xl bg-[#0f766e]/15 text-[#0F766E] group-hover:scale-105 transition-transform">
              <Kanban className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span
                  id="kpi-active-tasks-count"
                  className="text-2xl sm:text-[26px] font-extrabold text-[#0b1f3a] leading-none"
                >
                  {data?.active_tasks_count || 0}টি
                </span>
                <span className="text-[11px] font-bold text-[#0F766E]">
                  চলমান পাইপলাইন
                </span>
              </div>
              <svg className="w-[74px] h-[30px] text-[#0f766e] shrink-0" viewBox="0 0 74 30" fill="none">
                <polyline points="2,20 14,22 26,15 38,17 50,10 62,12 72,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="72" cy="5" r="2.6" fill="currentColor" />
              </svg>
            </div>
            <p className="text-[11.5px] text-[#33475f] mt-1.5 font-medium">
              মাঠে শুটিং, ফুটেজ আপলোড ও ভিডিও এডিটিং চলমান
            </p>
          </div>
          </Link>
        </motion.div>

        {/* KPI 3: Gear Status (In Use / Maint.) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: CARD_STAGGER_DELAY * 2, ease: SILKY_EASE }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <Link
            href="/admin/gear"
            id="kpi-card-gear-status"
            className="glass-panel p-4 sm:p-5 flex flex-col justify-between group h-full"
          >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#33475f]">
              গিয়ার স্ট্যাটাস • Gear Status
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-[#0891b2] group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span
                  id="kpi-gear-inuse-count"
                  className="text-xl sm:text-[22px] font-extrabold text-[#0b1f3a] leading-none"
                >
                  {kpis.in_use}টি ইন ইউজ
                </span>
                <span className="text-[#33475f]/50">•</span>
                <span
                  id="kpi-gear-maint-count"
                  className="text-xs sm:text-sm font-bold text-[#b45309]"
                >
                  {kpis.maintenance}টি মেইনটেন্যান্স
                </span>
              </div>
              <svg className="w-[74px] h-[30px] text-[#0ea5b7] shrink-0" viewBox="0 0 74 30" fill="none">
                <polyline points="2,12 14,15 26,11 38,16 50,13 62,18 72,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="72" cy="15" r="2.6" fill="currentColor" />
              </svg>
            </div>
            <p className="text-[11.5px] text-[#33475f] mt-1.5 font-medium">
              {kpis.available}টি ব্যবহারযোগ্য (মোট {kpis.total}টি ক্যামেরা ও গিয়ার)
            </p>
          </div>
          </Link>
        </motion.div>
      </div>

      {/* 3. Main Dashboard Layout (Left: 8 cols, Right: 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 cols): Approval Queue + Bottom 2 Cards */}
        <div className="lg:col-span-8 space-y-4">
          {/* Middle: Course Requisitions (Approval Queue) Table */}
          <div
            id="dashboard-approval-queue-section"
            className="glass-panel overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-white/60 flex flex-wrap items-center justify-between gap-3 bg-white/25">
              <div>
                <h2 className="text-[15.5px] font-bold text-[#0b1f3a] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0F766E]" />
                  <span>কোর্স রিকুইজিশন অনুমোদন কিউ • Approval Queue</span>
                </h2>
                <p className="text-xs text-[#33475f] mt-0.5 font-medium">
                  অনুমোদনের অপেক্ষায় থাকা কোর্স শুট রিকুইজিশনসমূহ
                </p>
              </div>

              <Link
                href="/admin/requisitions"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline"
              >
                <span>সব রিকুইজিশন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {queue.length === 0 ? (
              <div className="p-10 text-center text-[#33475f] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#0f766e] mx-auto" />
                <p className="text-xs font-semibold text-[#0b1f3a]">
                  বর্তমানে কোনো পেন্ডিং রিকুইজিশন নেই
                </p>
                <p className="text-[11px] text-[#33475f]">
                  সকল কোর্স রিকুইজিশন যথাযথভাবে রিভিউ ও প্রসেস করা হয়েছে।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/45 overflow-x-auto">
                {queue.map((req) => (
                  <div
                    key={req.id}
                    id={`approval-queue-item-${req.id}`}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/30 transition-colors"
                  >
                    {/* Requisition Meta */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#0b1f3a]">
                          {req.course_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/55 border border-white/75 text-[#33475f] text-[11px] font-mono font-semibold">
                          {req.course_code}
                        </span>
                        {req.is_emergency_override && (
                          <span
                            id={`override-badge-${req.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-[#dc2626] text-[10px] font-bold tracking-wide uppercase"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Override</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#33475f] font-medium">
                        <span className="flex items-center gap-1 text-[#0F766E] font-bold font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{req.shoot_date}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#33475f]" />
                          <span>{req.call_time}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#33475f]" />
                          <span>{req.venue_name}</span>
                        </span>

                        <span className="text-[#33475f]/60">•</span>
                        <span>{req.format_duration}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11.5px] text-[#33475f] font-medium">
                        <Users className="w-3.5 h-3.5 text-[#33475f]" />
                        <span>
                          {req.coordinator_name} ({req.coordinator_phone})
                        </span>
                      </div>

                      {req.is_emergency_override && req.override_reason && (
                        <p className="text-[11px] text-[#dc2626] font-semibold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-200/70">
                          জরুরি অনুমোদনের কারণ: {req.override_reason}
                        </p>
                      )}
                    </div>

                    {/* Actions: Approve & Assign / Reject */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                      {req.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#22c55e]/15 text-[#15803d] text-xs font-bold border border-emerald-500/25">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            id={`dashboard-approve-btn-${req.id}`}
                            onClick={() => setApprovingReq(req)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#0F766E] hover:bg-[#0b5a54] text-white text-xs font-semibold shadow-[0_5px_12px_rgba(15,118,110,0.3)] transition-all"
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white/55 hover:bg-red-500/10 text-[#33475f] hover:text-[#dc2626] text-xs font-semibold border border-white/85 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
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
              className="glass-panel p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#0b1f3a] flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#0F766E]" />
                  <span>টাস্ক বোর্ড অগ্রগতি • Task Progress</span>
                </h3>
                <Link
                  href="/admin/tasks"
                  className="text-[11.5px] font-semibold text-[#0F766E] hover:underline"
                >
                  বোর্ডে যান
                </Link>
              </div>

              {/* 6-Segment Horizontal Task Pipeline Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#33475f] uppercase tracking-wider">
                  <span>6-Stage Pipeline</span>
                  <span>{progress.total} Active</span>
                </div>
                <div className="h-[22px] w-full bg-white/35 rounded-lg overflow-hidden flex border border-white/70">
                  <div
                    style={{ width: `${progress.total ? Math.max(12, (progress.assigned / progress.total) * 100) : 25}%` }}
                    className="bg-[#0ea5b7] h-full transition-all"
                    title={`Assigned: ${progress.assigned}`}
                  />
                  <div
                    style={{ width: `${progress.total ? Math.max(12, (progress.editing / progress.total) * 100) : 25}%` }}
                    className="bg-[#0f766e] h-full transition-all"
                    title={`Editing: ${progress.editing}`}
                  />
                  <div
                    style={{ width: `${progress.total ? Math.max(12, (progress.review / progress.total) * 100) : 25}%` }}
                    className="bg-[#f59e0b] h-full transition-all"
                    title={`Review: ${progress.review}`}
                  />
                  <div
                    style={{ width: `${progress.total ? Math.max(12, (progress.completed / progress.total) * 100) : 25}%` }}
                    className="bg-[#22c55e] h-full transition-all"
                    title={`Completed: ${progress.completed}`}
                  />
                </div>
              </div>

              {/* Stage Progress Pills */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-white/40 border border-white/70 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#0e7490]">
                    Assigned / Field
                  </span>
                  <span
                    id="progress-count-assigned"
                    className="text-lg font-extrabold text-[#0b1f3a] mt-0.5"
                  >
                    {progress.assigned}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/70 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#0f766e]">
                    Editing
                  </span>
                  <span
                    id="progress-count-editing"
                    className="text-lg font-extrabold text-[#0b1f3a] mt-0.5"
                  >
                    {progress.editing}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/70 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#b45309]">
                    Review
                  </span>
                  <span
                    id="progress-count-review"
                    className="text-lg font-extrabold text-[#0b1f3a] mt-0.5"
                  >
                    {progress.review}টি
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/70 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#15803d]">
                    Completed
                  </span>
                  <span
                    id="progress-count-completed"
                    className="text-lg font-extrabold text-[#0b1f3a] mt-0.5"
                  >
                    {progress.completed}টি
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11.5px] font-medium text-[#33475f]">
                <span>মোট অ্যাক্টিভ টাস্ক: <b className="text-[#0b1f3a]">{progress.total}টি</b></span>
                <span className="text-[#0F766E] font-bold">
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
              className="glass-panel p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#0b1f3a] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0f766e]" />
                  <span>লাইভ গিয়ার স্টক • Gear Stock</span>
                </h3>
                <Link
                  href="/admin/gear"
                  className="text-[11.5px] font-semibold text-[#0F766E] hover:underline"
                >
                  স্টকে যান
                </Link>
              </div>

              {/* Scrollable Gear Rows */}
              <div className="divide-y divide-white/45 max-h-60 overflow-y-auto pr-1">
                {gearRows.length === 0 ? (
                  <div className="py-6 text-center text-[#33475f] space-y-1">
                    <Camera className="w-6 h-6 text-[#33475f]/60 mx-auto" />
                    <p className="text-xs text-[#33475f] font-medium">
                      কোনো গিয়ার তালিকাভুক্ত নেই
                    </p>
                  </div>
                ) : (
                  gearRows.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 px-1 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_0_3px_rgba(255,255,255,0.5)] ${
                            item.status === "available"
                              ? "bg-[#22c55e]"
                              : item.status === "in_use"
                              ? "bg-[#0f766e]"
                              : "bg-[#f59e0b]"
                          }`}
                        />
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-[#0b1f3a] truncate">{item.name}</p>
                          <p className="text-[10.5px] text-[#33475f] font-mono">
                            {item.serial_number}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            item.status === "available"
                              ? "bg-[#22c55e]/15 text-[#15803d]"
                              : item.status === "in_use"
                              ? "bg-[#0f766e]/15 text-[#0b5a54]"
                              : "bg-red-500/15 text-[#dc2626]"
                          }`}
                        >
                          {item.status === "available"
                            ? "Available"
                            : item.status === "in_use"
                            ? "In Use"
                            : "Maintenance"}
                        </span>
                        {item.assigned_to && (
                          <p className="text-[10px] text-[#33475f] truncate max-w-[110px]">
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
          <div
            id="dashboard-calendar-preview-section"
            className="glass-panel p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15.5px] font-bold text-[#0b1f3a] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0F766E]" />
                <span>মাস্টার ক্যালেন্ডার</span>
              </h2>
              <Link
                href="/admin/calendar"
                id="dashboard-view-full-calendar-link"
                className="text-[11.5px] font-semibold text-[#0F766E] hover:underline"
              >
                সম্পূর্ণ ক্যালেন্ডার
              </Link>
            </div>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#33475f]">
              আগামী ৭ দিন • Next 7 Days
            </div>

            {upcomingShoots.length === 0 ? (
              <div className="py-8 text-center text-[#33475f] space-y-2">
                <Calendar className="w-7 h-7 text-[#33475f]/60 mx-auto" />
                <p className="text-xs font-medium text-[#33475f]">
                  আগামী ৭ দিনে কোনো শুটিং নির্ধারিত নেই
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingShoots.slice(0, 5).map((shoot) => (
                  <div
                    key={shoot.id}
                    id={`preview-shoot-card-${shoot.id}`}
                    className="p-3 rounded-[13px] bg-white/40 border border-white/65 hover:bg-white/60 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[12.5px] text-[#0b1f3a] truncate">
                        {shoot.course_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0f766e]/15 text-[#0b5a54] font-mono shrink-0">
                        {shoot.shoot_date}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium text-[#33475f]">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#0F766E]" />
                        <span>{shoot.call_time}</span>
                      </span>
                      <span className="truncate max-w-[130px]">
                        {shoot.venue_name}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#33475f] flex items-center justify-between">
                      <span className="truncate font-medium">টিম: {shoot.lead_name}</span>
                      <span className="text-[10px] font-mono text-[#33475f]">
                        {shoot.slip.slip_number}
                      </span>
                    </div>

                    {/* Quick Slip & WhatsApp Actions */}
                    <div className="pt-2 border-t border-white/60 flex items-center gap-2">
                      <button
                        type="button"
                        id={`quick-slip-btn-${shoot.id}`}
                        onClick={() => handleQuickSlip(shoot)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-[10px] bg-[#0F766E] hover:bg-[#0b5a54] text-white text-[11.5px] font-semibold shadow-xs transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF Slip</span>
                      </button>

                      <a
                        href={shoot.slip.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`quick-whatsapp-btn-${shoot.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-[10px] bg-white/60 hover:bg-white/85 text-[#0b1f3a] border border-white/85 text-[11.5px] font-semibold transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#0F766E]" />
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
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
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
          </motion.div>
        </div>
      )}
    </div>
  );
}
