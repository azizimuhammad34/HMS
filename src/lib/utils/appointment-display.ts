export function formatAppointmentStatus(status: string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "checked_in":
      return "Checked in";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No show";
    default:
      return status;
  }
}

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAppointmentClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
}
