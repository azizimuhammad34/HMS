import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listMedicines } from "@/lib/services/pharmacy";
import { roleHasPermission } from "@/types/permissions";

export default async function DispensePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "pharmacy:dispense")) {
    redirect("/dashboard");
  }

  const medicines = await listMedicines({ activeOnly: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/pharmacy" className="text-[var(--color-primary)] hover:underline">Pharmacy</Link> / Dispense
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Dispense medicine</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Available medicines: {medicines.length}</p>
      </div>
    </div>
  );
}
