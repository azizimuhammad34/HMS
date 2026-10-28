import { connectDb } from "@/lib/db/connection";
import { AuditLog } from "@/lib/db/models/AuditLog";

type WriteAuditInput = {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  success?: boolean;
};

/**
 * Writes an audit event. Never include passwords, tokens, or full clinical notes.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  await connectDb();
  await AuditLog.create({
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    ipAddress: input.ipAddress ?? null,
    metadata: input.metadata ?? {},
    success: input.success ?? true,
  });
}
