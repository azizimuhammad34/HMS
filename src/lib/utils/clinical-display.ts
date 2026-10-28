export function formatEncounterStatus(status: string): string {
  switch (status) {
    case "checked_in":
      return "Checked in";
    case "in_consultation":
      return "In consultation";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function formatDiagnosisKind(kind: string): string {
  switch (kind) {
    case "primary":
      return "Primary";
    case "secondary":
      return "Secondary";
    default:
      return kind;
  }
}

export function formatEncounterTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEncounterClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function canAccessClinical(role: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "DOCTOR"
  );
}
