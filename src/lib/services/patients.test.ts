import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { Patient } from "@/lib/db/models/Patient";
import {
  findDuplicateCandidates,
  registerPatient,
  searchPatients,
  updatePatientDemographics,
} from "@/lib/services/patients";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

describe("patients service", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("registers a patient with a permanent server-generated ID", async () => {
    const result = await registerPatient({
      registeredBy: new Types.ObjectId().toHexString(),
      input: {
        fullName: "Sara Ali",
        dateOfBirth: new Date("1995-04-12T00:00:00.000Z"),
        sex: "female",
        phone: "03551234567",
        address: "Gilgit",
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: false,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patient.patientId).toBe("HOSP-000001");
    expect(result.patient.fullName).toBe("Sara Ali");
    expect(result.patient.phone).toBe("03551234567");
  });

  it("blocks accidental duplicates until explicitly confirmed", async () => {
    const actor = new Types.ObjectId().toHexString();
    const first = await registerPatient({
      registeredBy: actor,
      input: {
        fullName: "Ahmed Khan",
        dateOfBirth: null,
        sex: "male",
        phone: "03111234567",
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: false,
      },
    });
    expect(first.ok).toBe(true);

    const blocked = await registerPatient({
      registeredBy: actor,
      input: {
        fullName: "Ahmed Khan",
        dateOfBirth: null,
        sex: "male",
        phone: "0311-1234567",
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: false,
      },
    });

    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("POSSIBLE_DUPLICATE");
    expect(blocked.duplicates.length).toBeGreaterThan(0);

    const confirmed = await registerPatient({
      registeredBy: actor,
      input: {
        fullName: "Ahmed Khan",
        dateOfBirth: null,
        sex: "male",
        phone: "03111234567",
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: true,
      },
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.patient.patientId).toBe("HOSP-000002");
  });

  it("searches by name, phone, and patient ID with pagination", async () => {
    const actor = new Types.ObjectId().toHexString();
    await registerPatient({
      registeredBy: actor,
      input: {
        fullName: "Nadia Shah",
        dateOfBirth: null,
        sex: "female",
        phone: "03445556666",
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: false,
      },
    });

    const byName = await searchPatients({ q: "Nadia", page: 1, pageSize: 20 });
    expect(byName.total).toBe(1);
    expect(byName.patients[0]?.fullName).toBe("Nadia Shah");

    const byPhone = await searchPatients({
      q: "03445556666",
      page: 1,
      pageSize: 20,
    });
    expect(byPhone.total).toBe(1);

    const byId = await searchPatients({
      q: "HOSP-000001",
      page: 1,
      pageSize: 20,
    });
    expect(byId.total).toBe(1);
  });

  it("updates permitted demographics only", async () => {
    const actor = new Types.ObjectId().toHexString();
    const created = await registerPatient({
      registeredBy: actor,
      input: {
        fullName: "Old Name",
        dateOfBirth: null,
        sex: "unknown",
        phone: "03001112222",
        address: "Old address",
        emergencyContactName: null,
        emergencyContactPhone: null,
        confirmDuplicate: false,
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const originalId = created.patient.patientId;
    const updated = await updatePatientDemographics({
      id: created.patient.id,
      actorId: actor,
      input: {
        fullName: "New Name",
        address: "Near Jutial, Gilgit",
        phone: "0300-111-2222",
      },
    });

    expect(updated?.fullName).toBe("New Name");
    expect(updated?.address).toContain("Gilgit");
    expect(updated?.phone).toBe("03001112222");
    expect(updated?.patientId).toBe(originalId);

    const unchanged = await Patient.findById(created.patient.id).lean();
    expect(unchanged?.patientId).toBe(originalId);
  });

  it("finds duplicate candidates by exact name", async () => {
    await Patient.create({
      patientId: "HOSP-000010",
      fullName: "Fatima Noor",
      phone: "03990001111",
    });

    const matches = await findDuplicateCandidates({
      fullName: "fatima noor",
      phone: null,
    });
    expect(matches.some((m) => m.patientId === "HOSP-000010")).toBe(true);
  });
});
