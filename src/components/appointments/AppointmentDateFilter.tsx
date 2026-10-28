"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AppointmentDateFilter({
  initialDate,
  doctors,
  initialDoctorId,
  canFilterDoctor,
}: {
  initialDate: string;
  doctors: Array<{ id: string; fullName: string }>;
  initialDoctorId?: string;
  canFilterDoctor: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(initialDate);
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    if (canFilterDoctor) {
      if (doctorId) params.set("doctorId", doctorId);
      else params.delete("doctorId");
    }
    params.delete("page");
    router.push(`/appointments?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[11rem]">
        <Input
          label="Date"
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      {canFilterDoctor ? (
        <label className="block min-w-[14rem] space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">
            Doctor
          </span>
          <select
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button type="submit">Apply</Button>
    </form>
  );
}
