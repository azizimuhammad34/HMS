"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, type Role } from "@/types/roles";

export function TopBar({
  fullName,
  role,
}: {
  fullName: string;
  role: Role;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-white px-4 sm:px-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{fullName}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{ROLE_LABELS[role]}</p>
      </div>
      <Button type="button" variant="secondary" onClick={logout}>
        Log out
      </Button>
    </header>
  );
}
