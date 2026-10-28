export function formatSex(sex: string): string {
  switch (sex) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "other":
      return "Other";
    default:
      return "Unknown";
  }
}

export function calculateAge(
  dateOfBirth: string | null,
  at: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const m = at.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
