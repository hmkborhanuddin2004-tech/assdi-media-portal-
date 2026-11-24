import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  getAllGearItems,
  getGearItemById,
  createGearItem,
  updateGearItem,
  deleteGearItem,
  checkOutGear,
  checkInGear,
  markGearReady,
  getAllBookings,
  resetGearForTesting,
  PostgresExclusionError,
  PostgresUniqueViolationError,
  RlsForbiddenError,
  type GearBooking,
  type GearItem,
} from "@/lib/gear/store";
import {
  addGearSchema,
  checkoutGearSchema,
} from "@/lib/validations/gear";
import { DEMO_USERS, toUserProfile } from "@/lib/auth/demo-users";

describe("S5-01 & S5-02: Gear Master Inventory, Concurrency Stress Test & PostgreSQL EXCLUDE Lock", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/001_init.sql");
  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");

  const adminUser = toUserProfile(DEMO_USERS["admin@assdi.org"]);
  const staffUser = toUserProfile(DEMO_USERS["staff@assdi.org"]);
  const internUser = toUserProfile(DEMO_USERS["intern@assdi.org"]);
  const coordinatorUser = toUserProfile(DEMO_USERS["coordinator@assdi.org"]);

  beforeEach(() => {
    resetGearForTesting();
  });

  // --------------------------------------------------------------------------
  // 1. Audit Migration 001_init.sql & seed.sql for Gear Schema & Constraints
  // --------------------------------------------------------------------------
  describe("Audit 001_init.sql & seed.sql: Schema, Constraints & RLS Policies", () => {
    it("verifies gear_items table schema and enums in 001_init.sql", () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.gear_items");
      expect(sql).toContain("serial_number TEXT NOT NULL UNIQUE");
      expect(sql).toContain("category public.gear_category NOT NULL");
      expect(sql).toContain("status public.gear_status NOT NULL DEFAULT 'available'");
      expect(sql).toContain("maintenance_note TEXT");
    });

    it("verifies gear_bookings table and excl_no_gear_double_booking constraint", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.gear_bookings");
      expect(sql).toContain("gear_id UUID NOT NULL REFERENCES public.gear_items(id) ON DELETE RESTRICT");
      expect(sql).toContain("task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE");
      expect(sql).toContain("responsible_lead_id UUID NOT NULL REFERENCES public.profiles(id)");
      expect(sql).toContain("time_window TSTZRANGE NOT NULL");
      expect(sql).toContain("checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
      expect(sql).toContain("returned_at TIMESTAMPTZ");
      expect(sql).toContain("battery_ok BOOLEAN");
      expect(sql).toContain("sd_card_ok BOOLEAN");
      expect(sql).toContain("return_condition_note TEXT");

      // GiST exclusion constraint with partial condition WHERE (returned_at IS NULL)
      expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist;");
      expect(sql).toContain("CONSTRAINT excl_no_gear_double_booking");
      expect(sql).toContain("EXCLUDE USING gist (");
      expect(sql).toContain("gear_id WITH =");
      expect(sql).toContain("time_window WITH &&");
      expect(sql).toContain("WHERE (returned_at IS NULL)");
    });

    it("verifies RLS policies for gear_items and gear_bookings in 001_init.sql", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.gear_bookings ENABLE ROW LEVEL SECURITY;");

      expect(sql).toContain("CREATE POLICY gear_items_select ON public.gear_items FOR SELECT TO authenticated");
      expect(sql).toContain("current_user_role() IN ('admin', 'staff', 'intern')");

      expect(sql).toContain("CREATE POLICY gear_items_admin_all ON public.gear_items FOR ALL TO authenticated");
      expect(sql).toContain("current_user_role() = 'admin'");

      expect(sql).toContain("CREATE POLICY gear_bookings_select ON public.gear_bookings FOR SELECT TO authenticated");
      expect(sql).toContain("CREATE POLICY gear_bookings_admin_all ON public.gear_bookings FOR ALL TO authenticated");
    });

    it("verifies all 12 seed gear items are present in seed.sql", () => {
      expect(fs.existsSync(seedPath)).toBe(true);
      const seedSql = fs.readFileSync(seedPath, "utf-8");

      const seededSerials = [
        "SN-FX3-01",
        "SN-FX30-01",
        "SN-A7C-01",
        "SN-LN-24105-01",
        "SN-DR-M3P-01",
        "SN-DR-A3S-01",
        "SN-GM-RS4-01",
        "SN-GM-RS5-01",
        "SN-MIC-01",
        "SN-LGT-01",
        "SN-SD-01",
        "SN-SD-02",
      ];

      for (const sn of seededSerials) {
        expect(seedSql).toContain(sn);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Concurrency Stress Test: Promise.all() Double-Booking Lock (23P01)
  // --------------------------------------------------------------------------
  describe("Gate 2 Concurrency Stress Test: Promise.all() Overlapping Check-Outs", () => {
    it("fires two simultaneous check-outs for Sony FX3 (SN-FX3-01) over overlapping time_window — EXACTLY 1 succeeds, 1 fails with 23P01", async () => {
      const allGear = getAllGearItems(adminUser);
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01");
      expect(fx3).toBeDefined();
      expect(fx3!.status).toBe("available");

      // Overlapping shoot windows
      // Booking 1: 09:00 AM to 05:00 PM
      const bookingInput1 = {
        gear_id: fx3!.id,
        task_id: "t1000000-0000-0000-0000-000000000001",
        responsible_lead_id: staffUser.id,
        start_time: "2026-11-25T09:00:00Z",
        end_time: "2026-11-25T17:00:00Z",
        team_label: "Team A",
      };

      // Booking 2: 02:00 PM to 08:00 PM (overlaps between 02:00 PM and 05:00 PM!)
      const bookingInput2 = {
        gear_id: fx3!.id,
        task_id: "t1000000-0000-0000-0000-000000000001",
        responsible_lead_id: staffUser.id,
        start_time: "2026-11-25T14:00:00Z",
        end_time: "2026-11-25T20:00:00Z",
        team_label: "Team B",
      };

      // Fire simultaneous check-outs concurrently with Promise.allSettled
      const [res1, res2] = await Promise.allSettled([
        checkOutGear(bookingInput1, adminUser),
        checkOutGear(bookingInput2, adminUser),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
      const rejected = [res1, res2].filter((r) => r.status === "rejected");

      // Assert EXACTLY 1 succeeds and 1 fails
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Inspect successful booking
      const successResult = (
        fulfilled[0] as PromiseFulfilledResult<{ booking: GearBooking; gearItem: GearItem }>
      ).value;
      expect(successResult.booking).toBeDefined();
      expect(successResult.booking.gear_id).toBe(fx3!.id);
      expect(successResult.gearItem.status).toBe("in_use");

      // Inspect failure: MUST be Postgres error code 23P01 (exclusion violation)
      const error = (rejected[0] as PromiseRejectedResult).reason;
      expect(error).toBeInstanceOf(PostgresExclusionError);
      expect(error.code).toBe("23P01");
      expect(error.constraint).toBe("excl_no_gear_double_booking");
      expect(error.message).toContain("excl_no_gear_double_booking");

      // Verify clear alert message with conflicting booking details
      expect(error.conflictingBooking).toBeDefined();
      expect(error.conflictingBooking.gear_name).toBe("Sony FX3 Cinema Body");
      expect(error.conflictingBooking.serial_number).toBe("SN-FX3-01");
      expect(error.conflictingBooking.formatted_message).toContain("Double-Booking Blocked");
      expect(error.conflictingBooking.formatted_message).toContain("Sony FX3");

      // Verify only 1 active booking recorded in bookings registry
      const bookings = getAllBookings();
      const activeBookings = bookings.filter((b) => b.gear_id === fx3!.id && !b.returned_at);
      expect(activeBookings).toHaveLength(1);
    });

    it("verifies sequential non-overlapping bookings on the same gear succeed", async () => {
      const allGear = getAllGearItems(adminUser);
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01")!;

      // Day 1 booking
      const day1 = await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
          team_label: "Team A",
        },
        adminUser
      );
      expect(day1.booking.id).toBeDefined();

      // Day 2 booking (completely non-overlapping window)
      // In PostgreSQL: [2026-11-25, 2026-11-25] && [2026-11-27, 2026-11-27] is false
      const day2 = await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-27T09:00:00Z",
          end_time: "2026-11-27T17:00:00Z",
          team_label: "Team B",
        },
        adminUser
      );
      expect(day2.booking.id).toBeDefined();
    });

    it("verifies consecutive adjacent back-to-back bookings on the same gear succeed without collision", async () => {
      const allGear = getAllGearItems(adminUser);
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01")!;

      // Morning shoot: 09:00 AM to 01:00 PM
      const morning = await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T13:00:00Z",
          team_label: "Morning Team",
        },
        adminUser
      );
      expect(morning.booking.id).toBeDefined();

      // Afternoon shoot: 01:00 PM to 05:00 PM (adjacent boundary: 13:00 == 13:00)
      // In PostgreSQL: [09:00, 13:00) && [13:00, 17:00) is FALSE (no points in common)
      const afternoon = await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T13:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
          team_label: "Afternoon Team",
        },
        adminUser
      );
      expect(afternoon.booking.id).toBeDefined();
    });

    it("verifies booking after return check-in succeeds (WHERE returned_at IS NULL condition)", async () => {
      const allGear = getAllGearItems(adminUser);
      const fx3 = allGear.find((g) => g.serial_number === "SN-FX3-01")!;

      // Initial check-out
      await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
          team_label: "Team A",
        },
        adminUser
      );

      // Return Check-In
      const returnResult = await checkInGear(
        {
          gear_id: fx3.id,
          battery_ok: true,
          sd_card_ok: true,
          return_condition_note: "Returned in perfect condition",
          mark_maintenance: false,
        },
        adminUser
      );
      expect(returnResult.gearItem.status).toBe("available");
      expect(returnResult.booking.returned_at).not.toBeNull();

      // Subsequent check-out for the same time window now SUCCEEDS because returned_at IS NOT NULL
      const secondBooking = await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
          team_label: "Team B",
        },
        adminUser
      );
      expect(secondBooking.booking.id).toBeDefined();
      expect(secondBooking.gearItem.status).toBe("in_use");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Return & Condition Check-In & Maintenance Flow
  // --------------------------------------------------------------------------
  describe("Return Check-In, Battery/SD Verification & Maintenance Lifecycle", () => {
    it("returns gear item as Available and clears assigned shoot", async () => {
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;
      await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
        },
        adminUser
      );

      const res = await checkInGear(
        {
          gear_id: fx3.id,
          battery_ok: true,
          sd_card_ok: true,
          return_condition_note: "No damage",
          mark_maintenance: false,
        },
        adminUser
      );

      expect(res.gearItem.status).toBe("available");
      expect(res.gearItem.maintenance_note).toBeNull();
      expect(res.booking.battery_ok).toBe(true);
      expect(res.booking.sd_card_ok).toBe(true);
      expect(res.booking.return_condition_note).toBe("No damage");
    });

    it("flags gear for Maintenance when damage note or maintenance toggle is set", async () => {
      const rs4 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-GM-RS4-01")!;
      await checkOutGear(
        {
          gear_id: rs4.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
        },
        adminUser
      );

      const res = await checkInGear(
        {
          gear_id: rs4.id,
          battery_ok: false,
          sd_card_ok: true,
          return_condition_note: "Axis lock loose after drop",
          mark_maintenance: true,
          maintenance_note: "Axis lock loose after drop",
        },
        adminUser
      );

      expect(res.gearItem.status).toBe("maintenance");
      expect(res.gearItem.maintenance_note).toBe("Axis lock loose after drop");

      // Verify gear in maintenance cannot be checked out
      await expect(
        checkOutGear(
          {
            gear_id: rs4.id,
            task_id: "t1000000-0000-0000-0000-000000000001",
            responsible_lead_id: staffUser.id,
            start_time: "2026-11-26T09:00:00Z",
            end_time: "2026-11-26T17:00:00Z",
          },
          adminUser
        )
      ).rejects.toThrow("রক্ষণাবেক্ষণে");
    });

    it("marks maintenance gear Ready and restores status to Available", () => {
      const rs4 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-GM-RS4-01")!;
      updateGearItem(rs4.id, { status: "maintenance", maintenance_note: "Broken clip" }, adminUser);

      const readyItem = markGearReady(rs4.id, adminUser);
      expect(readyItem.status).toBe("available");
      expect(readyItem.maintenance_note).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 4. RLS & Security Policy Tests: Non-Admin Cannot Mutate
  // --------------------------------------------------------------------------
  describe("Gate 2 Security & RLS Policy Enforcement: Non-Admin Mutation Guards", () => {
    it("blocks staff from checking out gear (RLS gear_bookings_admin_all)", async () => {
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;

      await expect(
        checkOutGear(
          {
            gear_id: fx3.id,
            task_id: "t1000000-0000-0000-0000-000000000001",
            responsible_lead_id: staffUser.id,
            start_time: "2026-11-25T09:00:00Z",
            end_time: "2026-11-25T17:00:00Z",
          },
          staffUser
        )
      ).rejects.toThrow(RlsForbiddenError);
    });

    it("blocks intern from checking out gear", async () => {
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;

      await expect(
        checkOutGear(
          {
            gear_id: fx3.id,
            task_id: "t1000000-0000-0000-0000-000000000001",
            responsible_lead_id: internUser.id,
            start_time: "2026-11-25T09:00:00Z",
            end_time: "2026-11-25T17:00:00Z",
          },
          internUser
        )
      ).rejects.toThrow(RlsForbiddenError);
    });

    it("blocks non-admin from creating or updating gear items (RLS gear_items_admin_all)", () => {
      expect(() =>
        createGearItem(
          {
            name: "Hacker Camera",
            category: "camera_body",
            serial_number: "SN-HACK-01",
            status: "available",
          },
          staffUser
        )
      ).toThrow(RlsForbiddenError);

      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;
      expect(() =>
        updateGearItem(fx3.id, { name: "Tampered Name" }, coordinatorUser)
      ).toThrow(RlsForbiddenError);

      expect(() => deleteGearItem(fx3.id, internUser)).toThrow(RlsForbiddenError);
    });

    it("blocks coordinator from viewing gear inventory (RLS gear_items_select)", () => {
      expect(() => getAllGearItems(coordinatorUser)).toThrow(RlsForbiddenError);
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;
      expect(() => getGearItemById(fx3.id, coordinatorUser)).toThrow(RlsForbiddenError);
    });

    it("allows staff and intern to view gear items (RLS gear_items_select)", () => {
      const staffView = getAllGearItems(staffUser);
      expect(staffView.length).toBeGreaterThanOrEqual(12);

      const internView = getAllGearItems(internUser);
      expect(internView.length).toBeGreaterThanOrEqual(12);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Unique Serial Number & Validation Tests
  // --------------------------------------------------------------------------
  describe("Unique Serial Number Constraint & Zod Validation", () => {
    it("rejects duplicate serial number with unique violation error", () => {
      expect(() =>
        createGearItem(
          {
            name: "Duplicate Sony FX3",
            category: "camera_body",
            serial_number: "SN-FX3-01", // Already seeded!
            status: "available",
          },
          adminUser
        )
      ).toThrow(PostgresUniqueViolationError);
    });

    it("validates addGearSchema against invalid inputs", () => {
      const emptyName = addGearSchema.safeParse({
        name: "",
        category: "camera_body",
        serial_number: "SN-TEST-01",
      });
      expect(emptyName.success).toBe(false);

      const invalidCategory = addGearSchema.safeParse({
        name: "Test Cam",
        category: "invalid_category",
        serial_number: "SN-TEST-01",
      });
      expect(invalidCategory.success).toBe(false);
    });

    it("validates checkoutGearSchema ensures end_time is after start_time", () => {
      const invalidWindow = checkoutGearSchema.safeParse({
        gear_id: "00000000-0000-0000-0000-000000000001",
        task_id: "00000000-0000-0000-0000-000000000002",
        responsible_lead_id: "00000000-0000-0000-0000-000000000003",
        start_time: "2026-11-25T17:00:00Z",
        end_time: "2026-11-25T09:00:00Z", // End before start!
      });
      expect(invalidWindow.success).toBe(false);
    });

    it("rejects duplicate serial number during updateGearItem", () => {
      const fx30 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX30-01")!;
      expect(() =>
        updateGearItem(
          fx30.id,
          {
            serial_number: "SN-FX3-01", // Collides with FX3!
          },
          adminUser
        )
      ).toThrow(PostgresUniqueViolationError);
    });

    it("allows updating gear item without changing serial number", () => {
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;
      const updated = updateGearItem(
        fx3.id,
        {
          name: "Sony FX3 Cinema Body (Rigged)",
          serial_number: "SN-FX3-01", // Same serial
        },
        adminUser
      );
      expect(updated.name).toBe("Sony FX3 Cinema Body (Rigged)");
      expect(updated.serial_number).toBe("SN-FX3-01");
    });

    it("updates gear status to maintenance with note and back to available", () => {
      const a7c = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-A7C-01")!;
      const underMaintenance = updateGearItem(
        a7c.id,
        {
          status: "maintenance",
          maintenance_note: "Hot shoe pin bent",
        },
        adminUser
      );
      expect(underMaintenance.status).toBe("maintenance");
      expect(underMaintenance.maintenance_note).toBe("Hot shoe pin bent");

      const backAvailable = updateGearItem(
        a7c.id,
        {
          status: "available",
        },
        adminUser
      );
      expect(backAvailable.status).toBe("available");
      expect(backAvailable.maintenance_note).toBeNull();
    });

    it("blocks deleteGearItem when item has an active shoot booking (ON DELETE RESTRICT)", async () => {
      const fx3 = getAllGearItems(adminUser).find((g) => g.serial_number === "SN-FX3-01")!;
      await checkOutGear(
        {
          gear_id: fx3.id,
          task_id: "t1000000-0000-0000-0000-000000000001",
          responsible_lead_id: staffUser.id,
          start_time: "2026-11-25T09:00:00Z",
          end_time: "2026-11-25T17:00:00Z",
        },
        adminUser
      );

      expect(() => deleteGearItem(fx3.id, adminUser)).toThrow("active shoot booking");
    });

    it("deletes gear item when there is no active shoot booking", () => {
      const newlyAdded = createGearItem(
        {
          name: "Temporary Test Mic",
          category: "microphone",
          serial_number: "SN-TMP-MIC-01",
          status: "available",
        },
        adminUser
      );

      const deleted = deleteGearItem(newlyAdded.id, adminUser);
      expect(deleted).toBe(true);

      const lookup = getGearItemById(newlyAdded.id, adminUser);
      expect(lookup).toBeNull();
    });
  });
});
