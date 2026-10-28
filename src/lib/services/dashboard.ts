import { connectDb } from "@/lib/db/connection";
import { Admission } from "@/lib/db/models/Admission";
import { Appointment } from "@/lib/db/models/Appointment";
import { Encounter } from "@/lib/db/models/Encounter";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Payment } from "@/lib/db/models/Payment";
import { getDayBounds } from "@/lib/utils/date";
import type { Role } from "@/types/roles";

export type SuperAdminDashboard = {
  dateLabel: string;
  timezone: string;
  metrics: {
    registeredPatientsToday: number;
    visitsToday: number;
    revenueToday: number;
    refundsToday: number;
    netCollectionsToday: number;
    outstandingBalances: number;
  };
  recentRegistrations: Array<{
    id: string;
    patientId: string;
    fullName: string;
    createdAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string;
  }>;
  appointmentsToday: {
    total: number;
    scheduled: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
  };
  alerts: string[];
};

export type RoleDashboardSummary = {
  role: Role;
  dateLabel: string;
  cards: Array<{ label: string; value: string | number; hint?: string }>;
  quickActions: Array<{ label: string; href: string }>;
  notes: string[];
};

export async function getSuperAdminDashboard(
  now = new Date(),
): Promise<SuperAdminDashboard> {
  await connectDb();
  const { start, end, label } = getDayBounds(now);

  const [
    registeredPatientsToday,
    visitsToday,
    paymentAgg,
    refundAgg,
    outstandingAgg,
    recentPatients,
    recentPayments,
    appointmentGroups,
  ] = await Promise.all([
    Patient.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Encounter.countDocuments({ startedAt: { $gte: start, $lte: end } }),
    Payment.aggregate<{ total: number }>([
      {
        $match: {
          status: "completed",
          paidAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate<{ total: number }>([
      {
        $match: {
          status: "refunded",
          paidAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Invoice.aggregate<{ total: number }>([
      {
        $match: {
          status: { $in: ["issued", "partially_paid"] },
        },
      },
      {
        $project: {
          outstanding: { $subtract: ["$totalAmount", "$amountPaid"] },
        },
      },
      { $match: { outstanding: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$outstanding" } } },
    ]),
    Patient.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("patientId fullName createdAt")
      .lean(),
    Payment.find({ paidAt: { $gte: start, $lte: end } })
      .sort({ paidAt: -1 })
      .limit(8)
      .select("amount currency status paidAt")
      .lean(),
    Appointment.aggregate<{ _id: string; count: number }>([
      { $match: { scheduledAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const revenueToday = paymentAgg[0]?.total ?? 0;
  const refundsToday = refundAgg[0]?.total ?? 0;
  const outstandingBalances = outstandingAgg[0]?.total ?? 0;

  const apptMap = Object.fromEntries(
    appointmentGroups.map((g) => [g._id, g.count]),
  ) as Record<string, number>;

  const appointmentsToday = {
    total: appointmentGroups.reduce((sum, g) => sum + g.count, 0),
    scheduled: apptMap.scheduled ?? 0,
    checkedIn: apptMap.checked_in ?? 0,
    completed: apptMap.completed ?? 0,
    cancelled: apptMap.cancelled ?? 0,
  };

  const alerts: string[] = [];
  if (outstandingBalances > 0) {
    alerts.push("There are open invoice balances requiring follow-up.");
  }
  if (appointmentsToday.scheduled > 0 && appointmentsToday.checkedIn === 0) {
    alerts.push("Scheduled appointments today have not yet been checked in.");
  }

  return {
    dateLabel: label,
    timezone: "Asia/Karachi",
    metrics: {
      registeredPatientsToday,
      visitsToday,
      revenueToday,
      refundsToday,
      netCollectionsToday: revenueToday - refundsToday,
      outstandingBalances,
    },
    recentRegistrations: recentPatients.map((p) => ({
      id: String(p._id),
      patientId: p.patientId,
      fullName: p.fullName,
      createdAt: new Date(p.createdAt).toISOString(),
    })),
    recentPayments: recentPayments.map((p) => ({
      id: String(p._id),
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paidAt: new Date(p.paidAt).toISOString(),
    })),
    appointmentsToday,
    alerts,
  };
}

export async function getRoleDashboardSummary(
  role: Role,
  userId: string,
  now = new Date(),
): Promise<RoleDashboardSummary> {
  await connectDb();
  const { start, end, label } = getDayBounds(now);

  if (role === "ADMIN") {
    const [patientsToday, visitsToday, appts, inpatients] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Encounter.countDocuments({ startedAt: { $gte: start, $lte: end } }),
      Appointment.countDocuments({ scheduledAt: { $gte: start, $lte: end } }),
      Admission.countDocuments({ status: "admitted" }),
    ]);
    return {
      role,
      dateLabel: label,
      cards: [
        { label: "Patients registered today", value: patientsToday, hint: label },
        { label: "Visits today", value: visitsToday, hint: label },
        { label: "Appointments today", value: appts, hint: label },
        { label: "Current inpatients", value: inpatients },
      ],
      quickActions: [
        { label: "Register patient", href: "/patients/new" },
        { label: "Schedule appointment", href: "/appointments/new" },
        { label: "Today's appointments", href: "/appointments" },
        { label: "IPD census", href: "/ipd" },
      ],
      notes: [],
    };
  }

  if (role === "RECEPTIONIST") {
    const [appts, inpatients] = await Promise.all([
      Appointment.countDocuments({
        scheduledAt: { $gte: start, $lte: end },
        status: { $in: ["scheduled", "checked_in"] },
      }),
      Admission.countDocuments({ status: "admitted" }),
    ]);
    return {
      role,
      dateLabel: label,
      cards: [
        {
          label: "Today's open appointments",
          value: appts,
          hint: label,
        },
        { label: "Current inpatients", value: inpatients },
      ],
      quickActions: [
        { label: "Register patient", href: "/patients/new" },
        { label: "Search patients", href: "/patients" },
        { label: "Schedule appointment", href: "/appointments/new" },
        { label: "Today's appointments", href: "/appointments" },
        { label: "Admit patient", href: "/ipd/admit" },
      ],
      notes: [],
    };
  }

  if (role === "DOCTOR") {
    const [myAppts, awaiting, myInpatients] = await Promise.all([
      Appointment.countDocuments({
        doctorId: userId,
        scheduledAt: { $gte: start, $lte: end },
        status: { $nin: ["cancelled"] },
      }),
      Encounter.countDocuments({
        doctorId: userId,
        status: { $in: ["checked_in", "in_consultation"] },
      }),
      Admission.countDocuments({
        admittingDoctorId: userId,
        status: "admitted",
      }),
    ]);
    return {
      role,
      dateLabel: label,
      cards: [
        { label: "My appointments today", value: myAppts, hint: label },
        { label: "Awaiting consultation", value: awaiting },
        { label: "My inpatients", value: myInpatients },
      ],
      quickActions: [
        { label: "My schedule", href: "/appointments" },
        { label: "Clinical queue", href: "/clinical" },
        { label: "IPD census", href: "/ipd" },
      ],
      notes: [],
    };
  }

  // NURSE
  const [pendingVitals, inpatients] = await Promise.all([
    Encounter.countDocuments({
      status: { $in: ["checked_in", "in_consultation"] },
    }),
    Admission.countDocuments({ status: "admitted" }),
  ]);
  return {
    role,
    dateLabel: label,
    cards: [
      {
        label: "Active encounters",
        value: pendingVitals,
        hint: "Patients currently in care",
      },
      { label: "Current inpatients", value: inpatients },
    ],
    quickActions: [
      { label: "Record vitals", href: "/nursing/vitals" },
      { label: "Nursing notes", href: "/nursing/notes" },
      { label: "IPD census", href: "/ipd" },
    ],
    notes: [
      "Patient assignment workflows will be configured in a later phase.",
    ],
  };
}
