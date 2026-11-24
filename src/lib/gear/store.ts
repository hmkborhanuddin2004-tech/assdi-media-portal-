import type { GearCategory, GearStatus } from "@/lib/types/database";
import type { UserProfile } from "@/lib/types/auth";
import type { AddGearInput, UpdateGearInput, CheckoutGearInput, CheckinGearInput } from "@/lib/validations/gear";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { getRequisitionsForUser } from "@/lib/requisitions/store";

export interface GearItem {
  id: string;
  name: string;
  category: GearCategory;
  serial_number: string;
  status: GearStatus;
  maintenance_note: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined for UI
  current_booking?: GearBooking | null;
  assigned_to?: string | null;
}

export interface GearBooking {
  id: string;
  gear_id: string;
  task_id: string;
  responsible_lead_id: string;
  time_window: string; // TSTZRANGE e.g. "[2026-11-24T09:00:00.000Z, 2026-11-24T17:00:00.000Z]"
  checked_out_at: string;
  returned_at: string | null;
  battery_ok: boolean | null;
  sd_card_ok: boolean | null;
  return_condition_note: string | null;
  created_at: string;
  // Joined details
  task_title?: string;
  lead_name?: string;
  team_label?: string;
  gear_name?: string;
  serial_number?: string;
}

export class PostgresExclusionError extends Error {
  code = "23P01";
  table = "gear_bookings";
  constraint = "excl_no_gear_double_booking";
  conflictingBooking: {
    gear_id: string;
    gear_name: string;
    serial_number: string;
    assigned_lead_name: string;
    team_label: string;
    task_title: string;
    time_window: string;
    formatted_message: string;
  };

  constructor(
    message: string,
    conflictingBooking: PostgresExclusionError["conflictingBooking"]
  ) {
    super(message);
    this.name = "PostgresExclusionError";
    this.conflictingBooking = conflictingBooking;
  }
}

export class PostgresUniqueViolationError extends Error {
  code = "23505";
  table = "gear_items";
  constraint = "gear_items_serial_number_key";

  constructor(message: string) {
    super(message);
    this.name = "PostgresUniqueViolationError";
  }
}

export class RlsForbiddenError extends Error {
  code = "42501";
  status = 403;

  constructor(message: string) {
    super(message);
    this.name = "RlsForbiddenError";
  }
}

// ----------------------------------------------------------------------------
// TSTZRANGE Parser & Overlap Helper (PostgreSQL GiST Overlap Emulation)
// ----------------------------------------------------------------------------

export function formatTimeWindow(start: Date | string, end: Date | string): string {
  const s = new Date(start).toISOString();
  const e = new Date(end).toISOString();
  return `[${s}, ${e}]`;
}

export function parseTimeRange(rangeStr: string): { start: number; end: number } {
  const trimmed = rangeStr.trim();
  const inner = trimmed.replace(/^[\[\(]/, "").replace(/[\]\)]$/, "");
  const parts = inner.split(",");
  if (parts.length !== 2) {
    throw new Error(`Invalid time window format: ${rangeStr}`);
  }
  const start = new Date(parts[0].trim().replace(/^"/, "").replace(/"$/, "")).getTime();
  const end = new Date(parts[1].trim().replace(/^"/, "").replace(/"$/, "")).getTime();
  return { start, end };
}

/**
 * Checks whether two time windows overlap (equivalent to PostgreSQL && operator).
 * [s1, e1] && [s2, e2] is true if s1 <= e2 AND s2 <= e1.
 */
export function timeWindowsOverlap(rangeA: string, rangeB: string): boolean {
  try {
    const a = parseTimeRange(rangeA);
    const b = parseTimeRange(rangeB);
    return a.start <= b.end && b.start <= a.end;
  } catch {
    return false;
  }
}

export function formatReadableDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

// ----------------------------------------------------------------------------
// Master Seed Data (Matching supabase/seed.sql lines 23-35)
// ----------------------------------------------------------------------------

export const SEEDED_GEAR_ITEMS: GearItem[] = [
  {
    id: "g1000000-0000-0000-0000-000000000001",
    name: "Sony FX3 Cinema Body",
    category: "camera_body",
    serial_number: "SN-FX3-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000002",
    name: "Sony FX30 Cinema Body",
    category: "camera_body",
    serial_number: "SN-FX30-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000003",
    name: "Sony A7C Mirrorless Body",
    category: "camera_body",
    serial_number: "SN-A7C-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000004",
    name: "Sony FE 24-105mm f/4 G OSS",
    category: "lens",
    serial_number: "SN-LN-24105-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000005",
    name: "DJI Mini 3 Pro Drone",
    category: "drone",
    serial_number: "SN-DR-M3P-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000006",
    name: "DJI Air 3S Drone",
    category: "drone",
    serial_number: "SN-DR-A3S-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000007",
    name: "DJI RS 4 Gimbal",
    category: "gimbal",
    serial_number: "SN-GM-RS4-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000008",
    name: "DJI RS 5 Gimbal",
    category: "gimbal",
    serial_number: "SN-GM-RS5-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000009",
    name: "Wireless Lavalier Mic Kit",
    category: "microphone",
    serial_number: "SN-MIC-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000010",
    name: "LED Key Light Panel",
    category: "light",
    serial_number: "SN-LGT-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000011",
    name: "SDXC V90 128GB Memory Card #1",
    category: "memory_card",
    serial_number: "SN-SD-01",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g1000000-0000-0000-0000-000000000012",
    name: "SDXC V90 128GB Memory Card #2",
    category: "memory_card",
    serial_number: "SN-SD-02",
    status: "available",
    maintenance_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// Authoritative in-memory state
let inMemoryGear: GearItem[] = JSON.parse(JSON.stringify(SEEDED_GEAR_ITEMS));
let inMemoryBookings: GearBooking[] = [];

export function resetGearForTesting(options?: { withMockupSeed?: boolean }) {
  inMemoryGear = JSON.parse(JSON.stringify(SEEDED_GEAR_ITEMS));
  inMemoryBookings = [];

  if (options?.withMockupSeed) {
    // Optionally seed state matching docs/mockups/gear.jpg
    const fx3 = inMemoryGear.find((g) => g.serial_number === "SN-FX3-01");
    const lens = inMemoryGear.find((g) => g.serial_number === "SN-LN-24105-01");
    const rs4 = inMemoryGear.find((g) => g.serial_number === "SN-GM-RS4-01");

    if (fx3) {
      fx3.status = "in_use";
      inMemoryBookings.push({
        id: "b1000000-0000-0000-0000-000000000001",
        gear_id: fx3.id,
        task_id: "t1000000-0000-0000-0000-000000000001",
        responsible_lead_id: "00000000-0000-0000-0000-000000000003",
        time_window: formatTimeWindow("2026-11-24T09:00:00Z", "2026-11-24T17:00:00Z"),
        checked_out_at: "2026-11-24T09:00:00Z",
        returned_at: null,
        battery_ok: null,
        sd_card_ok: null,
        return_condition_note: null,
        created_at: "2026-11-24T09:00:00Z",
        task_title: "The Art of Creation Practical Session Reel",
        lead_name: "Tariqul Islam (Lead)",
        team_label: "Team A",
        gear_name: fx3.name,
        serial_number: fx3.serial_number,
      });
    }

    if (lens) {
      lens.status = "in_use";
      inMemoryBookings.push({
        id: "b1000000-0000-0000-0000-000000000002",
        gear_id: lens.id,
        task_id: "t1000000-0000-0000-0000-000000000001",
        responsible_lead_id: "00000000-0000-0000-0000-000000000003",
        time_window: formatTimeWindow("2026-11-24T09:00:00Z", "2026-11-24T17:00:00Z"),
        checked_out_at: "2026-11-24T09:00:00Z",
        returned_at: null,
        battery_ok: null,
        sd_card_ok: null,
        return_condition_note: null,
        created_at: "2026-11-24T09:00:00Z",
        task_title: "The Art of Creation Practical Session Reel",
        lead_name: "Tariqul Islam (Lead)",
        team_label: "Team A",
        gear_name: lens.name,
        serial_number: lens.serial_number,
      });
    }

    if (rs4) {
      rs4.status = "maintenance";
      rs4.maintenance_note = "Battery lock issue";
    }
  }
}

// ----------------------------------------------------------------------------
// Helpers & Active Tasks/Leads
// ----------------------------------------------------------------------------

export function getActiveShootsAndTasks() {
  const adminProfile: UserProfile = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@assdi.org",
    full_name: "Engr. Mahmudul Hasan",
    phone: "01711000001",
    role: "admin",
    course_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  };
  const requisitions = getRequisitionsForUser(adminProfile);

  return requisitions
    .filter((r) => r.status === "approved" || r.task_id)
    .map((r) => ({
      id: r.task_id || `task-req-${r.id}`,
      title: r.notes || `${r.course_name || "ASSDI"} Shoot`,
      course_name: r.course_name || "General Shoot",
      venue_name: r.venue_name || "ASSDI Campus",
      shoot_date: r.shoot_date,
      call_time: r.call_time,
    }));
}

export function getStaffTeamMembers() {
  return Object.values(DEMO_USERS)
    .filter((u) => u.is_active && (u.role === "staff" || u.role === "admin"))
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role,
    }));
}

// ----------------------------------------------------------------------------
// Gear Queries & Mutations
// ----------------------------------------------------------------------------

export function getAllGearItems(user: UserProfile, filter?: { category?: string; status?: string; search?: string }): GearItem[] {
  // RLS Enforcement: Coordinator CANNOT view gear
  if (user.role === "coordinator") {
    throw new RlsForbiddenError("অননুমোদিত অ্যাক্সেস (Coordinators do not have access to gear inventory)");
  }

  // Active bookings map
  const activeBookingsByGearId = new Map<string, GearBooking>();
  for (const b of inMemoryBookings) {
    if (!b.returned_at) {
      activeBookingsByGearId.set(b.gear_id, b);
    }
  }

  let items = inMemoryGear.map((g) => {
    const booking = activeBookingsByGearId.get(g.id) || null;
    let assigned_to: string | null = null;
    if (booking) {
      assigned_to = `${booking.team_label || "Team A"} · ${booking.task_title || "Active Shoot"}`;
    } else if (g.status === "maintenance") {
      assigned_to = g.maintenance_note ? `Note: ${g.maintenance_note}` : "Under Maintenance";
    }

    return {
      ...g,
      current_booking: booking,
      assigned_to,
    };
  });

  if (filter?.category && filter.category !== "all") {
    items = items.filter((g) => g.category === filter.category);
  }

  if (filter?.status && filter.status !== "all") {
    items = items.filter((g) => g.status === filter.status);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    items = items.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.serial_number.toLowerCase().includes(q) ||
        (g.assigned_to && g.assigned_to.toLowerCase().includes(q))
    );
  }

  return items;
}

export function getGearItemById(id: string, user: UserProfile): GearItem | null {
  if (user.role === "coordinator") {
    throw new RlsForbiddenError("অননুমোদিত অ্যাক্সেস (Coordinators do not have access to gear inventory)");
  }
  const item = inMemoryGear.find((g) => g.id === id);
  if (!item) return null;

  const activeBooking = inMemoryBookings.find((b) => b.gear_id === id && !b.returned_at) || null;
  return {
    ...item,
    current_booking: activeBooking,
    assigned_to: activeBooking
      ? `${activeBooking.team_label || "Team A"} · ${activeBooking.task_title || "Active Shoot"}`
      : item.status === "maintenance"
      ? item.maintenance_note || "Under Maintenance"
      : null,
  };
}

export function createGearItem(input: AddGearInput, user: UserProfile): GearItem {
  // RLS Enforcement: Only admin can insert
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র অ্যাডমিন নতুন সরঞ্জাম যোগ করতে পারেন (Admin only)");
  }

  // Unique serial_number constraint
  const existing = inMemoryGear.find(
    (g) => g.serial_number.trim().toLowerCase() === input.serial_number.trim().toLowerCase()
  );
  if (existing) {
    throw new PostgresUniqueViolationError(
      `সিরিয়াল নম্বর "${input.serial_number}" ইতিমধ্যে নিবন্ধিত রয়েছে (Serial number already exists: ${input.serial_number})`
    );
  }

  const newItem: GearItem = {
    id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim(),
    category: input.category,
    serial_number: input.serial_number.trim(),
    status: input.status || "available",
    maintenance_note: input.status === "maintenance" ? input.maintenance_note || "Initial maintenance" : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryGear.unshift(newItem);
  return newItem;
}

export function updateGearItem(id: string, input: UpdateGearInput, user: UserProfile): GearItem {
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র অ্যাডমিন সরঞ্জাম আপডেট করতে পারেন (Admin only)");
  }

  const item = inMemoryGear.find((g) => g.id === id);
  if (!item) {
    throw new Error("Gear item not found");
  }

  if (input.serial_number && input.serial_number !== item.serial_number) {
    const existing = inMemoryGear.find(
      (g) => g.id !== id && g.serial_number.trim().toLowerCase() === input.serial_number!.trim().toLowerCase()
    );
    if (existing) {
      throw new PostgresUniqueViolationError(`Serial number already exists: ${input.serial_number}`);
    }
    item.serial_number = input.serial_number.trim();
  }

  if (input.name) item.name = input.name.trim();
  if (input.category) item.category = input.category;
  if (input.status) {
    item.status = input.status;
    if (input.status === "available") {
      item.maintenance_note = null;
    } else if (input.status === "maintenance" && input.maintenance_note !== undefined) {
      item.maintenance_note = input.maintenance_note;
    }
  }
  item.updated_at = new Date().toISOString();

  return item;
}

export function deleteGearItem(id: string, user: UserProfile): boolean {
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র অ্যাডমিন সরঞ্জাম মুছে ফেলতে পারেন (Admin only)");
  }

  const activeBooking = inMemoryBookings.find((b) => b.gear_id === id && !b.returned_at);
  if (activeBooking) {
    throw new Error("Cannot delete gear item with active shoot booking (ON DELETE RESTRICT)");
  }

  inMemoryGear = inMemoryGear.filter((g) => g.id !== id);
  return true;
}

// ----------------------------------------------------------------------------
// Check-Out Flow & Double-Booking Lock (PostgreSQL 23P01)
// ----------------------------------------------------------------------------

export async function checkOutGear(
  input: CheckoutGearInput,
  user: UserProfile
): Promise<{ booking: GearBooking; gearItem: GearItem }> {
  // 1. RLS Policy Enforcement: Admin only
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র মিডিয়া হেড (অ্যাডমিন) সরঞ্জাম চেক-আউট করতে পারেন (Admin only)");
  }

  const gear = inMemoryGear.find((g) => g.id === input.gear_id);
  if (!gear) {
    throw new Error(`সরঞ্জাম পাওয়া যায়নি (Gear item not found: ${input.gear_id})`);
  }

  // If item is in maintenance, block check-out
  if (gear.status === "maintenance") {
    throw new Error(`আইটেমটি বর্তমানে রক্ষণাবেক্ষণে রয়েছে: ${gear.maintenance_note || "Maintenance in progress"}`);
  }

  // 2. Format requested time_window
  const requestedWindow = formatTimeWindow(input.start_time, input.end_time);

  // 3. PostgreSQL EXCLUDE USING gist (gear_id WITH =, time_window WITH &&) WHERE (returned_at IS NULL)
  // Check for ANY active booking on this gear whose time_window overlaps
  const conflictingBooking = inMemoryBookings.find(
    (b) => b.gear_id === input.gear_id && !b.returned_at && timeWindowsOverlap(b.time_window, requestedWindow)
  );

  if (conflictingBooking) {
    const range = parseTimeRange(conflictingBooking.time_window);
    const formattedDate = formatReadableDateTime(new Date(range.start).toISOString());
    const leadLabel = conflictingBooking.team_label || conflictingBooking.lead_name || "Team A";

    const formattedMessage = `Double-Booking Blocked: ${gear.name} (${gear.serial_number}) is already assigned to ${leadLabel} on ${formattedDate}.`;

    throw new PostgresExclusionError(
      `new row for relation "gear_bookings" violates exclusion constraint "excl_no_gear_double_booking"`,
      {
        gear_id: gear.id,
        gear_name: gear.name,
        serial_number: gear.serial_number,
        assigned_lead_name: conflictingBooking.lead_name || "Lead Staff",
        team_label: conflictingBooking.team_label || "Team A",
        task_title: conflictingBooking.task_title || "Active Shoot",
        time_window: conflictingBooking.time_window,
        formatted_message: formattedMessage,
      }
    );
  }

  // 4. Resolve task and lead names
  const allTasks = getActiveShootsAndTasks();
  const task = allTasks.find((t) => t.id === input.task_id);
  const staffMembers = getStaffTeamMembers();
  const lead = staffMembers.find((s) => s.id === input.responsible_lead_id);

  const teamLabel = input.team_label || (lead?.full_name ? `${lead.full_name.split(" ")[0]} Team` : "Team A");

  const newBooking: GearBooking = {
    id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    gear_id: gear.id,
    task_id: input.task_id,
    responsible_lead_id: input.responsible_lead_id,
    time_window: requestedWindow,
    checked_out_at: new Date().toISOString(),
    returned_at: null,
    battery_ok: null,
    sd_card_ok: null,
    return_condition_note: null,
    created_at: new Date().toISOString(),
    task_title: task?.title || "Active Shoot",
    lead_name: lead?.full_name || "Staff Lead",
    team_label: teamLabel,
    gear_name: gear.name,
    serial_number: gear.serial_number,
  };

  inMemoryBookings.push(newBooking);

  // 5. Update gear item status
  gear.status = "in_use";
  gear.updated_at = new Date().toISOString();

  return {
    booking: newBooking,
    gearItem: {
      ...gear,
      current_booking: newBooking,
      assigned_to: `${teamLabel} · ${task?.title || "Active Shoot"}`,
    },
  };
}

// ----------------------------------------------------------------------------
// Return & Condition Check-In Flow
// ----------------------------------------------------------------------------

export async function checkInGear(
  input: CheckinGearInput,
  user: UserProfile
): Promise<{ booking: GearBooking; gearItem: GearItem }> {
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র অ্যাডমিন সরঞ্জাম চেক-ইন করতে পারেন (Admin only)");
  }

  const gear = inMemoryGear.find((g) => g.id === input.gear_id);
  if (!gear) {
    throw new Error(`সরঞ্জাম পাওয়া যায়নি (Gear item not found: ${input.gear_id})`);
  }

  // Find active booking
  const activeBooking = inMemoryBookings.find(
    (b) => b.gear_id === input.gear_id && !b.returned_at
  );

  if (!activeBooking) {
    // If no active booking exists, allow updating status directly
    if (input.mark_maintenance) {
      gear.status = "maintenance";
      gear.maintenance_note = input.maintenance_note || input.return_condition_note || "Flagged for maintenance";
    } else {
      gear.status = "available";
      gear.maintenance_note = null;
    }
    gear.updated_at = new Date().toISOString();

    const dummyBooking: GearBooking = {
      id: `b-closed-${Date.now()}`,
      gear_id: gear.id,
      task_id: "t1000000-0000-0000-0000-000000000001",
      responsible_lead_id: user.id,
      time_window: formatTimeWindow(new Date(), new Date()),
      checked_out_at: new Date().toISOString(),
      returned_at: new Date().toISOString(),
      battery_ok: input.battery_ok ?? true,
      sd_card_ok: input.sd_card_ok ?? true,
      return_condition_note: input.return_condition_note || null,
      created_at: new Date().toISOString(),
      gear_name: gear.name,
      serial_number: gear.serial_number,
    };
    return { booking: dummyBooking, gearItem: gear };
  }

  // Update booking
  activeBooking.returned_at = new Date().toISOString();
  activeBooking.battery_ok = input.battery_ok ?? true;
  activeBooking.sd_card_ok = input.sd_card_ok ?? true;
  activeBooking.return_condition_note = input.return_condition_note || null;

  // Update gear item status
  if (input.mark_maintenance) {
    gear.status = "maintenance";
    gear.maintenance_note =
      input.maintenance_note || input.return_condition_note || "Maintenance flagged during return check-in";
  } else {
    gear.status = "available";
    gear.maintenance_note = null;
  }
  gear.updated_at = new Date().toISOString();

  return {
    booking: activeBooking,
    gearItem: {
      ...gear,
      current_booking: null,
      assigned_to: gear.status === "maintenance" ? `Note: ${gear.maintenance_note}` : null,
    },
  };
}

export function markGearReady(gearId: string, user: UserProfile): GearItem {
  if (user.role !== "admin") {
    throw new RlsForbiddenError("শুধুমাত্র অ্যাডমিন সরঞ্জাম প্রস্তুত চিহ্নিত করতে পারেন (Admin only)");
  }

  const gear = inMemoryGear.find((g) => g.id === gearId);
  if (!gear) {
    throw new Error(`Gear item not found: ${gearId}`);
  }

  gear.status = "available";
  gear.maintenance_note = null;
  gear.updated_at = new Date().toISOString();

  return {
    ...gear,
    current_booking: null,
    assigned_to: null,
  };
}

export function getAllBookings(): GearBooking[] {
  return inMemoryBookings;
}
