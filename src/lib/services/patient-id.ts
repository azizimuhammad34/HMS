import { connectDb } from "@/lib/db/connection";
import { Counter } from "@/lib/db/models/Counter";
import { HospitalSettings } from "@/lib/db/models/HospitalSettings";
import { Patient } from "@/lib/db/models/Patient";

const COUNTER_NAME = "patientId";
const MAX_RETRIES = 5;

async function getPrefix(): Promise<string> {
  const settings = await HospitalSettings.findOne({ key: "default" })
    .select("patientIdPrefix")
    .lean();
  const prefix = settings?.patientIdPrefix?.trim().toUpperCase() || "HOSP";
  return prefix.replace(/[^A-Z0-9]/g, "").slice(0, 10) || "HOSP";
}

function formatPatientId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, "0")}`;
}

/**
 * Atomically allocates the next patient ID using a counter document.
 * Does not derive IDs from patient document counts.
 * Retries if a rare unique-index collision occurs.
 */
export async function allocatePatientId(): Promise<string> {
  await connectDb();
  const prefix = await getPrefix();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: COUNTER_NAME },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );

    if (!counter) {
      throw new Error("Failed to allocate patient ID counter");
    }

    const patientId = formatPatientId(prefix, counter.seq);
    const exists = await Patient.exists({ patientId });
    if (!exists) {
      return patientId;
    }
  }

  throw new Error("Unable to allocate a unique patient ID after retries");
}

export function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}
