"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

const DISPOSITIONS = [
  { value: "home", label: "Home" },
  { value: "transfer", label: "Transfer" },
  { value: "lama", label: "Left against medical advice" },
  { value: "deceased", label: "Deceased" },
  { value: "other", label: "Other" },
] as const;

export function DischargeForm({ admissionId }: { admissionId: string }) {
  const router = useRouter();
  const [disposition, setDisposition] =
    useState<(typeof DISPOSITIONS)[number]["value"]>("home");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admissions/${admissionId}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dischargeDisposition: disposition,
          dischargeSummary: summary || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Discharge failed");
        return;
      }
      router.refresh();
      router.push("/ipd");
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Disposition
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={disposition}
          onChange={(e) =>
            setDisposition(
              e.target.value as (typeof DISPOSITIONS)[number]["value"],
            )
          }
          required
        >
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Discharge summary (optional)
        </span>
        <textarea
          className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      <Button type="submit" variant="danger" disabled={loading}>
        {loading ? "Discharging…" : "Discharge patient"}
      </Button>
    </form>
  );
}
