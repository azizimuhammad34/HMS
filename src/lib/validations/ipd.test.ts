import { describe, expect, it } from "vitest";
import {
  admissionListSchema,
  admitPatientSchema,
  createBedSchema,
  dischargeAdmissionSchema,
} from "@/lib/validations/ipd";

describe("ipd validations", () => {
  it("creates beds with trimmed fields", () => {
    const parsed = createBedSchema.parse({
      ward: "  General  ",
      room: " 101 ",
      bedNumber: " A ",
      status: "available",
    });
    expect(parsed.ward).toBe("General");
    expect(parsed.room).toBe("101");
    expect(parsed.bedNumber).toBe("A");
  });

  it("requires patient and bed for admission", () => {
    expect(() =>
      admitPatientSchema.parse({ patientId: "", bedId: "x" }),
    ).toThrow();
    const ok = admitPatientSchema.parse({
      patientId: "abc",
      bedId: "def",
      reason: "  ",
    });
    expect(ok.reason).toBeNull();
  });

  it("requires discharge disposition", () => {
    expect(() => dischargeAdmissionSchema.parse({})).toThrow();
    const ok = dischargeAdmissionSchema.parse({
      dischargeDisposition: "home",
      dischargeSummary: "  Stable  ",
    });
    expect(ok.dischargeSummary).toBe("Stable");
  });

  it("parses census filters", () => {
    const parsed = admissionListSchema.parse({
      status: "admitted",
      page: "1",
    });
    expect(parsed.status).toBe("admitted");
    expect(parsed.page).toBe(1);
  });
});
