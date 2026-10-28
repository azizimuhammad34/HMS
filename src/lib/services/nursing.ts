import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Admission } from "@/lib/db/models/Admission";
import { Encounter } from "@/lib/db/models/Encounter";
import { NursingNote } from "@/lib/db/models/NursingNote";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import { VitalSign } from "@/lib/db/models/VitalSign";
import { writeAudit } from "@/lib/services/audit";
import type { NursingNoteInput, VitalSignInput } from "@/lib/validations/nursing";

export class NursingServiceError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "NursingServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type VitalSignDto = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  encounterId: string | null;
  admissionId: string | null;
  recordedById: string;
  recordedByName: string;
  recordedAt: string;
  temperature: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  oxygenSaturation: number | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  painScore: number | null;
  notes: string | null;
  createdAt: string;
};

export type NursingNoteDto = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  encounterId: string | null;
  admissionId: string | null;
  authorId: string;
  authorName: string;
  note: string;
  shift: string | null;
  createdAt: string;
  updatedAt: string;
};

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

function calculateBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (heightCm == null || weightKg == null) return null;
  if (heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

export async function recordVitalSigns(params: {
  input: VitalSignInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<VitalSignDto> {
  if (!isValidObjectId(params.input.patientId)) {
    throw new NursingServiceError("INVALID_PATIENT", "Invalid patient", 400);
  }
  if (!isValidObjectId(params.actorId)) {
    throw new NursingServiceError("UNAUTHORIZED", "Invalid actor", 401);
  }

  await connectDb();

  const [patient, actor] = await Promise.all([
    Patient.findById(params.input.patientId).select("patientId fullName").lean(),
    User.findById(params.actorId).select("fullName").lean(),
  ]);
  if (!patient) {
    throw new NursingServiceError("NOT_FOUND", "Patient not found", 404);
  }
  if (!actor) {
    throw new NursingServiceError("UNAUTHORIZED", "Actor not found", 401);
  }

  if (params.input.encounterId && !isValidObjectId(params.input.encounterId)) {
    throw new NursingServiceError("INVALID_ENCOUNTER", "Invalid encounter", 400);
  }
  if (params.input.admissionId && !isValidObjectId(params.input.admissionId)) {
    throw new NursingServiceError("INVALID_ADMISSION", "Invalid admission", 400);
  }

  if (params.input.encounterId) {
    const exists = await Encounter.exists({ _id: new Types.ObjectId(params.input.encounterId) } as any);
    if (!exists) {
      throw new NursingServiceError("NOT_FOUND", "Encounter not found", 404);
    }
  }
  if (params.input.admissionId) {
    const exists = await Admission.exists({ _id: new Types.ObjectId(params.input.admissionId) } as any);
    if (!exists) {
      throw new NursingServiceError("NOT_FOUND", "Admission not found", 404);
    }
  }

  const bmi = calculateBmi(params.input.height ?? null, params.input.weight ?? null);

  const vital = await VitalSign.create({
    patientId: params.input.patientId,
    encounterId: params.input.encounterId || null,
    admissionId: params.input.admissionId || null,
    recordedBy: params.actorId,
    recordedAt: new Date(),
    temperature: params.input.temperature ?? null,
    pulse: params.input.pulse ?? null,
    respiratoryRate: params.input.respiratoryRate ?? null,
    bloodPressureSystolic: params.input.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: params.input.bloodPressureDiastolic ?? null,
    oxygenSaturation: params.input.oxygenSaturation ?? null,
    height: params.input.height ?? null,
    weight: params.input.weight ?? null,
    bmi,
    painScore: params.input.painScore ?? null,
    notes: params.input.notes ?? null,
  });

  await writeAudit({
    actorId: params.actorId,
    action: "nursing.vitals_recorded",
    resourceType: "VitalSign",
    resourceId: String(vital._id),
    ipAddress: params.ipAddress,
    metadata: { patientId: params.input.patientId },
  });

  const doc = vital.toObject() as any;
  return {
    id: String(doc._id),
    patientId: String(doc.patientId),
    patientDisplayId: (patient as any).patientId,
    patientName: (patient as any).fullName,
    encounterId: doc.encounterId ? String(doc.encounterId) : null,
    admissionId: doc.admissionId ? String(doc.admissionId) : null,
    recordedById: String(doc.recordedBy),
    recordedByName: (actor as any).fullName,
    recordedAt: new Date(doc.recordedAt).toISOString(),
    temperature: doc.temperature ?? null,
    pulse: doc.pulse ?? null,
    respiratoryRate: doc.respiratoryRate ?? null,
    bloodPressureSystolic: doc.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: doc.bloodPressureDiastolic ?? null,
    oxygenSaturation: doc.oxygenSaturation ?? null,
    height: doc.height ?? null,
    weight: doc.weight ?? null,
    bmi: doc.bmi ?? null,
    painScore: doc.painScore ?? null,
    notes: doc.notes ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export async function addNursingNote(params: {
  input: NursingNoteInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<NursingNoteDto> {
  if (!isValidObjectId(params.input.patientId)) {
    throw new NursingServiceError("INVALID_PATIENT", "Invalid patient", 400);
  }
  if (!isValidObjectId(params.actorId)) {
    throw new NursingServiceError("UNAUTHORIZED", "Invalid actor", 401);
  }

  await connectDb();

  const [patient, actor] = await Promise.all([
    Patient.findById(params.input.patientId).select("patientId fullName").lean(),
    User.findById(params.actorId).select("fullName").lean(),
  ]);
  if (!patient) {
    throw new NursingServiceError("NOT_FOUND", "Patient not found", 404);
  }
  if (!actor) {
    throw new NursingServiceError("UNAUTHORIZED", "Actor not found", 401);
  }

  if (params.input.encounterId && !isValidObjectId(params.input.encounterId)) {
    throw new NursingServiceError("INVALID_ENCOUNTER", "Invalid encounter", 400);
  }
  if (params.input.admissionId && !isValidObjectId(params.input.admissionId)) {
    throw new NursingServiceError("INVALID_ADMISSION", "Invalid admission", 400);
  }

  if (params.input.encounterId) {
    const exists = await Encounter.exists({ _id: new Types.ObjectId(params.input.encounterId) } as any);
    if (!exists) {
      throw new NursingServiceError("NOT_FOUND", "Encounter not found", 404);
    }
  }
  if (params.input.admissionId) {
    const exists = await Admission.exists({ _id: new Types.ObjectId(params.input.admissionId) } as any);
    if (!exists) {
      throw new NursingServiceError("NOT_FOUND", "Admission not found", 404);
    }
  }

  const nursingNote = await NursingNote.create({
    patientId: params.input.patientId,
    encounterId: params.input.encounterId || null,
    admissionId: params.input.admissionId || null,
    authorId: params.actorId,
    note: params.input.note,
    shift: params.input.shift ?? null,
  });

  await writeAudit({
    actorId: params.actorId,
    action: "nursing.note_added",
    resourceType: "NursingNote",
    resourceId: String(nursingNote._id),
    ipAddress: params.ipAddress,
    metadata: { patientId: params.input.patientId },
  });

  const doc = nursingNote.toObject() as any;
  return {
    id: String(doc._id),
    patientId: String(doc.patientId),
    patientDisplayId: (patient as any).patientId,
    patientName: (patient as any).fullName,
    encounterId: doc.encounterId ? String(doc.encounterId) : null,
    admissionId: doc.admissionId ? String(doc.admissionId) : null,
    authorId: String(doc.authorId),
    authorName: (actor as any).fullName,
    note: doc.note,
    shift: doc.shift ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function listVitalSigns(params: {
  patientId?: string;
  admissionId?: string;
  encounterId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ vitals: VitalSignDto[]; total: number; page: number; pageSize: number }> {
  await connectDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const filter: Record<string, unknown> = {};
  if (params.patientId && isValidObjectId(params.patientId)) {
    filter.patientId = params.patientId;
  }
  if (params.admissionId && isValidObjectId(params.admissionId)) {
    filter.admissionId = params.admissionId;
  }
  if (params.encounterId && isValidObjectId(params.encounterId)) {
    filter.encounterId = params.encounterId;
  }

  const [rows, total] = await Promise.all([
    VitalSign.find(filter)
      .sort({ recordedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    VitalSign.countDocuments(filter),
  ]);

  const patientIds = [...new Set(rows.map((r: any) => String(r.patientId)))];
  const userIds = [...new Set(rows.map((r: any) => String(r.recordedBy)))];
  const [patients, users] = await Promise.all([
    Patient.find({ _id: { $in: patientIds.map((id) => new Types.ObjectId(id)) } as any })
      .select("patientId fullName")
      .lean(),
    User.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } as any })
      .select("fullName")
      .lean(),
  ]);
  const patientMap = new Map((patients as any[]).map((p) => [String(p._id), p]));
  const userMap = new Map((users as any[]).map((u) => [String(u._id), u]));

  const vitals = rows.map((row: any) => {
    const patient = patientMap.get(String(row.patientId));
    const user = userMap.get(String(row.recordedBy));
    return {
      id: String(row._id),
      patientId: String(row.patientId),
      patientDisplayId: patient?.patientId ?? "—",
      patientName: patient?.fullName ?? "Unknown patient",
      encounterId: row.encounterId ? String(row.encounterId) : null,
      admissionId: row.admissionId ? String(row.admissionId) : null,
      recordedById: String(row.recordedBy),
      recordedByName: user?.fullName ?? "—",
      recordedAt: new Date(row.recordedAt).toISOString(),
      temperature: row.temperature ?? null,
      pulse: row.pulse ?? null,
      respiratoryRate: row.respiratoryRate ?? null,
      bloodPressureSystolic: row.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: row.bloodPressureDiastolic ?? null,
      oxygenSaturation: row.oxygenSaturation ?? null,
      height: row.height ?? null,
      weight: row.weight ?? null,
      bmi: row.bmi ?? null,
      painScore: row.painScore ?? null,
      notes: row.notes ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  });

  return { vitals, total, page, pageSize };
}

export async function listNursingNotes(params: {
  patientId?: string;
  admissionId?: string;
  encounterId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ notes: NursingNoteDto[]; total: number; page: number; pageSize: number }> {
  await connectDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const filter: Record<string, unknown> = {};
  if (params.patientId && isValidObjectId(params.patientId)) {
    filter.patientId = params.patientId;
  }
  if (params.admissionId && isValidObjectId(params.admissionId)) {
    filter.admissionId = params.admissionId;
  }
  if (params.encounterId && isValidObjectId(params.encounterId)) {
    filter.encounterId = params.encounterId;
  }

  const [rows, total] = await Promise.all([
    NursingNote.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    NursingNote.countDocuments(filter),
  ]);

  const patientIds = [...new Set(rows.map((r: any) => String(r.patientId)))];
  const userIds = [...new Set(rows.map((r: any) => String(r.authorId)))];
  const [patients, users] = await Promise.all([
    Patient.find({ _id: { $in: patientIds.map((id) => new Types.ObjectId(id)) } as any })
      .select("patientId fullName")
      .lean(),
    User.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } as any })
      .select("fullName")
      .lean(),
  ]);
  const patientMap = new Map((patients as any[]).map((p) => [String(p._id), p]));
  const userMap = new Map((users as any[]).map((u) => [String(u._id), u]));

  const notes = rows.map((row: any) => {
    const patient = patientMap.get(String(row.patientId));
    const user = userMap.get(String(row.authorId));
    return {
      id: String(row._id),
      patientId: String(row.patientId),
      patientDisplayId: patient?.patientId ?? "—",
      patientName: patient?.fullName ?? "Unknown patient",
      encounterId: row.encounterId ? String(row.encounterId) : null,
      admissionId: row.admissionId ? String(row.admissionId) : null,
      authorId: String(row.authorId),
      authorName: user?.fullName ?? "—",
      note: row.note,
      shift: row.shift ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });

  return { notes, total, page, pageSize };
}
