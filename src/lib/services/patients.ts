import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient, type PatientDocument } from "@/lib/db/models/Patient";
import { writeAudit } from "@/lib/services/audit";
import {
  allocatePatientId,
  isMongoDuplicateKeyError,
} from "@/lib/services/patient-id";
import type {
  RegisterPatientInput,
  UpdatePatientInput,
} from "@/lib/validations/patient";

export type PatientDto = {
  id: string;
  patientId: string;
  fullName: string;
  dateOfBirth: string | null;
  sex: string;
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean;
  registeredAt: string;
  updatedAt: string;
};

export type DuplicateCandidate = {
  id: string;
  patientId: string;
  fullName: string;
  phone: string | null;
  registeredAt: string;
  matchReason: string;
};

export type PatientVisitSummary = {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function toDto(doc: {
  _id: unknown;
  patientId: string;
  fullName: string;
  dateOfBirth?: Date | null;
  sex: string;
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PatientDto {
  return {
    id: String(doc._id),
    patientId: doc.patientId,
    fullName: doc.fullName,
    dateOfBirth: doc.dateOfBirth
      ? new Date(doc.dateOfBirth).toISOString().slice(0, 10)
      : null,
    sex: doc.sex,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    emergencyContactName: doc.emergencyContactName ?? null,
    emergencyContactPhone: doc.emergencyContactPhone ?? null,
    isActive: Boolean(doc.isActive),
    registeredAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

export async function findDuplicateCandidates(input: {
  fullName: string;
  phone?: string | null;
}): Promise<DuplicateCandidate[]> {
  await connectDb();
  const phone = normalizePhone(input.phone);
  const name = normalizeName(input.fullName);
  const candidates: DuplicateCandidate[] = [];

  if (phone) {
    const byPhone = await Patient.find({
      isActive: true,
      $or: [
        { phone },
        { phone: { $regex: `${escapeRegex(phone)}$` } },
      ],
    })
      .limit(10)
      .lean();

    for (const p of byPhone) {
      const existingPhone = normalizePhone(p.phone);
      if (existingPhone !== phone) continue;
      candidates.push({
        id: String(p._id),
        patientId: p.patientId,
        fullName: p.fullName,
        phone: p.phone ?? null,
        registeredAt: new Date(p.createdAt).toISOString(),
        matchReason: "Matching phone number",
      });
    }
  }

  const byName = await Patient.find({
    isActive: true,
    fullName: new RegExp(`^${escapeRegex(input.fullName.trim())}$`, "i"),
  })
    .limit(10)
    .lean();

  for (const p of byName) {
    if (candidates.some((c) => c.id === String(p._id))) continue;
    if (normalizeName(p.fullName) !== name) continue;
    candidates.push({
      id: String(p._id),
      patientId: p.patientId,
      fullName: p.fullName,
      phone: p.phone ?? null,
      registeredAt: new Date(p.createdAt).toISOString(),
      matchReason: "Matching full name",
    });
  }

  return candidates.slice(0, 10);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function registerPatient(params: {
  input: RegisterPatientInput;
  registeredBy: string;
  ipAddress?: string | null;
}): Promise<
  | { ok: true; patient: PatientDto }
  | { ok: false; code: "POSSIBLE_DUPLICATE"; duplicates: DuplicateCandidate[] }
> {
  await connectDb();

  const duplicates = await findDuplicateCandidates({
    fullName: params.input.fullName,
    phone: params.input.phone,
  });

  if (duplicates.length > 0 && !params.input.confirmDuplicate) {
    return { ok: false, code: "POSSIBLE_DUPLICATE", duplicates };
  }

  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const patientId = await allocatePatientId();
      const created = await Patient.create({
        patientId,
        fullName: params.input.fullName.trim(),
        dateOfBirth: params.input.dateOfBirth ?? null,
        sex: params.input.sex,
        phone: normalizePhone(params.input.phone) ?? params.input.phone,
        address: params.input.address,
        emergencyContactName: params.input.emergencyContactName,
        emergencyContactPhone:
          normalizePhone(params.input.emergencyContactPhone) ??
          params.input.emergencyContactPhone,
        registeredBy: params.registeredBy,
        isActive: true,
      });

      await writeAudit({
        actorId: params.registeredBy,
        action: "patients.registered",
        resourceType: "Patient",
        resourceId: String(created._id),
        ipAddress: params.ipAddress,
        metadata: {
          patientId: created.patientId,
          confirmedDuplicate: Boolean(params.input.confirmDuplicate),
        },
      });

      return { ok: true, patient: toDto(created) };
    } catch (error) {
      lastError = error;
      if (!isMongoDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to register patient");
}

export async function searchPatients(params: {
  q: string;
  page: number;
  pageSize: number;
}): Promise<{ patients: PatientDto[]; total: number; page: number; pageSize: number }> {
  await connectDb();
  const filter: Record<string, unknown> = { isActive: true };
  const q = params.q.trim();

  if (q) {
    const phoneDigits = normalizePhone(q);
    filter.$or = [
      { patientId: new RegExp(escapeRegex(q), "i") },
      { fullName: new RegExp(escapeRegex(q), "i") },
      ...(phoneDigits ? [{ phone: new RegExp(phoneDigits) }] : []),
    ];
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.pageSize)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return {
    patients: rows.map((r) => toDto(r as PatientDocument & { createdAt: Date; updatedAt: Date })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getPatientById(
  id: string,
): Promise<PatientDto | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const doc = await Patient.findById(id).lean();
  if (!doc) return null;
  return toDto(doc as PatientDocument & { createdAt: Date; updatedAt: Date });
}

export async function getPatientVisits(
  patientObjectId: string,
  limit = 20,
): Promise<PatientVisitSummary[]> {
  if (!isValidObjectId(patientObjectId)) return [];
  await connectDb();
  const visits = await Encounter.find({ patientId: patientObjectId })
    .sort({ startedAt: -1 })
    .limit(limit)
    .select("type status startedAt completedAt")
    .lean();

  return visits.map((v) => ({
    id: String(v._id),
    type: v.type,
    status: v.status,
    startedAt: new Date(v.startedAt).toISOString(),
    completedAt: v.completedAt ? new Date(v.completedAt).toISOString() : null,
  }));
}

export async function updatePatientDemographics(params: {
  id: string;
  input: UpdatePatientInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<PatientDto | null> {
  if (!isValidObjectId(params.id)) return null;
  await connectDb();

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params.input)) {
    if (value !== undefined) {
      if (key === "phone" || key === "emergencyContactPhone") {
        updates[key] =
          typeof value === "string" ? normalizePhone(value) ?? value : value;
      } else {
        updates[key] = value;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return getPatientById(params.id);
  }

  const updated = await Patient.findByIdAndUpdate(
    params.id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!updated) return null;

  await writeAudit({
    actorId: params.actorId,
    action: "patients.demographics_updated",
    resourceType: "Patient",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: { fields: Object.keys(updates) },
  });

  return toDto(updated as PatientDocument & { createdAt: Date; updatedAt: Date });
}
