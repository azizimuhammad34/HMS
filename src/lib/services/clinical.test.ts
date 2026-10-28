import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import {
  ClinicalServiceError,
  addClinicalNote,
  addDiagnosis,
  addPrescription,
  completeEncounter,
  getEncounterDetail,
  getPatientClinicalHistory,
  listEncounters,
  startConsultation,
} from "@/lib/services/clinical";
import { toHospitalDateLabel } from "@/lib/utils/date";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

async function seedEncounter() {
  const patient = await Patient.create({
    patientId: "HOSP-000100",
    fullName: "Clinical Patient",
    phone: "03001112233",
    sex: "male",
  });
  const doctor = await User.create({
    email: "clinician@example.com",
    fullName: "Dr Clinic",
    role: "DOCTOR",
    passwordHash: "hash",
    isActive: true,
  });
  const encounter = await Encounter.create({
    patientId: String(patient._id),
    doctorId: String(doctor._id),
    type: "opd",
    status: "checked_in",
    startedAt: new Date(),
  } as Record<string, unknown>);
  return {
    patient,
    doctor,
    encounterId: String(encounter._id),
    patientId: String(patient._id),
    actor: { id: String(doctor._id), role: "DOCTOR" as const },
  };
}

describe("clinical service", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("lists active encounters for the hospital day", async () => {
    const { encounterId, doctor } = await seedEncounter();
    const listed = await listEncounters({
      date: toHospitalDateLabel(),
      page: 1,
      pageSize: 20,
      scopedDoctorId: String(doctor._id),
    });
    expect(listed.total).toBe(1);
    expect(listed.encounters[0]?.id).toBe(encounterId);
    expect(listed.encounters[0]?.patientName).toBe("Clinical Patient");
  });

  it("starts consultation, records note/diagnosis/rx, and completes", async () => {
    const { encounterId, actor, patientId } = await seedEncounter();

    const started = await startConsultation({
      id: encounterId,
      actor,
    });
    expect(started.status).toBe("in_consultation");

    const note = await addClinicalNote({
      encounterId,
      actor,
      input: {
        noteType: "consultation",
        chiefComplaint: "Fever",
        assessment: "Viral illness",
        plan: "Rest and fluids",
      },
    });
    expect(note.chiefComplaint).toBe("Fever");

    const dx = await addDiagnosis({
      encounterId,
      actor,
      input: {
        description: "Viral upper respiratory infection",
        kind: "primary",
        code: "J06.9",
      },
    });
    expect(dx.code).toBe("J06.9");

    const rx = await addPrescription({
      encounterId,
      actor,
      input: {
        items: [
          {
            medication: "Paracetamol",
            dosage: "500mg",
            frequency: "TDS",
            duration: "3 days",
          },
        ],
      },
    });
    expect(rx.items[0]?.medication).toBe("Paracetamol");

    const detail = await getEncounterDetail(encounterId, actor);
    expect(detail.notes).toHaveLength(1);
    expect(detail.diagnoses).toHaveLength(1);
    expect(detail.prescriptions).toHaveLength(1);

    const completed = await completeEncounter({
      id: encounterId,
      actor,
    });
    expect(completed.status).toBe("completed");

    const history = await getPatientClinicalHistory(patientId);
    expect(history.encounters).toHaveLength(1);
    expect(history.encounters[0]?.diagnoses[0]?.description).toContain("Viral");
    expect(history.encounters[0]?.prescriptions[0]?.medications).toContain(
      "Paracetamol",
    );
  });

  it("blocks another doctor from accessing the encounter", async () => {
    const { encounterId } = await seedEncounter();
    const other = await User.create({
      email: "otherdoc@example.com",
      fullName: "Other Doc",
      role: "DOCTOR",
      passwordHash: "hash",
      isActive: true,
    });

    await expect(
      getEncounterDetail(encounterId, {
        id: String(other._id),
        role: "DOCTOR",
      }),
    ).rejects.toMatchObject({
      name: "ClinicalServiceError",
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<ClinicalServiceError>);
  });

  it("rejects notes on completed encounters", async () => {
    const { encounterId, actor } = await seedEncounter();
    await completeEncounter({ id: encounterId, actor });

    await expect(
      addClinicalNote({
        encounterId,
        actor,
        input: { chiefComplaint: "Late note" },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
      status: 409,
    });
  });

  it("requires at least one note field", async () => {
    const { encounterId, actor } = await seedEncounter();
    await expect(
      addClinicalNote({
        encounterId,
        actor,
        input: {},
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns not found for invalid encounter ids", async () => {
    await expect(
      getEncounterDetail(new Types.ObjectId().toHexString(), {
        id: new Types.ObjectId().toHexString(),
        role: "SUPER_ADMIN",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
