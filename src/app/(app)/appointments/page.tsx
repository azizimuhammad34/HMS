import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import { AppointmentDateFilter } from "@/components/appointments/AppointmentDateFilter";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  listAppointments,
  listDoctors,
} from "@/lib/services/appointments";
import {
  formatAppointmentClock,
  formatAppointmentStatus,
} from "@/lib/utils/appointment-display";
import { canAccessClinical } from "@/lib/utils/clinical-display";
import { toHospitalDateLabel } from "@/lib/utils/date";
import { roleHasPermission } from "@/types/permissions";
import { appointmentListSchema } from "@/lib/validations/appointment";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    doctorId?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "appointments:read")) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const parsed = appointmentListSchema.parse({
    date: raw.date || undefined,
    doctorId: raw.doctorId || undefined,
    status: raw.status || undefined,
    page: raw.page ?? "1",
  });

  const canManage = roleHasPermission(session.user.role, "appointments:manage");
  const canCheckIn = roleHasPermission(
    session.user.role,
    "appointments:check_in",
  );
  const showClinicalLink = canAccessClinical(session.user.role);
  const scopedDoctorId =
    session.user.role === "DOCTOR" && !canManage ? session.user.id : undefined;

  const [result, doctors] = await Promise.all([
    listAppointments({
      ...parsed,
      date: parsed.date ?? toHospitalDateLabel(),
      scopedDoctorId,
    }),
    canManage ? listDoctors() : Promise.resolve([]),
  ]);

  const dateLabel = result.date;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {session.user.role === "DOCTOR" && !canManage
              ? "Your schedule for the selected day (Asia/Karachi)."
              : "Schedule, reschedule, cancel, and check patients in."}
          </p>
        </div>
        {canManage ? (
          <Link href="/appointments/new">
            <Button type="button">Schedule appointment</Button>
          </Link>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <AppointmentDateFilter
          initialDate={dateLabel}
          doctors={doctors}
          initialDoctorId={parsed.doctorId}
          canFilterDoctor={canManage}
        />
      </Suspense>

      {result.appointments.length === 0 ? (
        <EmptyState
          title="No appointments for this day"
          description={
            canManage
              ? "Schedule an appointment or pick another date."
              : "Nothing is on the schedule for this day."
          }
        />
      ) : (
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Patient</th>
                <th className="py-2 pr-4 font-medium">Doctor</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.appointments.map((appt) => (
                <tr key={appt.id} className="align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <p className="font-medium">
                      {formatAppointmentClock(appt.scheduledAt)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {appt.durationMinutes} min
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/patients/${appt.patientId}`}
                      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {appt.patientName}
                    </Link>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {appt.patientDisplayId}
                    </p>
                    {appt.reason ? (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {appt.reason}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">{appt.doctorName}</td>
                  <td className="py-3 pr-4">
                    {formatAppointmentStatus(appt.status)}
                  </td>
                  <td className="py-3 min-w-[16rem] space-y-2">
                    {showClinicalLink && appt.encounterId ? (
                      <Link
                        href={`/clinical/${appt.encounterId}`}
                        className="block text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        Open visit
                      </Link>
                    ) : null}
                    <AppointmentActions
                      appointment={appt}
                      canManage={canManage}
                      canCheckIn={canCheckIn}
                      doctors={doctors}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          {parsed.page > 1 ? (
            <Link
              className="text-[var(--color-primary)] hover:underline"
              href={`/appointments?date=${encodeURIComponent(dateLabel)}&page=${parsed.page - 1}${parsed.doctorId ? `&doctorId=${parsed.doctorId}` : ""}`}
            >
              Previous
            </Link>
          ) : null}
          <span className="text-[var(--color-text-muted)]">
            Page {parsed.page} of {totalPages} · {result.total} total
          </span>
          {parsed.page < totalPages ? (
            <Link
              className="text-[var(--color-primary)] hover:underline"
              href={`/appointments?date=${encodeURIComponent(dateLabel)}&page=${parsed.page + 1}${parsed.doctorId ? `&doctorId=${parsed.doctorId}` : ""}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
