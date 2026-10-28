"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function BedStatusActions({
  bedId,
  status,
}: {
  bedId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "occupied") return null;

  const nextStatus = status === "available" ? "maintenance" : "available";
  const label =
    nextStatus === "maintenance" ? "Mark maintenance" : "Mark available";

  async function updateStatus() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/beds/${bedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Update failed");
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
        onClick={() => void updateStatus()}
      >
        {loading ? "Updating…" : label}
      </Button>
    </div>
  );
}
