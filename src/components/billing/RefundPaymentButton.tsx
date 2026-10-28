"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function RefundPaymentButton({
  paymentId,
  amount,
  currency = "PKR",
}: {
  paymentId: string;
  amount: number;
  currency?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRefund() {
    setError(null);
    const confirmed = window.confirm(
      `Refund ${currency} ${amount.toLocaleString("en-PK")} for this payment?`,
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Refund failed");
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
    <div className="space-y-1">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={() => void onRefund()}
      >
        {loading ? "Refunding…" : "Refund"}
      </Button>
    </div>
  );
}
