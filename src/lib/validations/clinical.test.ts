import { describe, expect, it } from "vitest";
import {
  clinicalNoteSchema,
  diagnosisSchema,
  encounterListSchema,
  prescriptionSchema,
} from "@/lib/validations/clinical";

describe("clinical validations", () => {
  it("normalizes optional note fields", () => {
    const parsed = clinicalNoteSchema.parse({
      noteType: "consultation",
      chiefComplaint: "  Headache  ",
      history: "   ",
      examination: null,
    });
    expect(parsed.chiefComplaint).toBe("Headache");
    expect(parsed.history).toBeNull();
    expect(parsed.examination).toBeNull();
  });

  it("requires diagnosis description", () => {
    expect(() => diagnosisSchema.parse({ description: "a" })).toThrow();
    const ok = diagnosisSchema.parse({
      description: "Hypertension",
      kind: "primary",
    });
    expect(ok.description).toBe("Hypertension");
  });

  it("requires at least one medication", () => {
    expect(() => prescriptionSchema.parse({ items: [] })).toThrow();
    const ok = prescriptionSchema.parse({
      items: [{ medication: "Amoxicillin", dosage: "500mg" }],
      notes: "  ",
    });
    expect(ok.items).toHaveLength(1);
    expect(ok.notes).toBeNull();
  });

  it("parses encounter list filters", () => {
    const parsed = encounterListSchema.parse({
      date: "2026-10-28",
      status: "active",
      page: "2",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.status).toBe("active");
  });
});
