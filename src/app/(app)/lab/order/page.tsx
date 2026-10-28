import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listLabTests } from "@/lib/services/lab";
import { roleHasPermission } from "@/types/permissions";

export default async function LabOrderPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "lab:order")) {
    redirect("/lab");
  }

  const tests = await listLabTests({ activeOnly: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/lab" className="text-[var(--color-primary)] hover:underline">Lab</Link> / New order
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Create lab order</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Available tests: {tests.length}</p>
      </div>
    </div>
  );
}
