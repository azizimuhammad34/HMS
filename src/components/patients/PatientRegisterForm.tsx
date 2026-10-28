"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DuplicateCandidate } from "@/lib/services/patients";
import { SEX_VALUES } from "@/lib/validations/patient";
import Link from "next/link";

export function PatientRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<(typeof SEX_VALUES)[number]>("unknown");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(confirmDuplicate: boolean) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          dateOfBirth: dateOfBirth || null,
          sex,
          phone: phone || null,
          address: address || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          confirmDuplicate,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { patient: { id: string } };
        error?: {
          code?: string;
          message?: string;
          details?: { duplicates?: DuplicateCandidate[] };
        };
      };

      if (!json.success) {
        if (
          json.error?.code === "POSSIBLE_DUPLICATE" &&
          json.error.details?.duplicates
        ) {
          setDuplicates(json.error.details.duplicates);
          setError(json.error.message ?? "Possible duplicate found");
          return;
        }
        setError(json.error?.message ?? "Registration failed");
        return;
      }

      if (json.data?.patient.id) {
        router.push(`/patients/${json.data.patient.id}`);
        router.refresh();
      }
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(false);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {duplicates.length > 0 ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            Possible existing patients
          </p>
          <ul className="space-y-2 text-sm text-amber-950">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/patients/${d.id}`}
                  className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  {d.patientId}
                </Link>
                <span>{d.fullName}</span>
                <span className="text-xs text-amber-800">
                  {d.phone ?? "No phone"} · {d.matchReason}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => {
                setDuplicates([]);
                setError(null);
              }}
            >
              Edit details
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void submit(true)}
            >
              {loading ? "Registering…" : "Register anyway"}
            </Button>
          </div>
        </div>
      ) : null}

      <Input
        label="Full name"
        name="fullName"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">Sex</span>
          <select
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={sex}
            onChange={(e) => setSex(e.target.value as (typeof SEX_VALUES)[number])}
          >
            <option value="unknown">Unknown / not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <Input
        label="Phone number"
        name="phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 0355xxxxxxx"
      />
      <Input
        label="Address"
        name="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Emergency contact name"
          name="emergencyContactName"
          value={emergencyContactName}
          onChange={(e) => setEmergencyContactName(e.target.value)}
        />
        <Input
          label="Emergency contact phone"
          name="emergencyContactPhone"
          type="tel"
          value={emergencyContactPhone}
          onChange={(e) => setEmergencyContactPhone(e.target.value)}
        />
      </div>

      {duplicates.length === 0 ? (
        <Button type="submit" disabled={loading}>
          {loading ? "Checking…" : "Register patient"}
        </Button>
      ) : null}
    </form>
  );
}
