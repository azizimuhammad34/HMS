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

export function VitalsForm({
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
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [painScore, setPainScore] = useState("");
  const [notes, setNotes] = useState("");
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

    const payload: Record<string, unknown> = {
      patientId,
      encounterId: initialEncounterId || null,
      admissionId: initialAdmissionId || null,
    };

    if (temperature !== "") payload.temperature = Number(temperature);
    if (pulse !== "") payload.pulse = Number(pulse);
    if (respiratoryRate !== "") payload.respiratoryRate = Number(respiratoryRate);
    if (systolic !== "") payload.bloodPressureSystolic = Number(systolic);
    if (diastolic !== "") payload.bloodPressureDiastolic = Number(diastolic);
    if (oxygenSaturation !== "") payload.oxygenSaturation = Number(oxygenSaturation);
    if (height !== "") payload.height = Number(height);
    if (weight !== "") payload.weight = Number(weight);
    if (painScore !== "") payload.painScore = Number(painScore);
    if (notes.trim() !== "") payload.notes = notes.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not record vitals");
        return;
      }
      router.refresh();
      setTemperature("");
      setPulse("");
      setRespiratoryRate("");
      setSystolic("");
      setDiastolic("");
      setOxygenSaturation("");
      setHeight("");
      setWeight("");
      setPainScore("");
      setNotes("");
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
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Measurements</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Temperature (°C)" name="temperature" value={temperature} onChange={(e) => setTemperature(e.target.value)} inputMode="decimal" />
          <Input label="Pulse (bpm)" name="pulse" value={pulse} onChange={(e) => setPulse(e.target.value)} inputMode="numeric" />
          <Input label="Respiratory rate (breaths/min)" name="respiratoryRate" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} inputMode="numeric" />
          <Input label="BP systolic (mmHg)" name="systolic" value={systolic} onChange={(e) => setSystolic(e.target.value)} inputMode="numeric" />
          <Input label="BP diastolic (mmHg)" name="diastolic" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} inputMode="numeric" />
          <Input label="SpO₂ (%)" name="oxygenSaturation" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} inputMode="numeric" />
          <Input label="Height (cm)" name="height" value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" />
          <Input label="Weight (kg)" name="weight" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
          <Input label="Pain score (0-10)" name="painScore" value={painScore} onChange={(e) => setPainScore(e.target.value)} inputMode="numeric" />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">Notes</span>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </label>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Recording…" : "Record vitals"}
        </Button>
      </div>
    </form>
  );
}
