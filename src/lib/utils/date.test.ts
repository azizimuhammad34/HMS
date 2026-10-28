import { describe, expect, it } from "vitest";
import {
  getDayBounds,
  parseHospitalDateTime,
  toHospitalDateTimeLocal,
} from "@/lib/utils/date";

describe("getDayBounds", () => {
  it("returns Asia/Karachi day window for a known UTC instant", () => {
    // 2026-03-15 22:30 UTC = 2026-03-16 03:30 Asia/Karachi
    const date = new Date("2026-03-15T22:30:00.000Z");
    const { start, end, label } = getDayBounds(date);

    expect(label).toBe("2026-03-16");
    expect(start.toISOString()).toBe("2026-03-15T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-16T18:59:59.999Z");
  });
});

describe("hospital local datetime helpers", () => {
  it("parses Karachi wall time into UTC", () => {
    const date = parseHospitalDateTime("2026-03-16T10:30");
    expect(date.toISOString()).toBe("2026-03-16T05:30:00.000Z");
  });

  it("round-trips datetime-local values", () => {
    const utc = new Date("2026-03-16T05:30:00.000Z");
    expect(toHospitalDateTimeLocal(utc)).toBe("2026-03-16T10:30");
  });
});
