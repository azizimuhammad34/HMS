"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type PatientOption = {
  id: string;
  patientId: string;
  fullName: string;
};

export function NursingNoteForm({
  initialPatientId,
  initialEncounterId,
  initialAdmissionId,
}: {
  initialPatientId?: string;
  initialEncounterId?: string;
  initialAdmissionId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [note, setNote] = useState("");
  const [shift, setShift] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!initialPatientId) return;
    let cancelled = false;
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${initialPatientId}`);
        const json = (await res.json()) as {
          success: boolean;
          data?: { patient: PatientOption };
        };
        if (!cancelled && json.success && json.data?.patient) {
          setPatients([json.data.patient]);
          setPatientId(json.data.patient.id);
          setQuery(json.data.patient.fullName);
        }
      } catch {
        /* ignore */
      }
    }
    void loadPatient();
    return () => {
      cancelled = true;
    };
  }, [initialPatientId]);

  async function searchPatients() {
    if (query.trim().length < 2) {
      setError("Enter at least 2 characters to search");
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/patients?q=${encodeURIComponent(query.trim())}&pageSize=10`,
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: { patients: PatientOption[] };
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Search failed");
        return;
      }
      setPatients(json.data?.patients ?? []);
      if ((json.data?.patients.length ?? 0) === 1) {
        setPatientId(json.data!.patients[0]!.id);
      }
    } catch {
      setError("Unable to reach the server");
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!patientId) {
      setError("Select a patient");
      return;
    }
    if (note.trim().length === 0) {
      setError("Note is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/nursing-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          encounterId: initialEncounterId || null,
          admissionId: initialAdmissionId || null,
          note: note.trim(),
          shift: shift || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not add nursing note");
        return;
      }
      router.refresh();
      setNote("");
      setShift("");
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Patient</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Input
              label="Search patient (name or ID)"
              name="patientQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type at least 2 characters"
              disabled={Boolean(initialPatientId)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={searchPatients}
            disabled={searching || Boolean(initialPatientId)}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {patients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {patients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPatientId(p.id);
                  setQuery(p.fullName);
                  setPatients([]);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  patientId === p.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {p.fullName} · {p.patientId}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Nursing note</h2>
        <div className="max-w-xs">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">Shift</span>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">Unspecified</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">Note</span>
          <textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </label>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Add nursing note"}
        </Button>
      </div>
    </form>
  );
}
