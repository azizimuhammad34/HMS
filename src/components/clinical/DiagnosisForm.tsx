"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DiagnosisForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"primary" | "secondary">("primary");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/encounters/${encounterId}/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          code: code || null,
          kind,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not save diagnosis");
        return;
      }
      setDescription("");
      setCode("");
      setKind("primary");
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Input
        label="Diagnosis"
        name="description"
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Acute upper respiratory infection"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Code (optional)"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ICD / local code"
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">
            Type
          </span>
          <select
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "primary" | "secondary")
            }
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Add diagnosis"}
      </Button>
    </form>
  );
}
