import { describe, expect, it } from "vitest";
import { calculateAge, formatSex } from "@/lib/utils/patient-display";

describe("patient display helpers", () => {
  it("formats sex labels", () => {
    expect(formatSex("female")).toBe("Female");
    expect(formatSex("unknown")).toBe("Unknown");
  });

  it("calculates age from date of birth", () => {
    const age = calculateAge("2000-01-15", new Date("2026-03-16T00:00:00.000Z"));
    expect(age).toBe(26);
    expect(calculateAge(null)).toBeNull();
  });
});
