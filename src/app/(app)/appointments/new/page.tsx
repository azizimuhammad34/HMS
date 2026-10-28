import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentScheduleForm } from "@/components/appointments/AppointmentScheduleForm";
import { Alert } from "@/components/ui/Alert";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listDoctors } from "@/lib/services/appointments";
import { roleHasPermission } from "@/types/permissions";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "appointments:manage")) {
    redirect("/appointments");
  }

  const { patientId } = await searchParams;
  const doctors = await listDoctors();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link
            href="/appointments"
            className="text-[var(--color-primary)] hover:underline"
          >
            Appointments
          </Link>
          {" / "}
          Schedule
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
          Schedule appointment
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Times are stored against Asia/Karachi. Overlapping slots for the same
          doctor are blocked.
        </p>
      </div>

      {doctors.length === 0 ? (
        <Alert tone="warning">
          No active doctor accounts found. Create a Doctor user before
          scheduling appointments.
        </Alert>
      ) : (
        <AppointmentScheduleForm
          doctors={doctors}
          initialPatientId={patientId}
        />
      )}
    </div>
  );
}
