"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SetupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, setupSecret }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Setup failed");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? (
        <Alert tone="success">Super Admin created. Redirecting to login…</Alert>
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
      <Input
        label="Password"
        name="password"
        type="password"
        required
        minLength={12}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Setup secret"
        name="setupSecret"
        type="password"
        required
        value={setupSecret}
        onChange={(e) => setSetupSecret(e.target.value)}
      />
      <p className="text-xs text-[var(--color-text-muted)]">
        Use the SETUP_SECRET from your server environment. This form works only
        once, before any Super Admin exists.
      </p>
      <Button type="submit" className="w-full" disabled={loading || success}>
        {loading ? "Creating…" : "Create Super Admin"}
      </Button>
    </form>
  );
}
