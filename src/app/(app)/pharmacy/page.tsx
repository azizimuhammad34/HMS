import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listMedicines } from "@/lib/services/pharmacy";
import { roleHasPermission } from "@/types/permissions";

export default async function PharmacyPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "pharmacy:dispense")) {
    redirect("/dashboard");
  }

  const canManageStock = roleHasPermission(session.user.role, "pharmacy:manage_stock");
  const medicines = await listMedicines({ activeOnly: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Pharmacy</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Medicine stock and dispensing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageStock ? (
            <Link href="/pharmacy/medicines/new" className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
              Add medicine
            </Link>
          ) : null}
          <Link href="/pharmacy/dispense" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]">
            Dispense
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Medicines</h2>
        {medicines.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No medicines in stock.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {medicines.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{m.name}{m.strength ? ` ${m.strength}` : ""}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{m.form} · {m.genericName || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[var(--color-text)]">Stock: {m.stock} {m.unit}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{m.isActive ? "Active" : "Inactive"} · Min {m.minStock}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
