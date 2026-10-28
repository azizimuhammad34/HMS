"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function BedCreateForm() {
  const router = useRouter();
  const [ward, setWard] = useState("");
  const [room, setRoom] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"available" | "maintenance">(
    "available",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward,
          room,
          bedNumber,
          code: code || null,
          notes: notes || null,
          status,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not create bed");
        return;
      }
      setWard("");
      setRoom("");
      setBedNumber("");
      setCode("");
      setNotes("");
      setStatus("available");
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Ward"
          name="ward"
          required
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          placeholder="e.g. General"
        />
        <Input
          label="Room"
          name="room"
          required
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="e.g. 101"
        />
        <Input
          label="Bed number"
          name="bedNumber"
          required
          value={bedNumber}
          onChange={(e) => setBedNumber(e.target.value)}
          placeholder="e.g. A"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Code (optional)"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Auto-generated if blank"
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">
            Status
          </span>
          <select
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "available" | "maintenance")
            }
          >
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>
      </div>
      <Input
        label="Notes (optional)"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Add bed"}
      </Button>
    </form>
  );
}
