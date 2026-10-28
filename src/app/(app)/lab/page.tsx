import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listLabOrders } from "@/lib/services/lab";
import { roleHasPermission } from "@/types/permissions";

export default async function LabPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "lab:read")) {
    redirect("/dashboard");
  }

  const canOrder = roleHasPermission(session.user.role, "lab:order");
  const canProcess = roleHasPermission(session.user.role, "lab:process");
  let result: Awaited<ReturnType<typeof listLabOrders>> = { orders: [], total: 0, page: 1, pageSize: 20 };
  try {
    result = await listLabOrders({ pageSize: 20 });
  } catch {
    result = { orders: [], total: 0, page: 1, pageSize: 20 };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Lab</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Test orders and results.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOrder ? (
            <Link href="/lab/order" className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
              New order
            </Link>
          ) : null}
          <Link href="/lab/tests" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]">
            Test catalog
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent orders</h2>
        {result.orders.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No lab orders yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {result.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{o.orderNumber}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{o.items.length} test(s) · {o.status}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/lab/orders/${o.id}`} className="text-[var(--color-primary)] hover:underline">View</Link>
                  {canProcess ? <Link href={`/lab/orders/${o.id}/process`} className="text-[var(--color-primary)] hover:underline">Process</Link> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
