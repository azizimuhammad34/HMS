import { describe, expect, it } from "vitest";
import {
  canAccessClinical,
  formatDiagnosisKind,
  formatEncounterStatus,
} from "@/lib/utils/clinical-display";

describe("clinical display helpers", () => {
  it("formats encounter statuses", () => {
    expect(formatEncounterStatus("checked_in")).toBe("Checked in");
    expect(formatEncounterStatus("in_consultation")).toBe("In consultation");
  });

  it("formats diagnosis kinds", () => {
    expect(formatDiagnosisKind("primary")).toBe("Primary");
    expect(formatDiagnosisKind("secondary")).toBe("Secondary");
  });

  it("limits clinical UI access to doctor and super admin", () => {
    expect(canAccessClinical("DOCTOR")).toBe(true);
    expect(canAccessClinical("SUPER_ADMIN")).toBe(true);
    expect(canAccessClinical("RECEPTIONIST")).toBe(false);
    expect(canAccessClinical("NURSE")).toBe(false);
  });
});
