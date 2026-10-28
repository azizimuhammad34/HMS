"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PAYMENT_METHODS } from "@/lib/validations/billing";
import { formatMoney } from "@/lib/utils/billing-display";

const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function RecordPaymentForm({
  invoiceId,
  outstanding,
  currency = "PKR",
}: {
  invoiceId: string;
  outstanding: number;
  currency?: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    outstanding > 0 ? String(outstanding) : "",
  );
  const [method, setMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: value,
          method,
          notes: notes || null,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Payment failed");
        return;
      }
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
      <p className="text-sm text-[var(--color-text-muted)]">
        Outstanding balance: {formatMoney(outstanding, currency)}
      </p>
      <Input
        label="Amount (PKR)"
        name="amount"
        type="number"
        min="0.01"
        step="0.01"
        max={outstanding}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          Method
        </span>
        <select
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          value={method}
          onChange={(e) =>
            setMethod(e.target.value as (typeof PAYMENT_METHODS)[number])
          }
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Notes (optional)"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button type="submit" disabled={loading || outstanding <= 0}>
        {loading ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
