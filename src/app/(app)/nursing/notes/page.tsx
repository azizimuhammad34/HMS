import Link from "next/link";
import { redirect } from "next/navigation";
import { NursingNoteForm } from "@/components/nursing/NursingNoteForm";
import { Button } from "@/components/ui/Button";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listNursingNotes } from "@/lib/services/nursing";
import { roleHasPermission } from "@/types/permissions";

function formatNoteDateTime(iso: string): string {
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

export default async function NursingNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; admissionId?: string; encounterId?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "clinical:nursing_notes")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const canAdd = roleHasPermission(session.user.role, "clinical:nursing_notes");
  const { notes } = await listNursingNotes({
    patientId: params.patientId,
    admissionId: params.admissionId,
    encounterId: params.encounterId,
    pageSize: 30,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Nursing notes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Add and review nursing progress notes.
          </p>
        </div>
        <Link href="/patients">
          <Button type="button" variant="secondary">
            Find patient
          </Button>
        </Link>
      </div>

      {canAdd ? (
        <section className="space-y-4 border-t border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Add nursing note</h2>
          <NursingNoteForm
            initialPatientId={params.patientId}
            initialEncounterId={params.encounterId}
            initialAdmissionId={params.admissionId}
          />
        </section>
      ) : null}

      <section className="space-y-4 border-t border-[var(--color-border)] pt-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No nursing notes yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {notes.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {n.patientName} · {n.patientDisplayId}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatNoteDateTime(n.createdAt)} · {n.authorName}
                      {n.shift ? ` · ${n.shift} shift` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text)] whitespace-pre-wrap">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

