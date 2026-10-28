import Link from "next/link";
import { redirect } from "next/navigation";
import { AdmitForm } from "@/components/ipd/AdmitForm";
import { Alert } from "@/components/ui/Alert";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listDoctors } from "@/lib/services/appointments";
import { listAvailableBeds } from "@/lib/services/ipd";
import { roleHasPermission } from "@/types/permissions";

export default async function AdmitPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "ipd:admit")) {
    redirect("/ipd");
  }

  const { patientId } = await searchParams;
  const [doctors, availableBeds] = await Promise.all([
    listDoctors(),
    listAvailableBeds(),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/ipd" className="text-[var(--color-primary)] hover:underline">
            IPD
          </Link>
          {" / Admit"}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
          Admit patient
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Assign an available bed and open an inpatient encounter.
        </p>
      </div>

      {availableBeds.length === 0 ? (
        <Alert tone="error">
          No available beds.{" "}
          <Link href="/ipd/beds" className="underline">
            Configure beds
          </Link>{" "}
          or discharge a patient first.
        </Alert>
      ) : null}

      <AdmitForm
        doctors={doctors.map((d) => ({ id: d.id, fullName: d.fullName }))}
        availableBeds={availableBeds.map((b) => ({
          id: b.id,
          code: b.code,
          ward: b.ward,
          room: b.room,
          bedNumber: b.bedNumber,
        }))}
        initialPatientId={patientId}
      />
    </div>
  );
}
