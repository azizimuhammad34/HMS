import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { Appointment } from "@/lib/db/models/Appointment";
import { Encounter } from "@/lib/db/models/Encounter";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Payment } from "@/lib/db/models/Payment";
import { User } from "@/lib/db/models/User";
import { getSuperAdminDashboard } from "@/lib/services/dashboard";
import { getDayBounds } from "@/lib/utils/date";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

describe("getSuperAdminDashboard", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("returns zeros and empty lists when no operational data exists", async () => {
    const data = await getSuperAdminDashboard(
      new Date("2026-03-16T08:00:00.000Z"),
    );
    expect(data.metrics.registeredPatientsToday).toBe(0);
    expect(data.metrics.visitsToday).toBe(0);
    expect(data.metrics.revenueToday).toBe(0);
    expect(data.recentRegistrations).toEqual([]);
    expect(data.recentPayments).toEqual([]);
  });

  it("separates registrations, visits, and actual payment revenue", async () => {
    const now = new Date("2026-03-16T08:00:00.000Z");
    const { start } = getDayBounds(now);
    const patientTodayId = new Types.ObjectId();
    const yesterdayId = new Types.ObjectId();

    const doctor = await User.create({
      email: "doc@example.com",
      fullName: "Dr Test",
      passwordHash: "hash",
      role: "DOCTOR",
    });
    const doctorId = doctor._id as unknown as Types.ObjectId;

    await Patient.insertMany(
      [
        {
          _id: patientTodayId,
          patientId: "HOSP-000001",
          fullName: "Ali Khan",
          createdAt: new Date(start.getTime() + 60_000),
          updatedAt: new Date(start.getTime() + 60_000),
        },
        {
          _id: yesterdayId,
          patientId: "HOSP-000002",
          fullName: "Yesterday Patient",
          createdAt: new Date(start.getTime() - 60_000),
          updatedAt: new Date(start.getTime() - 60_000),
        },
      ],
      { timestamps: false },
    );

    await Encounter.create({
      patientId: patientTodayId,
      doctorId,
      startedAt: new Date(start.getTime() + 120_000),
      status: "checked_in",
    });

    await Payment.create({
      patientId: patientTodayId,
      amount: 1500,
      status: "completed",
      paidAt: new Date(start.getTime() + 180_000),
    });

    await Payment.create({
      patientId: patientTodayId,
      amount: 200,
      status: "refunded",
      paidAt: new Date(start.getTime() + 200_000),
    });

    await Invoice.create({
      invoiceNumber: "INV-1",
      patientId: patientTodayId,
      totalAmount: 3000,
      amountPaid: 1500,
      status: "partially_paid",
    });

    await Appointment.create({
      patientId: patientTodayId,
      doctorId,
      scheduledAt: new Date(start.getTime() + 300_000),
      status: "scheduled",
    });

    const data = await getSuperAdminDashboard(now);

    expect(data.metrics.registeredPatientsToday).toBe(1);
    expect(data.metrics.visitsToday).toBe(1);
    expect(data.metrics.revenueToday).toBe(1500);
    expect(data.metrics.refundsToday).toBe(200);
    expect(data.metrics.netCollectionsToday).toBe(1300);
    expect(data.metrics.outstandingBalances).toBe(1500);
    expect(data.appointmentsToday.total).toBe(1);
    expect(data.appointmentsToday.scheduled).toBe(1);
    expect(data.recentRegistrations[0]?.patientId).toBe("HOSP-000001");
  });
});
