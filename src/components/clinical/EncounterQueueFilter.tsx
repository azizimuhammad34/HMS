"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function EncounterQueueFilter({
  initialDate,
  initialStatus,
}: {
  initialDate: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(initialDate);
  const [status, setStatus] = useState(initialStatus ?? "active");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    if (status && status !== "active") params.set("status", status);
    else params.delete("status");
    params.delete("page");
    router.push(`/clinical?${params.toString()}`);
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
      <label className="block min-w-[12rem] space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Status
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active (queue)</option>
          <option value="checked_in">Checked in</option>
          <option value="in_consultation">In consultation</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <Button type="submit">Apply</Button>
    </form>
  );
}
