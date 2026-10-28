export function formatBedStatus(status: string): string {
  switch (status) {
    case "available":
      return "Available";
    case "occupied":
      return "Occupied";
    case "maintenance":
      return "Maintenance";
    default:
      return status;
  }
}

export function formatAdmissionStatus(status: string): string {
  switch (status) {
    case "admitted":
      return "Admitted";
    case "discharged":
      return "Discharged";
    default:
      return status;
  }
}

export function formatDischargeDisposition(value: string | null): string {
  if (!value) return "—";
  switch (value) {
    case "home":
      return "Home";
    case "transfer":
      return "Transfer";
    case "lama":
      return "Left against medical advice";
    case "deceased":
      return "Deceased";
    case "other":
      return "Other";
    default:
      return value;
  }
}

export function formatIpdDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
