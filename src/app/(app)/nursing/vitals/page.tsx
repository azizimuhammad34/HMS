import Link from "next/link";
import { redirect } from "next/navigation";
import { VitalsForm } from "@/components/nursing/VitalsForm";
import { Button } from "@/components/ui/Button";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listVitalSigns } from "@/lib/services/nursing";
import { roleHasPermission } from "@/types/permissions";

function formatVitalsDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; admissionId?: string; encounterId?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "clinical:vitals")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const canRecord = roleHasPermission(session.user.role, "clinical:vitals");
  const { vitals } = await listVitalSigns({
    patientId: params.patientId,
    admissionId: params.admissionId,
    encounterId: params.encounterId,
    pageSize: 30,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Vital signs</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Record and review patient vitals.
          </p>
        </div>
        <Link href="/patients">
          <Button type="button" variant="secondary">
            Find patient
          </Button>
        </Link>
      </div>

      {canRecord ? (
        <section className="space-y-4 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Record vitals</h2>
          <VitalsForm
            initialPatientId={params.patientId}
            initialEncounterId={params.encounterId}
            initialAdmissionId={params.admissionId}
          />
        </section>
      ) : null}

      <section className="space-y-4 border-t border-[var(--color-border)] pt-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent vitals</h2>
        {vitals.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No vitals recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {vitals.map((v) => (
              <li key={v.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {v.patientName} · {v.patientDisplayId}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatVitalsDateTime(v.recordedAt)} · Recorded by {v.recordedByName}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-text)]">
                  {v.temperature != null ? <span>T {v.temperature} °C</span> : null}
                  {v.pulse != null ? <span>HR {v.pulse} bpm</span> : null}
                  {v.respiratoryRate != null ? <span>RR {v.respiratoryRate}/min</span> : null}
                  {v.bloodPressureSystolic != null && v.bloodPressureDiastolic != null ? (
                    <span>BP {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg</span>
                  ) : null}
                  {v.oxygenSaturation != null ? <span>SpO₂ {v.oxygenSaturation}%</span> : null}
                  {v.weight != null ? <span>Wt {v.weight} kg</span> : null}
                  {v.height != null ? <span>Ht {v.height} cm</span> : null}
                  {v.bmi != null ? <span>BMI {v.bmi}</span> : null}
                  {v.painScore != null ? <span>Pain {v.painScore}/10</span> : null}
                </div>
                {v.notes ? (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">{v.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

