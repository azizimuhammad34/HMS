import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/SetupForm";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

export default async function SetupPage() {
  try {
    await connectDb();
    const exists = await User.exists({ role: "SUPER_ADMIN" });
    if (exists) {
      redirect("/login");
    }
  } catch {
    // Allow setup UI even if DB is temporarily unreachable; POST will fail clearly.
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
            Initial setup
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold text-[var(--color-text)]">
            Create Super Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Provision the hospital owner account. No default production password
            is hardcoded.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
