"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Plus,
  Search,
  X,
  Battery,
  HardDrive,
  Edit2,
} from "lucide-react";
import type { GearCategory, GearStatus } from "@/lib/types/database";
import {
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
  GEAR_STATUS_LABELS,
} from "@/lib/validations/gear";

interface GearBookingItem {
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
  task_title?: string;
  lead_name?: string;
  team_label?: string;
}

interface GearItemRow {
  id: string;
  name: string;
  category: GearCategory;
  serial_number: string;
  status: GearStatus;
  maintenance_note: string | null;
  created_at: string;
  updated_at: string;
  current_booking?: GearBookingItem | null;
  assigned_to?: string | null;
}

interface ActiveTaskItem {
  id: string;
  title: string;
  course_name: string;
  venue_name: string;
  shoot_date: string;
  call_time: string;
}

interface StaffMemberItem {
  id: string;
  full_name: string;
  phone: string;
  role: string;
}

export default function AdminGearPage() {
  const [gearList, setGearList] = useState<GearItemRow[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveTaskItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Global Alert Banner (Double-Booking Blocked 23P01 or general)
  const [doubleBookingAlert, setDoubleBookingAlert] = useState<{
    message: string;
    conflicting?: {
      gear_id?: string;
      gear_name?: string;
      serial_number?: string;
      assigned_lead_name?: string;
      time_window?: string;
      formatted_message?: string;
    };
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Check-Out Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutGearItem, setCheckoutGearItem] = useState<GearItemRow | null>(null);
  const [checkoutTaskId, setCheckoutTaskId] = useState("");
  const [checkoutLeadId, setCheckoutLeadId] = useState("");
  const [checkoutTeamLabel, setCheckoutTeamLabel] = useState("Team A");
  const [checkoutStartDate, setCheckoutStartDate] = useState("");
  const [checkoutStartTime, setCheckoutStartTime] = useState("09:00");
  const [checkoutEndDate, setCheckoutEndDate] = useState("");
  const [checkoutEndTime, setCheckoutEndTime] = useState("17:00");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, startCheckout] = useTransition();

  // Return Check-In Modal State
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinGearItem, setCheckinGearItem] = useState<GearItemRow | null>(null);
  const [checkinBatteryOk, setCheckinBatteryOk] = useState(true);
  const [checkinSdCardOk, setCheckinSdCardOk] = useState(true);
  const [checkinConditionNote, setCheckinConditionNote] = useState("");
  const [checkinMarkMaintenance, setCheckinMarkMaintenance] = useState(false);
  const [checkinMaintenanceNote, setCheckinMaintenanceNote] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isCheckingIn, startCheckin] = useTransition();

  // Add Gear Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<GearCategory>("camera_body");
  const [addSerial, setAddSerial] = useState("");
  const [addStatus, setAddStatus] = useState<GearStatus>("available");
  const [addMaintenanceNote, setAddMaintenanceNote] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();

  // Edit Gear Modal State (Admin only)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGearItem, setEditGearItem] = useState<GearItemRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<GearCategory>("camera_body");
  const [editSerial, setEditSerial] = useState("");
  const [editStatus, setEditStatus] = useState<GearStatus>("available");
  const [editMaintenanceNote, setEditMaintenanceNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, startEdit] = useTransition();

  // Quick Return Condition Check-In Panel State (Bottom of page)
  const [quickSelectedGearId, setQuickSelectedGearId] = useState("");
  const [quickBatteryOk, setQuickBatteryOk] = useState(true);
  const [quickSdCardOk, setQuickSdCardOk] = useState(true);
  const [quickDamageNote, setQuickDamageNote] = useState("");
  const [isQuickCheckingIn, startQuickCheckin] = useTransition();

  // Fetch Data from API
  const fetchGearData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gear");
      const data = await res.json();
      if (data.success) {
        setGearList(data.items || []);
        setActiveTasks(data.tasks || []);
        setStaffMembers(data.staffMembers || []);

        if (data.tasks?.length > 0 && !checkoutTaskId) {
          setCheckoutTaskId(data.tasks[0].id);
        }
        if (data.staffMembers?.length > 0 && !checkoutLeadId) {
          setCheckoutLeadId(data.staffMembers[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch gear data:", err);
    } finally {
      setLoading(false);
    }
  }, [checkoutTaskId, checkoutLeadId]);

  useEffect(() => {
    fetchGearData();
  }, [fetchGearData]);

  // Set default dates for checkout window (today)
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setCheckoutStartDate(today);
    setCheckoutEndDate(today);
  }, []);

  // Filtered Items
  const filteredGear = gearList.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSerial = item.serial_number.toLowerCase().includes(q);
      const matchAssigned = item.assigned_to?.toLowerCase().includes(q) || false;
      if (!matchName && !matchSerial && !matchAssigned) return false;
    }
    return true;
  });

  // Stats calculation
  const totalCount = gearList.length;
  const availableCount = gearList.filter((g) => g.status === "available").length;
  const inUseCount = gearList.filter((g) => g.status === "in_use").length;
  const maintenanceCount = gearList.filter((g) => g.status === "maintenance").length;

  // Items currently In Use (for Quick Check-in panel)
  const inUseItems = gearList.filter((g) => g.status === "in_use");

  // Synchronize quick selected gear ID
  useEffect(() => {
    if (inUseItems.length > 0 && !quickSelectedGearId) {
      setQuickSelectedGearId(inUseItems[0].id);
    } else if (inUseItems.length === 0) {
      setQuickSelectedGearId("");
    }
  }, [inUseItems, quickSelectedGearId]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  // Open Check-Out Modal
  const handleOpenCheckout = (item: GearItemRow) => {
    setCheckoutGearItem(item);
    setCheckoutError(null);
    const today = new Date().toISOString().split("T")[0];
    setCheckoutStartDate(today);
    setCheckoutEndDate(today);
    setShowCheckoutModal(true);
  };

  // Submit Check-Out
  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutGearItem) return;
    setCheckoutError(null);

    const todayIso = new Date().toISOString().split("T")[0];
    const startDateVal = checkoutStartDate || todayIso;
    const endDateVal = checkoutEndDate || todayIso;
    const startTimeVal = checkoutStartTime || "09:00";
    const endTimeVal = checkoutEndTime || "17:00";

    const startDateTime = new Date(`${startDateVal}T${startTimeVal}:00`).toISOString();
    const endDateTime = new Date(`${endDateVal}T${endTimeVal}:00`).toISOString();

    const taskIdVal = checkoutTaskId || activeTasks[0]?.id || "t1000000-0000-0000-0000-000000000001";
    const leadIdVal = checkoutLeadId || staffMembers[0]?.id || "00000000-0000-0000-0000-000000000003";

    startCheckout(async () => {
      try {
        const res = await fetch("/api/gear/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gear_id: checkoutGearItem.id,
            task_id: taskIdVal,
            responsible_lead_id: leadIdVal,
            start_time: startDateTime,
            end_time: endDateTime,
            team_label: checkoutTeamLabel || "Team A",
          }),
        });

        const data = await res.json();

        if (res.status === 409 || data.code === "23P01") {
          // Double-Booking Constraint Blocked! (excl_no_gear_double_booking)
          const errorMsg = data.error || `Double-Booking Blocked: ${checkoutGearItem.name} is already booked.`;
          setDoubleBookingAlert({
            message: errorMsg,
            conflicting: data.conflicting_booking,
          });
          setCheckoutError(errorMsg);
          return;
        }

        if (!data.success) {
          setCheckoutError(data.error || "চেক-আউট সম্পন্ন করা যায়নি");
          return;
        }

        // Success
        setShowCheckoutModal(false);
        setDoubleBookingAlert(null);
        setSuccessToast(`${checkoutGearItem.name} (${checkoutGearItem.serial_number}) সফলভাবে চেক-আউট করা হয়েছে।`);
        setTimeout(() => setSuccessToast(null), 5000);
        await fetchGearData();
      } catch (err: unknown) {
        setCheckoutError(err instanceof Error ? err.message : "সার্ভার এরর");
      }
    });
  };

  // Open Return Check-In Modal
  const handleOpenCheckin = (item: GearItemRow) => {
    setCheckinGearItem(item);
    setCheckinBatteryOk(true);
    setCheckinSdCardOk(true);
    setCheckinConditionNote("");
    setCheckinMarkMaintenance(false);
    setCheckinMaintenanceNote("");
    setCheckinError(null);
    setShowCheckinModal(true);
  };

  // Submit Return Check-In
  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinGearItem) return;
    setCheckinError(null);

    startCheckin(async () => {
      try {
        const res = await fetch("/api/gear/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gear_id: checkinGearItem.id,
            battery_ok: checkinBatteryOk,
            sd_card_ok: checkinSdCardOk,
            return_condition_note: checkinConditionNote || null,
            mark_maintenance: checkinMarkMaintenance,
            maintenance_note: checkinMaintenanceNote || checkinConditionNote || null,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          setCheckinError(data.error || "চেক-ইন ব্যর্থ হয়েছে");
          return;
        }

        setShowCheckinModal(false);
        setSuccessToast(
          `${checkinGearItem.name} সফলভাবে চেক-ইন করা হয়েছে (${checkinMarkMaintenance ? "রক্ষণাবেক্ষণে পাঠানো হয়েছে" : "এখন উপলব্ধ"})।`
        );
        setTimeout(() => setSuccessToast(null), 5000);
        await fetchGearData();
      } catch (err: unknown) {
        setCheckinError(err instanceof Error ? err.message : "সার্ভার এরর");
      }
    });
  };

  // Mark Ready (for Maintenance item)
  const handleMarkReady = async (item: GearItemRow) => {
    try {
      const res = await fetch("/api/gear/mark-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gear_id: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessToast(`${item.name} প্রস্তুত চিহ্নিত করা হয়েছে (Status: Available)`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchGearData();
      }
    } catch (err) {
      console.error("Failed to mark ready:", err);
    }
  };

  // Quick Check-in Bottom Panel Submit
  const handleQuickCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSelectedGearId) return;

    startQuickCheckin(async () => {
      try {
        const res = await fetch("/api/gear/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gear_id: quickSelectedGearId,
            battery_ok: quickBatteryOk,
            sd_card_ok: quickSdCardOk,
            return_condition_note: quickDamageNote || null,
            mark_maintenance: false,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessToast("কুইক রিটার্ন চেক-ইন সফল হয়েছে (Item returned as Available)");
          setQuickDamageNote("");
          setTimeout(() => setSuccessToast(null), 4000);
          await fetchGearData();
        }
      } catch (err) {
        console.error("Quick checkin failed:", err);
      }
    });
  };

  // Add Gear Item
  const handleAddGear = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    startAdd(async () => {
      try {
        const res = await fetch("/api/gear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: addName,
            category: addCategory,
            serial_number: addSerial,
            status: addStatus,
            maintenance_note: addStatus === "maintenance" ? addMaintenanceNote : null,
          }),
        });

        const data = await res.json();
        if (res.status === 409) {
          setAddError(data.error || "সিরিয়াল নম্বর ইতিমধ্যে নিবন্ধিত");
          return;
        }
        if (!data.success) {
          setAddError(data.error || "সরঞ্জাম যোগ করা যায়নি");
          return;
        }

        setShowAddModal(false);
        setAddName("");
        setAddSerial("");
        setAddMaintenanceNote("");
        setSuccessToast(`নতুন সরঞ্জাম "${data.item.name}" সফলভাবে যুক্ত হয়েছে।`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchGearData();
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : "সার্ভার এরর");
      }
    });
  };

  // Open Edit Gear Modal
  const handleOpenEdit = (item: GearItemRow) => {
    setEditGearItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditSerial(item.serial_number);
    setEditStatus(item.status);
    setEditMaintenanceNote(item.maintenance_note || "");
    setEditError(null);
    setShowEditModal(true);
  };

  // Submit Edit Gear
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGearItem) return;
    setEditError(null);

    startEdit(async () => {
      try {
        const res = await fetch(`/api/gear/${editGearItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            category: editCategory,
            serial_number: editSerial,
            status: editStatus,
            maintenance_note: editStatus === "maintenance" ? editMaintenanceNote : null,
          }),
        });

        const data = await res.json();
        if (res.status === 409) {
          setEditError(data.error || "সিরিয়াল নম্বর ইতিমধ্যে নিবন্ধিত");
          return;
        }
        if (!data.success) {
          setEditError(data.error || "সরঞ্জাম আপডেট করা যায়নি");
          return;
        }

        setShowEditModal(false);
        setSuccessToast(`সরঞ্জাম "${data.item.name}" সফলভাবে আপডেট করা হয়েছে।`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchGearData();
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : "সার্ভার এরর");
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Search Bar matching Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Mockup Top Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search requisitions, gear, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Check-Out & Add New Gear */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const defaultItem = gearList.find((g) => g.status === "available") || gearList[0];
              if (defaultItem) handleOpenCheckout(defaultItem);
            }}
            data-testid="header-checkout-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
          >
            <Camera className="w-4 h-4 text-[#0F766E]" />
            <span>চেক-আউট (Check-Out)</span>
          </button>

          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            data-testid="add-gear-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সরঞ্জাম যোগ (Add Gear)</span>
          </button>
        </div>
      </div>

      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-slate-200/80 pb-3 gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#0F766E]" />
            Equipment & Camera-Gear Stock Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            আছ-সুন্নাহ মিডিয়া উইংয়ের সেন্ট্রাল ক্যামেরা ও ইকুইপমেন্ট ইনভেন্টরি এবং ডাবল-বুকিং প্রতিরোধ
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div
          data-testid="success-toast"
          className="bg-emerald-500/10 backdrop-blur-md border border-emerald-300 text-emerald-900 rounded-xl p-3.5 shadow-sm flex items-center justify-between text-xs animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* RED GLASS ALERT BANNER: Double-Booking Blocked (PostgreSQL 23P01) */}
      {doubleBookingAlert && (
        <div
          id="double-booking-alert"
          data-testid="double-booking-alert-banner"
          className="bg-red-500/10 backdrop-blur-md border border-red-300 text-red-950 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-bold text-red-900 leading-snug">
                {doubleBookingAlert.message}
              </div>
              <p className="text-[11px] text-red-700">
                PostgreSQL GiST কনস্ট্রেইন্ট <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-[10px]">excl_no_gear_double_booking</code> (Error Code 23P01) একই সময়ে দুটি ভিন্ন শুটিংয়ে একটি সরঞ্জাম ওভারল্যাপিং বুকিং হতে দেয় না।
              </p>
            </div>
          </div>
          <button
            onClick={() => setDoubleBookingAlert(null)}
            className="p-1 rounded-md text-red-700 hover:bg-red-200/50 hover:text-red-950 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">মোট সরঞ্জাম (Total)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">সব ক্যাটাগরি মিলিয়ে</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            উপলব্ধ (Available)
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{availableCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">শুটের জন্য প্রস্তুত</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ব্যবহৃত (In Use)
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{inUseCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">চলতি শুটে নিয়োজিত</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            রক্ষণাবেক্ষণ (Maintenance)
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{maintenanceCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">মেরামত বা টেস্টিং চলছে</div>
        </div>
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter("all")}
            data-testid="filter-status-all"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === "all"
                ? "bg-[#0F766E] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Status ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("available")}
            data-testid="filter-status-available"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === "available"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            Available ({availableCount})
          </button>
          <button
            onClick={() => setStatusFilter("in_use")}
            data-testid="filter-status-in_use"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === "in_use"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            In Use ({inUseCount})
          </button>
          <button
            onClick={() => setStatusFilter("maintenance")}
            data-testid="filter-status-maintenance"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === "maintenance"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            Maintenance ({maintenanceCount})
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            data-testid="filter-category-select"
            className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] shadow-sm"
          >
            <option value="all">সকল ক্যাটাগরি (All Categories)</option>
            {GEAR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {GEAR_CATEGORY_LABELS[cat].en} ({GEAR_CATEGORY_LABELS[cat].bn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Inventory Card matching Mockup */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Master Inventory</h2>
            <p className="text-xs text-slate-500">
              ক্যামেরা বডি, লেন্স, ড্রোন, গিম্বল ও লাইটিং ইকুইপমেন্টের লাইভ রেজিস্টার
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredGear.length} Items Listed
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">ইনভেন্টরি লোড হচ্ছে...</div>
        ) : filteredGear.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            কোনো সরঞ্জাম খুঁজে পাওয়া যায়নি। ফিল্টার পরিবর্তন করুন।
          </div>
        ) : (
          <>
            {/* Desktop Table View matching Mockup Columns */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" data-testid="gear-master-table">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Gear & Model</th>
                    <th className="py-3 px-4">Serial No.</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5">Assigned To / Shoot</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredGear.map((item) => {
                    const statusConfig = GEAR_STATUS_LABELS[item.status];
                    const isAvailable = item.status === "available";
                    const isInUse = item.status === "in_use";
                    const isMaintenance = item.status === "maintenance";

                    return (
                      <tr
                        key={item.id}
                        data-testid={`gear-row-${item.serial_number}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Gear & Model */}
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {GEAR_CATEGORY_LABELS[item.category]?.en || item.category}
                          </div>
                        </td>

                        {/* Serial Number */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800 text-xs">
                          {item.serial_number}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            data-testid={`status-badge-${item.serial_number}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}></span>
                            <span>{statusConfig.en}</span>
                          </span>
                        </td>

                        {/* Assigned To / Shoot */}
                        <td className="py-3.5 px-5">
                          {isInUse && item.assigned_to ? (
                            <span className="font-medium text-slate-800 flex items-center gap-1.5">
                              <span>{item.assigned_to}</span>
                            </span>
                          ) : isMaintenance ? (
                            <span className="text-rose-700 font-medium text-xs">
                              {item.assigned_to || (item.maintenance_note ? `Note: ${item.maintenance_note}` : "Under Maintenance")}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-light">—</span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAvailable && (
                              <button
                                onClick={() => handleOpenCheckout(item)}
                                data-testid={`btn-checkout-${item.serial_number}`}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white shadow-sm transition-all active:scale-95"
                              >
                                Check-Out
                              </button>
                            )}

                            {isInUse && (
                              <button
                                onClick={() => handleOpenCheckin(item)}
                                data-testid={`btn-checkin-${item.serial_number}`}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm transition-all active:scale-95"
                              >
                                Check-In
                              </button>
                            )}

                            {isMaintenance && (
                              <button
                                onClick={() => handleMarkReady(item)}
                                data-testid={`btn-markready-${item.serial_number}`}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm transition-all active:scale-95"
                              >
                                Mark Ready
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEdit(item)}
                              data-testid={`btn-edit-${item.serial_number}`}
                              title="Edit Gear"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile (390px) View: Clean 1-Column Responsive Cards */}
            <div className="md:hidden divide-y divide-slate-100" data-testid="gear-mobile-cards">
              {filteredGear.map((item) => {
                const statusConfig = GEAR_STATUS_LABELS[item.status];
                const isAvailable = item.status === "available";
                const isInUse = item.status === "in_use";
                const isMaintenance = item.status === "maintenance";

                return (
                  <div
                    key={item.id}
                    data-testid={`gear-mobile-card-${item.serial_number}`}
                    className="p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm leading-tight">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.serial_number} · {GEAR_CATEGORY_LABELS[item.category]?.en}
                        </div>
                      </div>
                      <span
                        data-testid={`mobile-status-badge-${item.serial_number}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusConfig.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}></span>
                        <span>{statusConfig.en}</span>
                      </span>
                    </div>

                    {/* Assigned info */}
                    <div className="text-xs text-slate-600 bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Assigned To / Shoot:
                      </span>
                      {isInUse && item.assigned_to ? (
                        <span className="font-medium text-slate-800">{item.assigned_to}</span>
                      ) : isMaintenance ? (
                        <span className="text-rose-700 font-medium">{item.assigned_to || "Under Maintenance"}</span>
                      ) : (
                        <span className="text-slate-400">উপলব্ধ (Not assigned)</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        data-testid={`btn-mobile-edit-${item.serial_number}`}
                        className="py-2 px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all text-center flex items-center gap-1 justify-center shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {isAvailable && (
                        <button
                          onClick={() => handleOpenCheckout(item)}
                          data-testid={`btn-mobile-checkout-${item.serial_number}`}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white shadow-sm transition-all text-center"
                        >
                          Check-Out
                        </button>
                      )}

                      {isInUse && (
                        <button
                          onClick={() => handleOpenCheckin(item)}
                          data-testid={`btn-mobile-checkin-${item.serial_number}`}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm transition-all text-center"
                        >
                          Check-In
                        </button>
                      )}

                      {isMaintenance && (
                        <button
                          onClick={() => handleMarkReady(item)}
                          data-testid={`btn-mobile-markready-${item.serial_number}`}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm transition-all text-center"
                        >
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick Return Condition Check-In Bottom Panel (matching Mockup) */}
      <div
        id="quick-return-panel"
        data-testid="quick-return-panel"
        className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
            Quick Return Condition Check-In
          </h3>
          <span className="text-[11px] text-slate-500">
            শুটিং শেষে সরঞ্জামের ব্যাটারি ও এসডি কার্ড দ্রুত ভেরিফাই করে ইনভেন্টরিতে ফেরত নিন
          </span>
        </div>

        <form onSubmit={handleQuickCheckinSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Gear item selector */}
            <div className="w-full sm:w-64">
              <select
                value={quickSelectedGearId}
                onChange={(e) => setQuickSelectedGearId(e.target.value)}
                data-testid="quick-gear-select"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              >
                {inUseItems.length === 0 ? (
                  <option value="">বর্তমানে কোনো সরঞ্জাম In Use নেই</option>
                ) : (
                  inUseItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.serial_number})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Checkbox: Battery OK */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={quickBatteryOk}
                onChange={(e) => setQuickBatteryOk(e.target.checked)}
                data-testid="quick-checkbox-battery"
                className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
              />
              <Battery className="w-4 h-4 text-emerald-600" />
              <span>Battery OK</span>
            </label>

            {/* Checkbox: SD Card OK */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={quickSdCardOk}
                onChange={(e) => setQuickSdCardOk(e.target.checked)}
                data-testid="quick-checkbox-sd"
                className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
              />
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>SD Card OK</span>
            </label>

            {/* Damage Note / Remarks Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Damage Note / Remarks..."
                value={quickDamageNote}
                onChange={(e) => setQuickDamageNote(e.target.value)}
                data-testid="quick-input-damage-note"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>

            {/* Submit Check-In button */}
            <button
              type="submit"
              disabled={isQuickCheckingIn || !quickSelectedGearId}
              data-testid="quick-submit-checkin-btn"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-sm transition-all shrink-0 active:scale-95"
            >
              {isQuickCheckingIn ? "প্রসেসিং..." : "Complete Check-In"}
            </button>
          </div>
        </form>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: Task-based Check-Out Modal                                   */}
      {/* ---------------------------------------------------------------------- */}
      {showCheckoutModal && checkoutGearItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  সরঞ্জাম চেক-আউট (Check-Out Equipment)
                </h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCheckout} className="p-5 space-y-4">
              {/* Selected Gear Info Card & Switcher */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{checkoutGearItem.name}</div>
                    <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                      Serial: {checkoutGearItem.serial_number}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    {GEAR_CATEGORY_LABELS[checkoutGearItem.category]?.en}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-emerald-200/60">
                  <label className="text-[10px] font-semibold text-emerald-950 block mb-1">
                    সরঞ্জাম নির্বাচন বা পরিবর্তন করুন (Select Gear Item):
                  </label>
                  <select
                    value={checkoutGearItem.id}
                    onChange={(e) => {
                      const selected = gearList.find((g) => g.id === e.target.value);
                      if (selected) {
                        setCheckoutGearItem(selected);
                        setCheckoutError(null);
                      }
                    }}
                    data-testid="checkout-gear-select"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-emerald-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  >
                    {gearList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.serial_number}) — {g.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {checkoutError && (
                <div
                  data-testid="checkout-error-banner"
                  className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{checkoutError}</span>
                  </div>
                </div>
              )}

              {/* Select Active Task / Shoot */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  অ্যাসাইনকৃত টাস্ক / শুটিং (Assigned Shoot / Task)
                </label>
                <select
                  value={checkoutTaskId}
                  onChange={(e) => setCheckoutTaskId(e.target.value)}
                  data-testid="checkout-task-select"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                >
                  {activeTasks.length === 0 ? (
                    <option value="t1000000-0000-0000-0000-000000000001">
                      The Art of Creation Practical Session Reel
                    </option>
                  ) : (
                    activeTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.course_name} · {t.venue_name})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Responsible Lead & Team Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    দায়িত্বপ্রাপ্ত লিড (Responsible Lead)
                  </label>
                  <select
                    value={checkoutLeadId}
                    onChange={(e) => setCheckoutLeadId(e.target.value)}
                    data-testid="checkout-lead-select"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                    required
                  >
                    {staffMembers.length === 0 ? (
                      <option value="00000000-0000-0000-0000-000000000003">Tariqul Islam (Lead)</option>
                    ) : (
                      staffMembers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.phone})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">টিম লেবেল (Team Label)</label>
                  <input
                    type="text"
                    value={checkoutTeamLabel}
                    onChange={(e) => setCheckoutTeamLabel(e.target.value)}
                    data-testid="checkout-team-label"
                    placeholder="e.g. Team A"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              {/* Time Window: Start Date & Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  শুটিং সময়সীমা (Time Window - TSTZRANGE)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">শুরুর তারিখ ও সময়</span>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={checkoutStartDate}
                        onChange={(e) => setCheckoutStartDate(e.target.value)}
                        data-testid="checkout-start-date"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800"
                        required
                      />
                      <input
                        type="time"
                        value={checkoutStartTime}
                        onChange={(e) => setCheckoutStartTime(e.target.value)}
                        data-testid="checkout-start-time"
                        className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">সমাপ্তির তারিখ ও সময়</span>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={checkoutEndDate}
                        onChange={(e) => setCheckoutEndDate(e.target.value)}
                        data-testid="checkout-end-date"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800"
                        required
                      />
                      <input
                        type="time"
                        value={checkoutEndTime}
                        onChange={(e) => setCheckoutEndTime(e.target.value)}
                        data-testid="checkout-end-time"
                        className="w-24 px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isCheckingOut}
                  data-testid="checkout-submit-btn"
                  className="px-4 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white rounded-xl shadow-sm transition-all"
                >
                  {isCheckingOut ? "যাচাই ও চেক-আউট হচ্ছে..." : "চেক-আউট নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: Return & Condition Check-In Modal                             */}
      {/* ---------------------------------------------------------------------- */}
      {showCheckinModal && checkinGearItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  সরঞ্জাম রিটার্ন ও কন্ডিশন চেক-ইন (Return Check-In)
                </h3>
              </div>
              <button
                onClick={() => setShowCheckinModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCheckin} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="font-bold text-slate-900 text-xs">{checkinGearItem.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Serial: {checkinGearItem.serial_number}
                </div>
                {checkinGearItem.assigned_to && (
                  <div className="text-[11px] text-[#0F766E] font-medium pt-1">
                    বর্তমান অ্যাসাইনমেন্ট: {checkinGearItem.assigned_to}
                  </div>
                )}
              </div>

              {checkinError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs">
                  {checkinError}
                </div>
              )}

              {/* Condition Checkboxes */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">কন্ডিশন ভেরিফিকেশন:</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checkinBatteryOk}
                      onChange={(e) => setCheckinBatteryOk(e.target.checked)}
                      data-testid="checkin-battery-ok"
                      className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <Battery className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-800">Battery OK</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checkinSdCardOk}
                      onChange={(e) => setCheckinSdCardOk(e.target.checked)}
                      data-testid="checkin-sd-ok"
                      className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-800">SD Card OK</span>
                  </label>
                </div>
              </div>

              {/* Damage / Condition Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  ক্ষতি বা কন্ডিশন নোট (Damage / Condition Note)
                </label>
                <textarea
                  rows={2}
                  value={checkinConditionNote}
                  onChange={(e) => setCheckinConditionNote(e.target.value)}
                  data-testid="checkin-condition-note"
                  placeholder="Damage Note / Remarks... (e.g. Minor scratches, lens cleaned, battery 100%)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>

              {/* Maintenance Toggle */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-semibold text-rose-900">
                      রক্ষণাবেক্ষণের জন্য ফ্ল্যাগ করুন (Flag for Maintenance)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkinMarkMaintenance}
                    onChange={(e) => setCheckinMarkMaintenance(e.target.checked)}
                    data-testid="checkin-toggle-maintenance"
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>

                {checkinMarkMaintenance && (
                  <div className="pt-2 border-t border-rose-200/60 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Maintenance Note (e.g. Battery lock issue, send to service center)"
                      value={checkinMaintenanceNote}
                      onChange={(e) => setCheckinMaintenanceNote(e.target.value)}
                      data-testid="checkin-maintenance-note"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-rose-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isCheckingIn}
                  data-testid="checkin-submit-btn"
                  className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all ${
                    checkinMarkMaintenance
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-[#0F766E] hover:bg-[#0D655E]"
                  }`}
                >
                  {isCheckingIn
                    ? "সংরক্ষণ হচ্ছে..."
                    : checkinMarkMaintenance
                    ? "রক্ষণাবেক্ষণে পাঠান (Send to Maintenance)"
                    : "উপলব্ধ হিসেবে ফেরত নিন (Return as Available)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 3: Add New Gear Item Modal (Admin Only)                         */}
      {/* ---------------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  নতুন সরঞ্জাম যোগ করুন (Add New Gear)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddGear} className="p-5 space-y-4">
              {addError && (
                <div
                  data-testid="add-gear-error"
                  className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Gear Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  সরঞ্জামের নাম ও মডেল (Gear & Model Name)
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Sony FX3 Cinema Body"
                  data-testid="input-gear-name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ক্যাটাগরি (Category)</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as GearCategory)}
                  data-testid="select-gear-category"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                >
                  {GEAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {GEAR_CATEGORY_LABELS[cat].en} ({GEAR_CATEGORY_LABELS[cat].bn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  সিরিয়াল নম্বর (Unique Serial Number)
                </label>
                <input
                  type="text"
                  value={addSerial}
                  onChange={(e) => setAddSerial(e.target.value)}
                  placeholder="e.g. SN-FX3-02"
                  data-testid="input-gear-serial"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                />
              </div>

              {/* Initial Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">প্রাথমিক স্ট্যাটাস (Initial Status)</label>
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value as GearStatus)}
                  data-testid="select-gear-status"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  <option value="available">Available (উপলব্ধ)</option>
                  <option value="maintenance">Maintenance (রক্ষণাবেক্ষণে)</option>
                </select>
              </div>

              {/* Maintenance Note if maintenance */}
              {addStatus === "maintenance" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">রক্ষণাবেক্ষণ নোট</label>
                  <input
                    type="text"
                    value={addMaintenanceNote}
                    onChange={(e) => setAddMaintenanceNote(e.target.value)}
                    placeholder="e.g. Battery lock issue"
                    data-testid="input-gear-maintenance-note"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  data-testid="submit-add-gear-btn"
                  className="px-4 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white rounded-xl shadow-sm transition-all"
                >
                  {isAdding ? "যোগ হচ্ছে..." : "সংরক্ষণ করুন (Save Gear)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 4: Edit Gear Item Modal (Admin Only)                            */}
      {/* ---------------------------------------------------------------------- */}
      {showEditModal && editGearItem && (
        <div
          data-testid="edit-gear-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  সরঞ্জাম সম্পাদনা করুন (Edit Gear Item)
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-4">
              {editError && (
                <div
                  data-testid="edit-gear-error"
                  className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Gear Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  সরঞ্জামের নাম ও মডেল (Gear & Model Name)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Sony FX3 Cinema Body"
                  data-testid="input-edit-gear-name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ক্যাটাগরি (Category)</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as GearCategory)}
                  data-testid="select-edit-gear-category"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                >
                  {GEAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {GEAR_CATEGORY_LABELS[cat].en} ({GEAR_CATEGORY_LABELS[cat].bn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  সিরিয়াল নম্বর (Unique Serial Number)
                </label>
                <input
                  type="text"
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  placeholder="e.g. SN-FX3-01"
                  data-testid="input-edit-gear-serial"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">স্ট্যাটাস (Status)</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as GearStatus)}
                  data-testid="select-edit-gear-status"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  <option value="available">Available (উপলব্ধ)</option>
                  <option value="in_use">In Use (ব্যবহৃত)</option>
                  <option value="maintenance">Maintenance (রক্ষণাবেক্ষণে)</option>
                </select>
              </div>

              {/* Maintenance Note if maintenance */}
              {editStatus === "maintenance" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">রক্ষণাবেক্ষণ নোট</label>
                  <input
                    type="text"
                    value={editMaintenanceNote}
                    onChange={(e) => setEditMaintenanceNote(e.target.value)}
                    placeholder="e.g. Battery lock issue"
                    data-testid="input-edit-gear-maintenance-note"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  data-testid="submit-edit-gear-btn"
                  className="px-4 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#0D655E] text-white rounded-xl shadow-sm transition-all"
                >
                  {isEditing ? "আপডেট হচ্ছে..." : "আপডেট নিশ্চিত করুন (Update Gear)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
