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

export function InvoiceCreateForm({
  initialPatientId,
  initialEncounterId,
}: {
  initialPatientId?: string;
  initialEncounterId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [totalAmount, setTotalAmount] = useState("");
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
    const amount = Number(totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid invoice amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          encounterId: initialEncounterId || null,
          totalAmount: amount,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { invoice: { id: string } };
        error?: { message?: string };
      };
      if (!json.success || !json.data?.invoice) {
        setError(json.error?.message ?? "Could not create invoice");
        return;
      }
      router.push(`/billing/${json.data.invoice.id}`);
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

      <Input
        label="Total amount (PKR)"
        name="totalAmount"
        type="number"
        min="1"
        step="0.01"
        value={totalAmount}
        onChange={(e) => setTotalAmount(e.target.value)}
        required
      />

      {initialEncounterId ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Linked to encounter {initialEncounterId}
        </p>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}
