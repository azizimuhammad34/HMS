import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Hospital Management System
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold text-[var(--color-text)]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
             — authorized staff only
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <LoginForm nextPath={nextPath} />
        </div>
        <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          First-time installation?{" "}
          <Link href="/setup" className="text-[var(--color-primary)] hover:underline">
            Complete setup
          </Link>
        </p>
      </div>
    </main>
  );
}
