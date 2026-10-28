"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const STATUS_OPTIONS = [
  { value: "open", label: "Open (unpaid)" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
  { value: "all", label: "All" },
] as const;

export function InvoiceListFilter({
  initialStatus,
  initialQ,
}: {
  initialStatus?: string;
  initialQ?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus ?? "open");
  const [q, setQ] = useState(initialQ ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "open") params.set("status", status);
    else if (status === "open") params.set("status", "open");
    else params.delete("status");

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/billing?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <label className="block space-y-1.5 sm:w-48">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Status
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex-1">
        <Input
          label="Search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Invoice # or patient"
        />
      </div>
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
