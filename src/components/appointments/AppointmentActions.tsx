"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toHospitalDateTimeLocal } from "@/lib/utils/date";
import type { AppointmentDto } from "@/lib/services/appointments";

export function AppointmentActions({
  appointment,
  canManage,
  canCheckIn,
  doctors,
}: {
  appointment: AppointmentDto;
  canManage: boolean;
  canCheckIn: boolean;
  doctors: Array<{ id: string; fullName: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(
    toHospitalDateTimeLocal(new Date(appointment.scheduledAt)),
  );
  const [doctorId, setDoctorId] = useState(appointment.doctorId);
  const [cancelReason, setCancelReason] = useState("");

  const isScheduled = appointment.status === "scheduled";

  async function checkIn() {
    setError(null);
    setLoading("checkin");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/check-in`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Check-in failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(null);
    }
  }

  async function cancel() {
    setError(null);
    setLoading("cancel");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: cancelReason || null }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Cancel failed");
        return;
      }
      setShowCancel(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(null);
    }
  }

  async function reschedule() {
    setError(null);
    setLoading("reschedule");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt,
          doctorId,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setError(json.error?.message ?? "Reschedule failed");
        return;
      }
      setShowReschedule(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(null);
    }
  }

  if (!canManage && !canCheckIn) return null;
  if (!isScheduled && appointment.status !== "checked_in") return null;

  return (
    <div className="space-y-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {canCheckIn && isScheduled ? (
          <Button
            type="button"
            disabled={loading !== null}
            onClick={() => void checkIn()}
          >
            {loading === "checkin" ? "Checking in…" : "Check in"}
          </Button>
        ) : null}
        {canManage && isScheduled ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={loading !== null}
              onClick={() => {
                setShowReschedule((v) => !v);
                setShowCancel(false);
              }}
            >
              Reschedule
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading !== null}
              onClick={() => {
                setShowCancel((v) => !v);
                setShowReschedule(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : null}
      </div>

      {showReschedule ? (
        <div className="space-y-3 border border-[var(--color-border)] p-3">
          <Input
            label="New date & time (Asia/Karachi)"
            name="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">
              Doctor
            </span>
            <select
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={loading !== null}
            onClick={() => void reschedule()}
          >
            {loading === "reschedule" ? "Saving…" : "Save new time"}
          </Button>
        </div>
      ) : null}

      {showCancel ? (
        <div className="space-y-3 border border-[var(--color-border)] p-3">
          <Input
            label="Cancel reason (optional)"
            name="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button
            type="button"
            variant="danger"
            disabled={loading !== null}
            onClick={() => void cancel()}
          >
            {loading === "cancel" ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
