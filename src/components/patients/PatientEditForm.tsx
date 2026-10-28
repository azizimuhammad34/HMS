"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PatientDto } from "@/lib/services/patients";
import { SEX_VALUES } from "@/lib/validations/patient";

export function PatientEditForm({ patient }: { patient: PatientDto }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(patient.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth ?? "");
  const [sex, setSex] = useState<(typeof SEX_VALUES)[number]>(
    (patient.sex as (typeof SEX_VALUES)[number]) || "unknown",
  );
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    patient.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    patient.emergencyContactPhone ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          dateOfBirth: dateOfBirth || null,
          sex,
          phone: phone || null,
          address: address || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Update failed");
        return;
      }
      setSuccess(true);
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
      {success ? <Alert tone="success">Demographics updated.</Alert> : null}
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
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save demographics"}
      </Button>
    </form>
  );
}
