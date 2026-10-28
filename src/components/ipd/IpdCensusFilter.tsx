"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function IpdCensusFilter({
  wards,
  initialWard,
  initialStatus,
}: {
  wards: string[];
  initialWard?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ward, setWard] = useState(initialWard ?? "");
  const [status, setStatus] = useState(initialStatus ?? "admitted");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (ward) params.set("ward", ward);
    else params.delete("ward");
    if (status && status !== "admitted") params.set("status", status);
    else params.delete("status");
    params.delete("page");
    router.push(`/ipd?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="block min-w-[12rem] space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Ward
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
        >
          <option value="">All wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[12rem] space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Status
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="admitted">Currently admitted</option>
          <option value="discharged">Discharged</option>
          <option value="all">All</option>
        </select>
      </label>
      <Button type="submit">Apply</Button>
    </form>
  );
}
