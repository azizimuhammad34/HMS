"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toHospitalDateTimeLocal } from "@/lib/utils/date";

type PatientOption = {
  id: string;
  patientId: string;
  fullName: string;
  phone: string | null;
};

type DoctorOption = {
  id: string;
  fullName: string;
};

export function AppointmentScheduleForm({
  doctors,
  initialPatientId,
}: {
  doctors: DoctorOption[];
  initialPatientId?: string;
}) {
  const router = useRouter();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null,
  );
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    toHospitalDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialPatientId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/patients/${initialPatientId}`);
        const json = (await res.json()) as {
          success: boolean;
          data?: {
            patient: {
              id: string;
              patientId: string;
              fullName: string;
              phone: string | null;
            };
          };
        };
        if (!cancelled && json.success && json.data?.patient) {
          setSelectedPatient(json.data.patient);
        }
      } catch {
        // ignore preload failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPatientId]);

  async function searchPatients() {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients?q=${encodeURIComponent(patientQuery.trim())}&pageSize=10`,
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: { patients: PatientOption[] };
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Patient search failed");
        return;
      }
      setPatientResults(json.data?.patients ?? []);
    } catch {
      setError("Unable to search patients");
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedPatient) {
      setError("Select a patient before scheduling");
      return;
    }
    if (!doctorId) {
      setError("Select a doctor");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId,
          scheduledAt,
          durationMinutes: Number(durationMinutes) || 15,
          reason: reason || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not schedule appointment");
        return;
      }
      router.push("/appointments");
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text)]">Patient</p>
        {selectedPatient ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{selectedPatient.fullName}</span>
            <span className="text-[var(--color-text-muted)]">
              {selectedPatient.patientId}
              {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedPatient(null);
                setPatientResults([]);
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Search patient"
                  name="patientQuery"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Name, phone, or patient ID"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={searching || !patientQuery.trim()}
                onClick={() => void searchPatients()}
              >
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            {patientResults.length > 0 ? (
              <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                {patientResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientResults([]);
                      }}
                    >
                      <span className="font-medium">{p.fullName}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {p.patientId}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Doctor
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
        >
          {doctors.length === 0 ? (
            <option value="">No active doctors</option>
          ) : null}
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date & time (Asia/Karachi)"
          name="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
        <Input
          label="Duration (minutes)"
          name="durationMinutes"
          type="number"
          min={5}
          max={240}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </div>

      <Input
        label="Reason (optional)"
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
      />

      <Button type="submit" disabled={loading || doctors.length === 0}>
        {loading ? "Scheduling…" : "Schedule appointment"}
      </Button>
    </form>
  );
}
