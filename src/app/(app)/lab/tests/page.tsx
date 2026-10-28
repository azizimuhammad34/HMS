import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listLabTests } from "@/lib/services/lab";
import { roleHasPermission } from "@/types/permissions";

export default async function LabTestsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "lab:read")) {
    redirect("/dashboard");
  }
  const canManage = roleHasPermission(session.user.role, "lab:order");
  const tests = await listLabTests({ activeOnly: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">
            <Link href="/lab" className="text-[var(--color-primary)] hover:underline">Lab</Link> / Tests
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Test catalog</h1>
        </div>
        {canManage ? (
          <Link href="/lab/tests/new" className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
            Add test
          </Link>
        ) : null}
      </div>
      {tests.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No tests defined.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {tests.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium text-[var(--color-text)]">{t.code} · {t.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t.category} · {t.sampleType || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-text)]">Rs {t.price}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t.isActive ? "Active" : "Inactive"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
