import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { roleHasPermission } from "@/types/permissions";

export default async function NewLabTestPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "lab:order")) {
    redirect("/lab/tests");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/lab/tests" className="text-[var(--color-primary)] hover:underline">Tests</Link> / Add test
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text)]">Add lab test</h1>
      </div>
    </div>
  );
}
