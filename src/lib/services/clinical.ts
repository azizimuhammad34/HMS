import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Appointment } from "@/lib/db/models/Appointment";
import { ClinicalNote } from "@/lib/db/models/ClinicalNote";
import { Diagnosis } from "@/lib/db/models/Diagnosis";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { Prescription } from "@/lib/db/models/Prescription";
import { User } from "@/lib/db/models/User";
import { writeAudit } from "@/lib/services/audit";
import { getDayBounds, parseHospitalDateTime } from "@/lib/utils/date";
import type {
  ClinicalNoteInput,
  DiagnosisInput,
  PrescriptionInput,
} from "@/lib/validations/clinical";

export class ClinicalServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ClinicalServiceError";
    this.code = code;
    this.status = status;
  }
}

export type EncounterQueueItem = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  appointmentId: string | null;
  type: string;
  status: string;
  startedAt: string;
};

export type ClinicalNoteDto = {
  id: string;
  noteType: string;
  chiefComplaint: string | null;
  history: string | null;
  examination: string | null;
  assessment: string | null;
  plan: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosisDto = {
  id: string;
  description: string;
  code: string | null;
  kind: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
};

export type PrescriptionDto = {
  id: string;
  status: string;
  notes: string | null;
  items: Array<{
    medication: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
  }>;
  doctorId: string;
  doctorName: string;
  prescribedAt: string;
  createdAt: string;
};

export type EncounterDetail = {
  encounter: EncounterQueueItem & {
    completedAt: string | null;
  };
  notes: ClinicalNoteDto[];
  diagnoses: DiagnosisDto[];
  prescriptions: PrescriptionDto[];
};

export type PatientClinicalHistory = {
  encounters: Array<{
    id: string;
    type: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    doctorName: string | null;
    diagnoses: Array<{ description: string; kind: string; code: string | null }>;
    prescriptions: Array<{
      id: string;
      prescribedAt: string;
      medications: string[];
    }>;
    latestNoteSummary: string | null;
  }>;
};

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

type RawEncounter = {
  _id: { toString(): string };
  patientId: { toString(): string };
  doctorId?: { toString(): string } | null;
  appointmentId?: { toString(): string } | null;
  type: string;
  status: string;
  startedAt: Date;
  completedAt?: Date | null;
};

async function hydrateEncounters(
  rows: RawEncounter[],
): Promise<EncounterQueueItem[]> {
  if (rows.length === 0) return [];

  const patientIds = [...new Set(rows.map((r) => String(r.patientId)))];
  const doctorIds = [
    ...new Set(
      rows
        .map((r) => (r.doctorId ? String(r.doctorId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [patients, doctors] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } } as Record<string, unknown>)
      .select("patientId fullName")
      .lean() as unknown as Promise<
      Array<{ _id: { toString(): string }; patientId: string; fullName: string }>
    >,
    doctorIds.length
      ? (User.find({ _id: { $in: doctorIds } } as Record<string, unknown>)
          .select("fullName")
          .lean() as unknown as Promise<
          Array<{ _id: { toString(): string }; fullName: string }>
        >)
      : Promise.resolve([]),
  ]);

  const patientMap = new Map(
    patients.map((p) => [
      String(p._id),
      { patientId: p.patientId, fullName: p.fullName },
    ]),
  );
  const doctorMap = new Map(doctors.map((d) => [String(d._id), d.fullName]));

  return rows.map((row) => {
    const patient = patientMap.get(String(row.patientId));
    const doctorId = row.doctorId ? String(row.doctorId) : null;
    return {
      id: String(row._id),
      patientId: String(row.patientId),
      patientDisplayId: patient?.patientId ?? "—",
      patientName: patient?.fullName ?? "Unknown patient",
      doctorId,
      doctorName: doctorId ? (doctorMap.get(doctorId) ?? "Unknown doctor") : null,
      appointmentId: row.appointmentId ? String(row.appointmentId) : null,
      type: row.type,
      status: row.status,
      startedAt: new Date(row.startedAt).toISOString(),
    };
  });
}

async function resolveAuthorNames(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const users = (await User.find({
    _id: { $in: [...new Set(ids)] },
  } as Record<string, unknown>)
    .select("fullName")
    .lean()) as unknown as Array<{
    _id: { toString(): string };
    fullName: string;
  }>;
  return new Map(users.map((u) => [String(u._id), u.fullName]));
}

async function loadEncounterOrThrow(id: string): Promise<RawEncounter> {
  if (!isValidObjectId(id)) {
    throw new ClinicalServiceError("NOT_FOUND", "Encounter not found", 404);
  }
  const row = (await Encounter.findById(id).lean()) as unknown as RawEncounter | null;
  if (!row) {
    throw new ClinicalServiceError("NOT_FOUND", "Encounter not found", 404);
  }
  return row;
}

function assertCanAccessEncounter(
  encounter: RawEncounter,
  actor: { id: string; role: string },
) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.role === "DOCTOR") {
    if (!encounter.doctorId || String(encounter.doctorId) !== actor.id) {
      throw new ClinicalServiceError(
        "FORBIDDEN",
        "You can only access your own encounters",
        403,
      );
    }
    return;
  }
  throw new ClinicalServiceError("FORBIDDEN", "Insufficient permissions", 403);
}

function assertWritable(encounter: RawEncounter) {
  if (encounter.status === "completed" || encounter.status === "cancelled") {
    throw new ClinicalServiceError(
      "INVALID_STATE",
      `Cannot modify a ${encounter.status} encounter`,
      409,
    );
  }
}

export async function listEncounters(params: {
  date?: string;
  status?: string;
  page: number;
  pageSize: number;
  scopedDoctorId?: string;
}): Promise<{
  encounters: EncounterQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  date: string;
}> {
  await connectDb();
  const dateLabel = params.date ?? getDayBounds().label;
  const dayAnchor = parseHospitalDateTime(`${dateLabel}T00:00`);
  const { start, end } = getDayBounds(dayAnchor);

  const filter: Record<string, unknown> = {
    startedAt: { $gte: start, $lte: end },
  };

  if (params.scopedDoctorId) {
    filter.doctorId = params.scopedDoctorId;
  }

  if (params.status === "active" || !params.status) {
    filter.status = { $in: ["checked_in", "in_consultation"] };
  } else {
    filter.status = params.status;
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    Encounter.find(filter)
      .sort({ startedAt: 1 })
      .skip(skip)
      .limit(params.pageSize)
      .lean() as unknown as Promise<RawEncounter[]>,
    Encounter.countDocuments(filter),
  ]);

  return {
    encounters: await hydrateEncounters(rows),
    total,
    page: params.page,
    pageSize: params.pageSize,
    date: dateLabel,
  };
}

export async function getEncounterDetail(
  id: string,
  actor: { id: string; role: string },
): Promise<EncounterDetail> {
  await connectDb();
  const row = await loadEncounterOrThrow(id);
  assertCanAccessEncounter(row, actor);

  const [hydrated] = await hydrateEncounters([row]);
  if (!hydrated) {
    throw new ClinicalServiceError("NOT_FOUND", "Encounter not found", 404);
  }

  const [notesRaw, diagnosesRaw, prescriptionsRaw] = await Promise.all([
    ClinicalNote.find({ encounterId: id } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        noteType: string;
        chiefComplaint?: string | null;
        history?: string | null;
        examination?: string | null;
        assessment?: string | null;
        plan?: string | null;
        authorId: { toString(): string };
        createdAt: Date;
        updatedAt: Date;
      }>
    >,
    Diagnosis.find({ encounterId: id } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        description: string;
        code?: string | null;
        kind: string;
        recordedBy: { toString(): string };
        createdAt: Date;
      }>
    >,
    Prescription.find({ encounterId: id } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        status: string;
        notes?: string | null;
        items: Array<{
          medication: string;
          dosage?: string | null;
          frequency?: string | null;
          duration?: string | null;
          instructions?: string | null;
        }>;
        doctorId: { toString(): string };
        prescribedAt: Date;
        createdAt: Date;
      }>
    >,
  ]);

  const nameIds = [
    ...notesRaw.map((n) => String(n.authorId)),
    ...diagnosesRaw.map((d) => String(d.recordedBy)),
    ...prescriptionsRaw.map((p) => String(p.doctorId)),
  ];
  const names = await resolveAuthorNames(nameIds);

  return {
    encounter: {
      ...hydrated,
      completedAt: row.completedAt
        ? new Date(row.completedAt).toISOString()
        : null,
    },
    notes: notesRaw.map((n) => ({
      id: String(n._id),
      noteType: n.noteType,
      chiefComplaint: n.chiefComplaint ?? null,
      history: n.history ?? null,
      examination: n.examination ?? null,
      assessment: n.assessment ?? null,
      plan: n.plan ?? null,
      authorId: String(n.authorId),
      authorName: names.get(String(n.authorId)) ?? "Unknown",
      createdAt: new Date(n.createdAt).toISOString(),
      updatedAt: new Date(n.updatedAt).toISOString(),
    })),
    diagnoses: diagnosesRaw.map((d) => ({
      id: String(d._id),
      description: d.description,
      code: d.code ?? null,
      kind: d.kind,
      recordedBy: String(d.recordedBy),
      recordedByName: names.get(String(d.recordedBy)) ?? "Unknown",
      createdAt: new Date(d.createdAt).toISOString(),
    })),
    prescriptions: prescriptionsRaw.map((p) => ({
      id: String(p._id),
      status: p.status,
      notes: p.notes ?? null,
      items: p.items.map((item) => ({
        medication: item.medication,
        dosage: item.dosage ?? null,
        frequency: item.frequency ?? null,
        duration: item.duration ?? null,
        instructions: item.instructions ?? null,
      })),
      doctorId: String(p.doctorId),
      doctorName: names.get(String(p.doctorId)) ?? "Unknown",
      prescribedAt: new Date(p.prescribedAt).toISOString(),
      createdAt: new Date(p.createdAt).toISOString(),
    })),
  };
}

export async function startConsultation(params: {
  id: string;
  actor: { id: string; role: string };
  ipAddress?: string | null;
}): Promise<EncounterQueueItem> {
  await connectDb();
  const existing = await Encounter.findById(params.id);
  if (!existing) {
    throw new ClinicalServiceError("NOT_FOUND", "Encounter not found", 404);
  }

  const raw = {
    _id: existing._id,
    patientId: existing.patientId,
    doctorId: existing.doctorId,
    appointmentId: existing.appointmentId,
    type: existing.type,
    status: existing.status,
    startedAt: existing.startedAt,
    completedAt: existing.completedAt,
  } as unknown as RawEncounter;

  assertCanAccessEncounter(raw, params.actor);

  if (existing.status === "in_consultation") {
    const [dto] = await hydrateEncounters([raw]);
    return dto!;
  }
  if (existing.status !== "checked_in") {
    throw new ClinicalServiceError(
      "INVALID_STATE",
      `Cannot start consultation from status ${existing.status}`,
      409,
    );
  }

  existing.status = "in_consultation";
  if (!existing.doctorId && params.actor.role === "DOCTOR") {
    existing.set("doctorId", params.actor.id);
  }
  await existing.save();

  if (existing.appointmentId) {
    await Appointment.updateOne(
      {
        _id: existing.appointmentId,
        status: { $in: ["checked_in", "scheduled"] },
      } as Record<string, unknown>,
      { $set: { status: "in_progress" } },
    );
  }

  await writeAudit({
    actorId: params.actor.id,
    action: "encounters.consultation_started",
    resourceType: "Encounter",
    resourceId: params.id,
    ipAddress: params.ipAddress,
  });

  const updated = (await Encounter.findById(params.id).lean()) as unknown as RawEncounter;
  const [dto] = await hydrateEncounters([updated]);
  return dto!;
}

export async function completeEncounter(params: {
  id: string;
  actor: { id: string; role: string };
  ipAddress?: string | null;
}): Promise<EncounterQueueItem> {
  await connectDb();
  const existing = await Encounter.findById(params.id);
  if (!existing) {
    throw new ClinicalServiceError("NOT_FOUND", "Encounter not found", 404);
  }

  const raw = {
    _id: existing._id,
    patientId: existing.patientId,
    doctorId: existing.doctorId,
    appointmentId: existing.appointmentId,
    type: existing.type,
    status: existing.status,
    startedAt: existing.startedAt,
    completedAt: existing.completedAt,
  } as unknown as RawEncounter;

  assertCanAccessEncounter(raw, params.actor);

  if (existing.status === "completed") {
    const [dto] = await hydrateEncounters([raw]);
    return dto!;
  }
  if (
    existing.status !== "checked_in" &&
    existing.status !== "in_consultation"
  ) {
    throw new ClinicalServiceError(
      "INVALID_STATE",
      `Cannot complete from status ${existing.status}`,
      409,
    );
  }

  existing.status = "completed";
  existing.completedAt = new Date();
  await existing.save();

  if (existing.appointmentId) {
    await Appointment.updateOne(
      {
        _id: existing.appointmentId,
        status: { $nin: ["cancelled"] },
      } as Record<string, unknown>,
      { $set: { status: "completed" } },
    );
  }

  await writeAudit({
    actorId: params.actor.id,
    action: "encounters.completed",
    resourceType: "Encounter",
    resourceId: params.id,
    ipAddress: params.ipAddress,
  });

  const updated = (await Encounter.findById(params.id).lean()) as unknown as RawEncounter;
  const [dto] = await hydrateEncounters([updated]);
  return dto!;
}

export async function addClinicalNote(params: {
  encounterId: string;
  input: ClinicalNoteInput;
  actor: { id: string; role: string };
  ipAddress?: string | null;
}): Promise<ClinicalNoteDto> {
  await connectDb();
  const encounter = await loadEncounterOrThrow(params.encounterId);
  assertCanAccessEncounter(encounter, params.actor);
  assertWritable(encounter);

  const hasContent = [
    params.input.chiefComplaint,
    params.input.history,
    params.input.examination,
    params.input.assessment,
    params.input.plan,
  ].some((v) => typeof v === "string" && v.trim().length > 0);

  if (!hasContent) {
    throw new ClinicalServiceError(
      "VALIDATION_ERROR",
      "Add at least one note field",
    );
  }

  const created = await ClinicalNote.create({
    encounterId: params.encounterId,
    patientId: String(encounter.patientId),
    authorId: params.actor.id,
    noteType: params.input.noteType ?? "consultation",
    chiefComplaint: params.input.chiefComplaint ?? null,
    history: params.input.history ?? null,
    examination: params.input.examination ?? null,
    assessment: params.input.assessment ?? null,
    plan: params.input.plan ?? null,
  } as Record<string, unknown>);

  if (encounter.status === "checked_in") {
    await Encounter.updateOne(
      { _id: params.encounterId } as Record<string, unknown>,
      { $set: { status: "in_consultation" } },
    );
  }

  await writeAudit({
    actorId: params.actor.id,
    action: "clinical.note_added",
    resourceType: "ClinicalNote",
    resourceId: String(created._id),
    ipAddress: params.ipAddress,
    metadata: { encounterId: params.encounterId },
  });

  const names = await resolveAuthorNames([params.actor.id]);
  return {
    id: String(created._id),
    noteType: created.noteType,
    chiefComplaint: created.chiefComplaint ?? null,
    history: created.history ?? null,
    examination: created.examination ?? null,
    assessment: created.assessment ?? null,
    plan: created.plan ?? null,
    authorId: params.actor.id,
    authorName: names.get(params.actor.id) ?? "Unknown",
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function addDiagnosis(params: {
  encounterId: string;
  input: DiagnosisInput;
  actor: { id: string; role: string };
  ipAddress?: string | null;
}): Promise<DiagnosisDto> {
  await connectDb();
  const encounter = await loadEncounterOrThrow(params.encounterId);
  assertCanAccessEncounter(encounter, params.actor);
  assertWritable(encounter);

  const created = await Diagnosis.create({
    encounterId: params.encounterId,
    patientId: String(encounter.patientId),
    recordedBy: params.actor.id,
    description: params.input.description.trim(),
    code: params.input.code ?? null,
    kind: params.input.kind ?? "primary",
  } as Record<string, unknown>);

  if (encounter.status === "checked_in") {
    await Encounter.updateOne(
      { _id: params.encounterId } as Record<string, unknown>,
      { $set: { status: "in_consultation" } },
    );
  }

  await writeAudit({
    actorId: params.actor.id,
    action: "clinical.diagnosis_added",
    resourceType: "Diagnosis",
    resourceId: String(created._id),
    ipAddress: params.ipAddress,
    metadata: { encounterId: params.encounterId },
  });

  const names = await resolveAuthorNames([params.actor.id]);
  return {
    id: String(created._id),
    description: created.description,
    code: created.code ?? null,
    kind: created.kind,
    recordedBy: params.actor.id,
    recordedByName: names.get(params.actor.id) ?? "Unknown",
    createdAt: created.createdAt.toISOString(),
  };
}

export async function addPrescription(params: {
  encounterId: string;
  input: PrescriptionInput;
  actor: { id: string; role: string };
  ipAddress?: string | null;
}): Promise<PrescriptionDto> {
  await connectDb();
  const encounter = await loadEncounterOrThrow(params.encounterId);
  assertCanAccessEncounter(encounter, params.actor);
  assertWritable(encounter);

  const created = await Prescription.create({
    encounterId: params.encounterId,
    patientId: String(encounter.patientId),
    doctorId: params.actor.id,
    items: params.input.items.map((item) => ({
      medication: item.medication.trim(),
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    })),
    notes: params.input.notes ?? null,
    status: "active",
    prescribedAt: new Date(),
  } as Record<string, unknown>);

  if (encounter.status === "checked_in") {
    await Encounter.updateOne(
      { _id: params.encounterId } as Record<string, unknown>,
      { $set: { status: "in_consultation" } },
    );
  }

  await writeAudit({
    actorId: params.actor.id,
    action: "clinical.prescription_added",
    resourceType: "Prescription",
    resourceId: String(created._id),
    ipAddress: params.ipAddress,
    metadata: {
      encounterId: params.encounterId,
      itemCount: params.input.items.length,
    },
  });

  const names = await resolveAuthorNames([params.actor.id]);
  return {
    id: String(created._id),
    status: created.status,
    notes: created.notes ?? null,
    items: created.items.map((item) => ({
      medication: item.medication,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    })),
    doctorId: params.actor.id,
    doctorName: names.get(params.actor.id) ?? "Unknown",
    prescribedAt: created.prescribedAt.toISOString(),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function getPatientClinicalHistory(
  patientId: string,
): Promise<PatientClinicalHistory> {
  if (!isValidObjectId(patientId)) {
    return { encounters: [] };
  }
  await connectDb();

  const encounters = (await Encounter.find({
    patientId,
  } as Record<string, unknown>)
    .sort({ startedAt: -1 })
    .limit(30)
    .lean()) as unknown as RawEncounter[];

  if (encounters.length === 0) return { encounters: [] };

  const encounterIds = encounters.map((e) => String(e._id));
  const doctorIds = encounters
    .map((e) => (e.doctorId ? String(e.doctorId) : null))
    .filter((id): id is string => Boolean(id));

  const [diagnoses, prescriptions, notes, doctorNames] = await Promise.all([
    Diagnosis.find({
      encounterId: { $in: encounterIds },
    } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        encounterId: { toString(): string };
        description: string;
        kind: string;
        code?: string | null;
      }>
    >,
    Prescription.find({
      encounterId: { $in: encounterIds },
      status: "active",
    } as Record<string, unknown>)
      .sort({ prescribedAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        encounterId: { toString(): string };
        prescribedAt: Date;
        items: Array<{ medication: string }>;
      }>
    >,
    ClinicalNote.find({
      encounterId: { $in: encounterIds },
    } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<
      Array<{
        encounterId: { toString(): string };
        chiefComplaint?: string | null;
        assessment?: string | null;
        plan?: string | null;
      }>
    >,
    resolveAuthorNames(doctorIds),
  ]);

  return {
    encounters: encounters.map((e) => {
      const id = String(e._id);
      const encounterDiagnoses = diagnoses.filter(
        (d) => String(d.encounterId) === id,
      );
      const encounterRx = prescriptions.filter(
        (p) => String(p.encounterId) === id,
      );
      const latestNote = notes.find((n) => String(n.encounterId) === id);
      const summary =
        latestNote?.chiefComplaint ||
        latestNote?.assessment ||
        latestNote?.plan ||
        null;

      return {
        id,
        type: e.type,
        status: e.status,
        startedAt: new Date(e.startedAt).toISOString(),
        completedAt: e.completedAt
          ? new Date(e.completedAt).toISOString()
          : null,
        doctorName: e.doctorId
          ? (doctorNames.get(String(e.doctorId)) ?? null)
          : null,
        diagnoses: encounterDiagnoses.map((d) => ({
          description: d.description,
          kind: d.kind,
          code: d.code ?? null,
        })),
        prescriptions: encounterRx.map((p) => ({
          id: String(p._id),
          prescribedAt: new Date(p.prescribedAt).toISOString(),
          medications: p.items.map((i) => i.medication),
        })),
        latestNoteSummary: summary,
      };
    }),
  };
}
