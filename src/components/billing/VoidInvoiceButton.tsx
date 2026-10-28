"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVoid() {
    setError(null);
    const confirmed = window.confirm(
      "Void this unpaid invoice? This cannot be undone.",
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Void failed");
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
        onClick={() => void onVoid()}
      >
        {loading ? "Voiding…" : "Void invoice"}
      </Button>
    </div>
  );
}
