import Link from "next/link";
import { redirect } from "next/navigation";
import { PatientRegisterForm } from "@/components/patients/PatientRegisterForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { roleHasPermission } from "@/types/permissions";

export default async function NewPatientPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "patients:register")) {
    redirect("/patients");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/patients" className="text-[var(--color-primary)] hover:underline">
            Patients
          </Link>
          {" / "}
          Register
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">
          Register patient
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          A unique patient ID is assigned automatically on the server. Collect
          only information needed for care and registration.
        </p>
      </div>
      <PatientRegisterForm />
    </div>
  );
}
