"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Kanban,
  Camera,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Share2,
  FileText,
  MapPin,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { MODAL_TRANSITION } from "@/lib/motion";
import { FrostedPageSkeleton } from "@/components/shell/FrostedSkeleton";
import type { RequisitionItem } from "@/lib/requisitions/store";
import type { DashboardKpiData, CalendarShootItem } from "@/lib/calendar/store";
import { ApproveAndAssignModal } from "@/components/tasks/ApproveAndAssignModal";
import { ShootAssignmentSlipModal } from "@/components/tasks/ShootAssignmentSlipModal";
import type { EnrichedTask, ShootSlipData } from "@/lib/tasks/store";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardKpiData | null>(null);
  const [loading, setLoading] = useState(true);

  const [rejectingReq, setRejectingReq] = useState<RequisitionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [rejectingLoading, setRejectingLoading] = useState(false);

  const [approvingReq, setApprovingReq] = useState<RequisitionItem | null>(null);
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

  const handleApproveSuccess = (_task: EnrichedTask, slip: ShootSlipData) => {
    setApprovingReq(null);
    setActiveSlip(slip);
    setShowSlipModal(true);
    fetchDashboardData();
  };

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
    <div className="space-y-5 w-full max-w-full">
      {/* 1. Flat Linear/Stripe Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4DFD3]">
        <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1A1917] tracking-tight">
          Dashboard
        </h1>

        <Link
          href="/admin/requisitions"
          id="dashboard-nav-requisitions-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium tabular-nums"
        >
          <span>Review Queue ({data?.pending_requisitions_count || 0})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Top 3 Clean Institutional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <Link
          href="/admin/requisitions"
          id="kpi-card-pending-requisitions"
          className="bg-white border border-[#E4DFD3] hover:border-[#D5CFC2] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716C]">Pending Requisitions</span>
            <Clock className="w-4 h-4 text-[#78716C]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span
              id="kpi-pending-count"
              className="text-2xl font-semibold text-[#1A1917] tabular-nums"
            >
              {data?.pending_requisitions_count || 0}
            </span>
            <span className="text-[11px] font-medium text-[#78716C]">Awaiting review</span>
          </div>
        </Link>

        <Link
          href="/admin/tasks"
          id="kpi-card-active-tasks"
          className="bg-white border border-[#E4DFD3] hover:border-[#D5CFC2] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716C]">Active Tasks</span>
            <Kanban className="w-4 h-4 text-[#78716C]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span
              id="kpi-active-tasks-count"
              className="text-2xl font-semibold text-[#1A1917] tabular-nums"
            >
              {data?.active_tasks_count || 0}
            </span>
            <span className="text-[11px] font-medium text-[#78716C]">In production</span>
          </div>
        </Link>

        <Link
          href="/admin/gear"
          id="kpi-card-gear-status"
          className="bg-white border border-[#E4DFD3] hover:border-[#D5CFC2] rounded-lg p-4 shadow-[0_1px_2px_rgba(26,25,23,0.04)] flex flex-col justify-between sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716C]">Gear Status</span>
            <Camera className="w-4 h-4 text-[#78716C]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2 tabular-nums">
              <span
                id="kpi-gear-inuse-count"
                className="text-2xl font-semibold text-[#1A1917]"
              >
                {kpis.in_use} in use
              </span>
              <span className="text-[#D5CFC2]">/</span>
              <span
                id="kpi-gear-maint-count"
                className="text-xs font-medium text-[#57534E]"
              >
                {kpis.maintenance} maint.
              </span>
            </div>
            <span className="text-[11px] text-[#78716C] tabular-nums">
              {kpis.available} of {kpis.total} free
            </span>
          </div>
        </Link>
      </div>

      {/* 3. Main Content Grid (Left: 8 cols, Right: 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-4">
          {/* Approval Queue */}
          <div
            id="dashboard-approval-queue-section"
            className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E2DDD2] bg-[#EFECE4] flex items-center justify-between gap-3">
              <h2 className="text-xs font-medium text-[#57534E] uppercase tracking-wider">
                Approval Queue
              </h2>

              <Link
                href="/admin/requisitions"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0F6B5D] hover:underline"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {queue.length === 0 ? (
              <div className="p-10 text-center text-[#78716C] space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-[#0F6B5D] mx-auto" />
                <p className="text-xs font-medium text-[#1A1917]">No pending requisitions</p>
                <p className="text-xs text-[#78716C]">All requests have been reviewed.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4DFD3]">
                {queue.map((req) => (
                  <div
                    key={req.id}
                    id={`approval-queue-item-${req.id}`}
                    className="px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#FBF9F5]"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[13.5px] text-[#1A1917]">
                          {req.course_name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[#57534E] text-[11px] font-mono tabular-nums">
                          {req.course_code}
                        </span>
                        {req.is_emergency_override && (
                          <span
                            id={`override-badge-${req.id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-[10.5px] font-medium"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Override</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#57534E] tabular-nums">
                        <span className="font-mono text-[#1A1917] font-medium">
                          {req.shoot_date}
                        </span>
                        <span className="font-mono">{req.call_time}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#78716C]" />
                          <span>{req.venue_name}</span>
                        </span>
                        <span>{req.format_duration}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                        <Users className="w-3 h-3" />
                        <span>
                          {req.coordinator_name} ({req.coordinator_phone})
                        </span>
                      </div>

                      {req.is_emergency_override && req.override_reason && (
                        <p className="text-[11.5px] text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-1 rounded border border-[#FECACA] mt-1">
                          Override reason: {req.override_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
                      {req.status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E6F4EE] border border-[#CDE7DC] text-[#0F6B5D] text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B5D]" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            id={`dashboard-approve-btn-${req.id}`}
                            onClick={() => setApprovingReq(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Assign</span>
                          </button>

                          <button
                            type="button"
                            id={`dashboard-reject-btn-${req.id}`}
                            onClick={() => {
                              setRejectingReq(req);
                              setRejectionReason("");
                              setRejectionError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FEE2E2] text-[#57534E] hover:text-[#B91C1C] text-xs font-medium border border-[#E4DFD3] hover:border-[#FECACA]"
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

          {/* Bottom 2 Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Board Progress */}
            <div
              id="dashboard-task-progress-card"
              className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#1A1917]">
                  Task Board Progress
                </h3>
                <Link
                  href="/admin/tasks"
                  className="text-xs font-medium text-[#0F6B5D] hover:underline"
                >
                  Open board
                </Link>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#78716C] tabular-nums">
                  <span>Pipeline distribution</span>
                  <span>{progress.total} total</span>
                </div>
                <div className="h-2 w-full bg-[#EFECE4] rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${progress.total ? Math.max(8, (progress.assigned / progress.total) * 100) : 25}%`,
                    }}
                    className="bg-[#A1A1AA] h-full"
                    title={`Assigned: ${progress.assigned}`}
                  />
                  <div
                    style={{
                      width: `${progress.total ? Math.max(8, (progress.editing / progress.total) * 100) : 25}%`,
                    }}
                    className="bg-[#57534E] h-full"
                    title={`Editing: ${progress.editing}`}
                  />
                  <div
                    style={{
                      width: `${progress.total ? Math.max(8, (progress.review / progress.total) * 100) : 25}%`,
                    }}
                    className="bg-[#D5CFC2] h-full"
                    title={`Review: ${progress.review}`}
                  />
                  <div
                    style={{
                      width: `${progress.total ? Math.max(8, (progress.completed / progress.total) * 100) : 25}%`,
                    }}
                    className="bg-[#0F6B5D] h-full"
                    title={`Completed: ${progress.completed}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                <div className="p-2.5 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between">
                  <span className="text-[#57534E]">Assigned</span>
                  <span id="progress-count-assigned" className="font-semibold text-[#1A1917]">
                    {progress.assigned}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between">
                  <span className="text-[#57534E]">Editing</span>
                  <span id="progress-count-editing" className="font-semibold text-[#1A1917]">
                    {progress.editing}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between">
                  <span className="text-[#57534E]">Review</span>
                  <span id="progress-count-review" className="font-semibold text-[#1A1917]">
                    {progress.review}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F7F5F0] border border-[#E4DFD3] flex items-center justify-between">
                  <span className="text-[#57534E]">Completed</span>
                  <span id="progress-count-completed" className="font-semibold text-[#0F6B5D]">
                    {progress.completed}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-[#78716C] tabular-nums">
                <span>Completion rate</span>
                <span className="font-medium text-[#1A1917]">
                  {progress.total > 0
                    ? Math.round((progress.completed / progress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Live Gear Stock */}
            <div
              id="dashboard-gear-stock-card"
              className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#1A1917]">
                  Gear Stock
                </h3>
                <Link
                  href="/admin/gear"
                  className="text-xs font-medium text-[#0F6B5D] hover:underline"
                >
                  View inventory
                </Link>
              </div>

              <div className="divide-y divide-[#E4DFD3] max-h-60 overflow-y-auto">
                {gearRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#78716C]">
                    No equipment registered
                  </div>
                ) : (
                  gearRows.map((item) => (
                    <div
                      key={item.id}
                      className="py-2 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1917] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#78716C] font-mono tabular-nums">
                          {item.serial_number}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1A1917]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "available"
                                ? "bg-[#0F6B5D]"
                                : item.status === "in_use"
                                ? "bg-[#57534E]"
                                : "bg-[#B91C1C]"
                            }`}
                          />
                          <span>
                            {item.status === "available"
                              ? "Available"
                              : item.status === "in_use"
                              ? "In Use"
                              : "Maintenance"}
                          </span>
                        </span>
                        {item.assigned_to && (
                          <p className="text-[10.5px] text-[#78716C] truncate max-w-[110px]">
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

        {/* Right Column (4 cols): Upcoming 7 Days Schedule */}
        <div className="lg:col-span-4">
          <div
            id="dashboard-calendar-preview-section"
            className="bg-white border border-[#E4DFD3] rounded-lg shadow-[0_1px_2px_rgba(26,25,23,0.04)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E2DDD2] bg-[#EFECE4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#57534E]" />
                <h2 className="text-xs font-medium text-[#57534E] uppercase tracking-wider">
                  Next 7 Days
                </h2>
              </div>
              <Link
                href="/admin/calendar"
                id="dashboard-view-full-calendar-link"
                className="text-xs font-medium text-[#0F6B5D] hover:underline"
              >
                Calendar
              </Link>
            </div>

            {upcomingShoots.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">
                No shoots scheduled in the next 7 days
              </div>
            ) : (
              <div className="divide-y divide-[#E4DFD3]">
                {upcomingShoots.slice(0, 5).map((shoot) => (
                  <div
                    key={shoot.id}
                    id={`preview-shoot-card-${shoot.id}`}
                    className="p-3.5 space-y-2 hover:bg-[#FBF9F5]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[13px] text-[#1A1917] truncate">
                        {shoot.course_name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#EFECE4] border border-[#E4DFD3] text-[11px] font-mono text-[#57534E] tabular-nums shrink-0">
                        {shoot.shoot_date}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#57534E] tabular-nums">
                      <span className="font-mono">{shoot.call_time}</span>
                      <span className="truncate max-w-[140px]">{shoot.venue_name}</span>
                    </div>

                    <div className="text-[11px] text-[#78716C] flex items-center justify-between">
                      <span className="truncate">Lead: {shoot.lead_name}</span>
                      <span className="font-mono tabular-nums">{shoot.slip.slip_number}</span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        id={`quick-slip-btn-${shoot.id}`}
                        onClick={() => handleQuickSlip(shoot)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-white hover:bg-[#EFECE4] text-[#1A1917] border border-[#E4DFD3] text-xs font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#57534E]" />
                        <span>PDF Slip</span>
                      </button>

                      <a
                        href={shoot.slip.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`quick-whatsapp-btn-${shoot.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-[#0F6B5D] hover:bg-[#0B554A] text-white text-xs font-medium"
                      >
                        <Share2 className="w-3.5 h-3.5" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1917]/40"
          id="dashboard-reject-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingReq(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={MODAL_TRANSITION}
            className="w-full max-w-md bg-white rounded-lg shadow-[0_8px_24px_rgba(26,25,23,0.08)] border border-[#E4DFD3] p-5 space-y-4"
            id="dashboard-reject-modal"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DFD3]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-semibold text-[#1A1917]">
                  Reject Requisition
                </h3>
              </div>
              <button
                onClick={() => setRejectingReq(null)}
                className="p-1 rounded-md text-[#78716C] hover:text-[#1A1917]"
                id="close-reject-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#57534E] space-y-1 tabular-nums">
              <p>
                <span className="font-medium text-[#1A1917]">Course:</span>{" "}
                {rejectingReq.course_name}
              </p>
              <p>
                <span className="font-medium text-[#1A1917]">Schedule:</span>{" "}
                {rejectingReq.shoot_date} • {rejectingReq.call_time}
              </p>
            </div>

            <form onSubmit={handleRejectSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="rejection-reason-input"
                  className="block text-xs font-medium text-[#1A1917] mb-1.5"
                >
                  Rejection Reason *
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify why this requisition cannot be accommodated..."
                  className="w-full p-2.5 text-xs rounded-lg border border-[#E4DFD3] focus:outline-none focus:border-[#B91C1C]"
                />
                {rejectionError && (
                  <p
                    id="reject-error-banner"
                    className="text-[11px] text-[#B91C1C] mt-1 font-medium"
                  >
                    {rejectionError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#57534E] hover:bg-[#EFECE4] border border-[#E4DFD3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-reject-btn"
                  disabled={rejectingLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#B91C1C] hover:bg-[#B91C1C] text-white text-xs font-medium disabled:opacity-50"
                >
                  {rejectingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reject</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
