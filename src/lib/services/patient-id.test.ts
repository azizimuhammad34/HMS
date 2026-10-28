import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Counter } from "@/lib/db/models/Counter";
import { Patient } from "@/lib/db/models/Patient";
import { allocatePatientId } from "@/lib/services/patient-id";
import { clearTestDb, startTestDb, stopTestDb } from "@/test/db";

describe("allocatePatientId", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("generates sequential readable IDs without counting patient documents", async () => {
    const first = await allocatePatientId();
    const second = await allocatePatientId();

    expect(first).toBe("HOSP-000001");
    expect(second).toBe("HOSP-000002");

    const counter = await Counter.findOne({ name: "patientId" }).lean();
    expect(counter?.seq).toBe(2);

    // Counter is independent of patient collection size.
    expect(await Patient.countDocuments()).toBe(0);
  });

  it("allocates unique IDs under concurrent requests", async () => {
    const ids = await Promise.all(
      Array.from({ length: 20 }, () => allocatePatientId()),
    );
    expect(new Set(ids).size).toBe(20);
    expect(ids.every((id) => /^HOSP-\d{6}$/.test(id))).toBe(true);
  });
});
