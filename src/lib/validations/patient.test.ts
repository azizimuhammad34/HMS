import { describe, expect, it } from "vitest";
import {
  patientSearchSchema,
  registerPatientSchema,
  updatePatientSchema,
} from "@/lib/validations/patient";

describe("patient validations", () => {
  it("registers with normalized optional fields", () => {
    const parsed = registerPatientSchema.parse({
      fullName: "  Sara Ali  ",
      dateOfBirth: "1995-04-12",
      sex: "female",
      phone: "  ",
      address: null,
    });

    expect(parsed.fullName).toBe("Sara Ali");
    expect(parsed.phone).toBeNull();
    expect(parsed.address).toBeNull();
    expect(parsed.confirmDuplicate).toBe(false);
    expect(parsed.dateOfBirth?.toISOString().startsWith("1995-04-12")).toBe(
      true,
    );
  });

  it("rejects future dates of birth", () => {
    const result = registerPatientSchema.safeParse({
      fullName: "Future Baby",
      dateOfBirth: "2099-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("allows partial demographic updates", () => {
    const parsed = updatePatientSchema.parse({
      fullName: "Updated Name",
      phone: "03001234567",
    });
    expect(parsed.fullName).toBe("Updated Name");
    expect(parsed.phone).toBe("03001234567");
    expect(parsed.dateOfBirth).toBeUndefined();
  });

  it("parses search pagination defaults", () => {
    const parsed = patientSearchSchema.parse({});
    expect(parsed.q).toBe("");
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });
});
