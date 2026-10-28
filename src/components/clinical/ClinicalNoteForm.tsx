"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ClinicalNoteForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [examination, setExamination] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/encounters/${encounterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType: "consultation",
          chiefComplaint: chiefComplaint || null,
          history: history || null,
          examination: examination || null,
          assessment: assessment || null,
          plan: plan || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not save note");
        return;
      }
      setChiefComplaint("");
      setHistory("");
      setExamination("");
      setAssessment("");
      setPlan("");
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
        label="Chief complaint"
        name="chiefComplaint"
        value={chiefComplaint}
        onChange={(e) => setChiefComplaint(e.target.value)}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          History
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={history}
          onChange={(e) => setHistory(e.target.value)}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Examination
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={examination}
          onChange={(e) => setExamination(e.target.value)}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Assessment
        </span>
        <textarea
          className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={assessment}
          onChange={(e) => setAssessment(e.target.value)}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">Plan</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save clinical note"}
      </Button>
    </form>
  );
}
