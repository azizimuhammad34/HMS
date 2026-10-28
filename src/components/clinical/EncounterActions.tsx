"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function EncounterActions({
  encounterId,
  status,
}: {
  encounterId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const canStart = status === "checked_in";
  const canComplete =
    status === "checked_in" || status === "in_consultation";

  async function run(action: "start" | "complete") {
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/encounters/${encounterId}/${action}`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Action failed");
        return;
      }
      router.refresh();
      if (action === "complete") {
        router.push("/clinical");
      }
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(null);
    }
  }

  if (!canStart && !canComplete) return null;

  return (
    <div className="space-y-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <Button
            type="button"
            variant="secondary"
            disabled={loading !== null}
            onClick={() => void run("start")}
          >
            {loading === "start" ? "Starting…" : "Start consultation"}
          </Button>
        ) : null}
        {canComplete ? (
          <Button
            type="button"
            disabled={loading !== null}
            onClick={() => void run("complete")}
          >
            {loading === "complete" ? "Completing…" : "Complete visit"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
