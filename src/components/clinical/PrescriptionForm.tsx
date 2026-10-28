"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Item = {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const emptyItem = (): Item => ({
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export function PrescriptionForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/encounters/${encounterId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || null,
          items: items
            .filter((i) => i.medication.trim())
            .map((i) => ({
              medication: i.medication,
              dosage: i.dosage || null,
              frequency: i.frequency || null,
              duration: i.duration || null,
              instructions: i.instructions || null,
            })),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Could not save prescription");
        return;
      }
      setItems([emptyItem()]);
      setNotes("");
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
      {items.map((item, index) => (
        <div
          key={index}
          className="space-y-3 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0"
        >
          <Input
            label={`Medication ${items.length > 1 ? index + 1 : ""}`.trim()}
            name={`medication-${index}`}
            required
            value={item.medication}
            onChange={(e) => updateItem(index, { medication: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Dosage"
              name={`dosage-${index}`}
              value={item.dosage}
              onChange={(e) => updateItem(index, { dosage: e.target.value })}
              placeholder="e.g. 500mg"
            />
            <Input
              label="Frequency"
              name={`frequency-${index}`}
              value={item.frequency}
              onChange={(e) => updateItem(index, { frequency: e.target.value })}
              placeholder="e.g. TDS"
            />
            <Input
              label="Duration"
              name={`duration-${index}`}
              value={item.duration}
              onChange={(e) => updateItem(index, { duration: e.target.value })}
              placeholder="e.g. 5 days"
            />
          </div>
          <Input
            label="Instructions"
            name={`instructions-${index}`}
            value={item.instructions}
            onChange={(e) =>
              updateItem(index, { instructions: e.target.value })
            }
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
        >
          Add medication
        </Button>
        {items.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setItems((prev) => prev.slice(0, -1))}
          >
            Remove last
          </Button>
        ) : null}
      </div>
      <Input
        label="Prescription notes (optional)"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save prescription"}
      </Button>
    </form>
  );
}
