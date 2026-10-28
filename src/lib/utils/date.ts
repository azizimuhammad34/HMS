/** Asia/Karachi is UTC+5 year-round (no DST). */
export const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Hospital local calendar day boundaries for "today" metrics.
 * Uses Asia/Karachi so revenue and registration counts match Gilgit operations.
 */
export function getDayBounds(date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const localMs = date.getTime() + KARACHI_OFFSET_MS;
  const local = new Date(localMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  const start = new Date(Date.UTC(y, m, d) - KARACHI_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - KARACHI_OFFSET_MS);
  const label = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { start, end, label };
}

/**
 * Parses a datetime as Asia/Karachi local wall time.
 * Accepts `YYYY-MM-DDTHH:mm`, `YYYY-MM-DDTHH:mm:ss`, or a full ISO string.
 */
export function parseHospitalDateTime(value: string): Date {
  const trimmed = value.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const h = Number(match[4]);
    const min = Number(match[5]);
    const s = Number(match[6] ?? 0);
    return new Date(Date.UTC(y, m - 1, d, h, min, s) - KARACHI_OFFSET_MS);
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date/time");
  }
  return date;
}

/** Formats a UTC instant as `YYYY-MM-DDTHH:mm` in Asia/Karachi for form inputs. */
export function toHospitalDateTimeLocal(date: Date): string {
  const local = new Date(date.getTime() + KARACHI_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  const h = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/** Calendar date label `YYYY-MM-DD` in Asia/Karachi. */
export function toHospitalDateLabel(date = new Date()): string {
  return getDayBounds(date).label;
}
