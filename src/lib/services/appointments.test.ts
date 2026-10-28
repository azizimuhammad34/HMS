import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import {
  AppointmentServiceError,
  cancelAppointment,
  checkInAppointment,
  listAppointments,
  rescheduleAppointment,
  scheduleAppointment,
} from "@/lib/services/appointments";
import { parseHospitalDateTime, toHospitalDateLabel } from "@/lib/utils/date";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

async function seedPatientAndDoctor() {
  const patient = await Patient.create({
    patientId: "HOSP-000001",
    fullName: "Test Patient",
    phone: "03001234567",
    sex: "female",
  });
  const doctor = await User.create({
    email: "doctor@example.com",
    fullName: "Dr Test",
    role: "DOCTOR",
    passwordHash: "hash",
    isActive: true,
  });
  const actor = new Types.ObjectId().toHexString();
  return { patient, doctor, actor };
}

describe("appointments service", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("schedules an appointment and lists it for the hospital day", async () => {
    const { patient, doctor, actor } = await seedPatientAndDoctor();
    const day = toHospitalDateLabel();
    const scheduledAt = parseHospitalDateTime(`${day}T10:00`);

    const created = await scheduleAppointment({
      actorId: actor,
      input: {
        patientId: String(patient._id),
        doctorId: String(doctor._id),
        scheduledAt,
        durationMinutes: 15,
        reason: "Follow-up",
      },
    });

    expect(created.status).toBe("scheduled");
    expect(created.patientName).toBe("Test Patient");
    expect(created.doctorName).toBe("Dr Test");
    expect(created.reason).toBe("Follow-up");

    const listed = await listAppointments({
      date: day,
      page: 1,
      pageSize: 20,
    });
    expect(listed.total).toBe(1);
    expect(listed.appointments[0]?.id).toBe(created.id);
  });

  it("blocks overlapping appointments for the same doctor", async () => {
    const { patient, doctor, actor } = await seedPatientAndDoctor();
    const day = toHospitalDateLabel();
    const scheduledAt = parseHospitalDateTime(`${day}T11:00`);

    await scheduleAppointment({
      actorId: actor,
      input: {
        patientId: String(patient._id),
        doctorId: String(doctor._id),
        scheduledAt,
        durationMinutes: 30,
        reason: null,
      },
    });

    await expect(
      scheduleAppointment({
        actorId: actor,
        input: {
          patientId: String(patient._id),
          doctorId: String(doctor._id),
          scheduledAt: parseHospitalDateTime(`${day}T11:15`),
          durationMinutes: 15,
          reason: null,
        },
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<AppointmentServiceError>);
  });

  it("reschedules and cancels while preventing invalid transitions", async () => {
    const { patient, doctor, actor } = await seedPatientAndDoctor();
    const day = toHospitalDateLabel();
    const created = await scheduleAppointment({
      actorId: actor,
      input: {
        patientId: String(patient._id),
        doctorId: String(doctor._id),
        scheduledAt: parseHospitalDateTime(`${day}T14:00`),
        durationMinutes: 15,
        reason: null,
      },
    });

    const moved = await rescheduleAppointment({
      id: created.id,
      actorId: actor,
      input: {
        scheduledAt: parseHospitalDateTime(`${day}T15:30`),
      },
    });
    expect(moved.scheduledAt).toBe(
      parseHospitalDateTime(`${day}T15:30`).toISOString(),
    );

    const cancelled = await cancelAppointment({
      id: created.id,
      actorId: actor,
      input: { cancelReason: "Patient request" },
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("Patient request");

    await expect(
      cancelAppointment({
        id: created.id,
        actorId: actor,
        input: {},
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("checks in and creates an encounter visit", async () => {
    const { patient, doctor, actor } = await seedPatientAndDoctor();
    const day = toHospitalDateLabel();
    const created = await scheduleAppointment({
      actorId: actor,
      input: {
        patientId: String(patient._id),
        doctorId: String(doctor._id),
        scheduledAt: parseHospitalDateTime(`${day}T09:00`),
        durationMinutes: 15,
        reason: null,
      },
    });

    const checkedIn = await checkInAppointment({
      id: created.id,
      actorId: actor,
    });

    expect(checkedIn.appointment.status).toBe("checked_in");
    expect(checkedIn.encounterId).toBeTruthy();

    const encounter = await Encounter.findById(checkedIn.encounterId).lean();
    expect(encounter?.status).toBe("checked_in");
    expect(String(encounter?.patientId)).toBe(String(patient._id));
    expect(String(encounter?.appointmentId)).toBe(created.id);

    // Idempotent second check-in returns the same encounter.
    const again = await checkInAppointment({
      id: created.id,
      actorId: actor,
    });
    expect(again.encounterId).toBe(checkedIn.encounterId);
  });
});
