"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function PatientSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/patients?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Input
          label="Search patients"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, phone, or patient ID"
        />
      </div>
      <Button type="submit" className="sm:mb-0.5">
        Search
      </Button>
    </form>
  );
}
