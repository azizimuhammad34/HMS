import Link from "next/link";
import { redirect } from "next/navigation";
import { MedicineForm } from "@/components/pharmacy/MedicineForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { roleHasPermission } from "@/types/permissions";

export default async function NewMedicinePage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "pharmacy:manage_stock")) {
    redirect("/pharmacy");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/pharmacy" className="text-[var(--color-primary)] hover:underline">Pharmacy</Link> / Add medicine
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Add medicine</h1>
      </div>
      <MedicineForm />
    </div>
  );
}
