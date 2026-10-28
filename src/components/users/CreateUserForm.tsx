"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ASSIGNABLE_BY_ADMIN,
  ASSIGNABLE_BY_SUPER_ADMIN,
  ROLE_LABELS,
  type Role,
} from "@/types/roles";
import { generateTemporaryPassword } from "@/lib/utils/temp-password";

export function CreateUserForm({ actorRole }: { actorRole: Role }) {
  const router = useRouter();
  const roles = useMemo(
    () =>
      actorRole === "SUPER_ADMIN"
        ? ASSIGNABLE_BY_SUPER_ADMIN
        : ASSIGNABLE_BY_ADMIN,
    [actorRole],
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[0] ?? "RECEPTIONIST");
  const [temporaryPassword, setTemporaryPassword] = useState(() =>
    generateTemporaryPassword(),
  );
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatedPassword(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          role,
          temporaryPassword,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not create user");
        return;
      }
      setCreatedPassword(temporaryPassword);
      setFullName("");
      setEmail("");
      setTemporaryPassword(generateTemporaryPassword());
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 border-t border-[var(--color-border)] pt-4"
    >
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        Create account
      </h2>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {createdPassword ? (
        <Alert tone="success">
          Account created. Share this temporary password securely out of band,
          then ask the user to change it:{" "}
          <span className="font-mono">{createdPassword}</span>
        </Alert>
      ) : null}
      <Input
        label="Full name"
        name="fullName"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">Role</span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Temporary password"
        name="temporaryPassword"
        value={temporaryPassword}
        onChange={(e) => setTemporaryPassword(e.target.value)}
        minLength={12}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
