import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { Admission } from "@/lib/db/models/Admission";
import { Bed } from "@/lib/db/models/Bed";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import {
  IpdServiceError,
  admitPatient,
  createBed,
  dischargeAdmission,
  getActiveAdmissionForPatient,
  getBedOccupancySummary,
  listAdmissions,
  listBeds,
  updateBed,
} from "@/lib/services/ipd";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

async function seedPatientDoctorActor() {
  const patient = await Patient.create({
    patientId: "HOSP-000701",
    fullName: "IPD Patient",
    phone: "03009998877",
    sex: "female",
  });
  const doctor = await User.create({
    email: "ipd-doctor@example.com",
    fullName: "Dr Ward",
    role: "DOCTOR",
    passwordHash: "hash",
    isActive: true,
  });
  const actorId = new Types.ObjectId().toHexString();
  return {
    patientId: String(patient._id),
    doctorId: String(doctor._id),
    actorId,
  };
}

describe("ipd service", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("creates beds and reports occupancy", async () => {
    const actorId = new Types.ObjectId().toHexString();
    const bed = await createBed({
      actorId,
      input: {
        ward: "General",
        room: "101",
        bedNumber: "A",
      },
    });
    expect(bed.code).toBe("GENERAL-101-A");
    expect(bed.status).toBe("available");

    const summary = await getBedOccupancySummary();
    expect(summary.totalActive).toBe(1);
    expect(summary.available).toBe(1);
    expect(summary.byWard[0]?.ward).toBe("General");
  });

  it("admits a patient onto an available bed and blocks double admission", async () => {
    const { patientId, doctorId, actorId } = await seedPatientDoctorActor();
    const bed = await createBed({
      actorId,
      input: { ward: "Surgical", room: "2", bedNumber: "1" },
    });

    const admission = await admitPatient({
      actorId,
      input: {
        patientId,
        bedId: bed.id,
        admittingDoctorId: doctorId,
        reason: "Observation",
      },
    });

    expect(admission.status).toBe("admitted");
    expect(admission.bedCode).toBe(bed.code);
    expect(admission.patientName).toBe("IPD Patient");
    expect(admission.admittingDoctorName).toBe("Dr Ward");

    const beds = await listBeds({});
    expect(beds[0]?.status).toBe("occupied");

    const encounter = await Encounter.findById(admission.encounterId);
    expect(encounter?.type).toBe("ipd");
    expect(encounter?.status).toBe("in_consultation");

    const active = await getActiveAdmissionForPatient(patientId);
    expect(active?.id).toBe(admission.id);

    await expect(
      admitPatient({
        actorId,
        input: { patientId, bedId: bed.id },
      }),
    ).rejects.toMatchObject({
      code: "ALREADY_ADMITTED",
      status: 409,
    } satisfies Partial<IpdServiceError>);
  });

  it("discharges a patient and frees the bed", async () => {
    const { patientId, actorId } = await seedPatientDoctorActor();
    const bed = await createBed({
      actorId,
      input: { ward: "General", room: "3", bedNumber: "B" },
    });
    const admission = await admitPatient({
      actorId,
      input: { patientId, bedId: bed.id, reason: "IV antibiotics" },
    });

    const discharged = await dischargeAdmission({
      id: admission.id,
      actorId,
      input: {
        dischargeDisposition: "home",
        dischargeSummary: "Improved; continue oral meds",
      },
    });

    expect(discharged.status).toBe("discharged");
    expect(discharged.dischargeDisposition).toBe("home");

    const freed = await Bed.findById(bed.id);
    expect(freed?.status).toBe("available");
    expect(freed?.currentAdmissionId).toBeNull();

    const encounter = await Encounter.findById(admission.encounterId);
    expect(encounter?.status).toBe("completed");

    const listed = await listAdmissions({
      status: "admitted",
      page: 1,
      pageSize: 20,
    });
    expect(listed.total).toBe(0);
  });

  it("prevents marking an occupied bed as maintenance", async () => {
    const { patientId, actorId } = await seedPatientDoctorActor();
    const bed = await createBed({
      actorId,
      input: { ward: "ICU", room: "1", bedNumber: "1" },
    });
    await admitPatient({
      actorId,
      input: { patientId, bedId: bed.id },
    });

    await expect(
      updateBed({
        id: bed.id,
        actorId,
        input: { status: "maintenance" },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
      status: 409,
    });
  });

  it("rejects admitting onto an unavailable bed", async () => {
    const { patientId, actorId } = await seedPatientDoctorActor();
    const bed = await createBed({
      actorId,
      input: {
        ward: "General",
        room: "9",
        bedNumber: "C",
        status: "maintenance",
      },
    });

    await expect(
      admitPatient({
        actorId,
        input: { patientId, bedId: bed.id },
      }),
    ).rejects.toMatchObject({
      code: "BED_UNAVAILABLE",
      status: 409,
    });

    expect(await Admission.countDocuments()).toBe(0);
  });

  it("blocks a second patient from claiming the same bed", async () => {
    const first = await seedPatientDoctorActor();
    const secondPatient = await Patient.create({
      patientId: "HOSP-000702",
      fullName: "Second Patient",
      phone: "03001112233",
      sex: "male",
    });
    const bed = await createBed({
      actorId: first.actorId,
      input: { ward: "General", room: "4", bedNumber: "D" },
    });

    await admitPatient({
      actorId: first.actorId,
      input: { patientId: first.patientId, bedId: bed.id },
    });

    await expect(
      admitPatient({
        actorId: first.actorId,
        input: {
          patientId: String(secondPatient._id),
          bedId: bed.id,
        },
      }),
    ).rejects.toMatchObject({
      code: "BED_UNAVAILABLE",
      status: 409,
    });

    expect(await Admission.countDocuments({ status: "admitted" })).toBe(1);
  });
});
