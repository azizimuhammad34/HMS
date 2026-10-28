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
  phone: string | null;
};

type BedOption = {
  id: string;
  code: string;
  ward: string;
  room: string;
  bedNumber: string;
};

type DoctorOption = {
  id: string;
  fullName: string;
};

export function AdmitForm({
  doctors,
  availableBeds,
  initialPatientId,
}: {
  doctors: DoctorOption[];
  availableBeds: BedOption[];
  initialPatientId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [beds, setBeds] = useState<BedOption[]>(availableBeds);
  const [bedId, setBedId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setBeds(availableBeds);
  }, [availableBeds]);

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
    if (!patientId || !bedId) {
      setError("Select a patient and an available bed");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          bedId,
          admittingDoctorId: doctorId || null,
          reason: reason || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { admission: { id: string } };
        error?: { message?: string };
      };
      if (!json.success || !json.data?.admission) {
        setError(json.error?.message ?? "Admission failed");
        return;
      }
      router.push(`/ipd/${json.data.admission.id}`);
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Search patient"
              name="patientQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone, or patient ID"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={searching}
            onClick={() => void searchPatients()}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {patients.length > 0 ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">
              Patient
            </span>
            <select
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientId})
                  {p.phone ? ` · ${p.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Bed
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={bedId}
          onChange={(e) => setBedId(e.target.value)}
          required
        >
          <option value="">Select available bed</option>
          {beds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} · {b.ward} / Room {b.room} / Bed {b.bedNumber}
            </option>
          ))}
        </select>
        {beds.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            No available beds. Add or free a bed first.
          </p>
        ) : null}
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Admitting doctor (optional)
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="">Unassigned</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="Reason for admission (optional)"
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <Button type="submit" disabled={loading || beds.length === 0}>
        {loading ? "Admitting…" : "Admit patient"}
      </Button>
    </form>
  );
}
