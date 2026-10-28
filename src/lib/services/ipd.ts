import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Admission } from "@/lib/db/models/Admission";
import { Bed } from "@/lib/db/models/Bed";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import { writeAudit } from "@/lib/services/audit";
import { isMongoDuplicateKeyError } from "@/lib/services/patient-id";
import type {
  AdmitPatientInput,
  CreateBedInput,
  DischargeAdmissionInput,
  UpdateBedInput,
} from "@/lib/validations/ipd";

export class IpdServiceError extends Error {
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
    this.name = "IpdServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type BedDto = {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  code: string;
  status: string;
  notes: string | null;
  isActive: boolean;
  currentAdmissionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionDto = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  bedId: string;
  bedCode: string;
  ward: string;
  room: string;
  bedNumber: string;
  encounterId: string;
  admittingDoctorId: string | null;
  admittingDoctorName: string | null;
  status: string;
  reason: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  dischargeDisposition: string | null;
  dischargeSummary: string | null;
  admittedBy: string;
  dischargedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BedOccupancySummary = {
  totalActive: number;
  available: number;
  occupied: number;
  maintenance: number;
  byWard: Array<{
    ward: string;
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
  }>;
};

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

function defaultBedCode(ward: string, room: string, bedNumber: string): string {
  const slug = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${slug(ward)}-${slug(room)}-${slug(bedNumber)}`.slice(0, 40);
}

function toBedDto(doc: {
  _id: { toString(): string };
  ward: string;
  room: string;
  bedNumber: string;
  code: string;
  status: string;
  notes?: string | null;
  isActive: boolean;
  currentAdmissionId?: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
}): BedDto {
  return {
    id: String(doc._id),
    ward: doc.ward,
    room: doc.room,
    bedNumber: doc.bedNumber,
    code: doc.code,
    status: doc.status,
    notes: doc.notes ?? null,
    isActive: doc.isActive,
    currentAdmissionId: doc.currentAdmissionId
      ? String(doc.currentAdmissionId)
      : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

type RawAdmission = {
  _id: { toString(): string };
  patientId: { toString(): string };
  bedId: { toString(): string };
  encounterId: { toString(): string };
  admittingDoctorId?: { toString(): string } | null;
  status: string;
  reason?: string | null;
  admittedAt: Date;
  dischargedAt?: Date | null;
  dischargeDisposition?: string | null;
  dischargeSummary?: string | null;
  admittedBy: { toString(): string };
  dischargedBy?: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
};

async function hydrateAdmissions(
  rows: RawAdmission[],
): Promise<AdmissionDto[]> {
  if (rows.length === 0) return [];

  const patientIds = [...new Set(rows.map((r) => String(r.patientId)))];
  const bedIds = [...new Set(rows.map((r) => String(r.bedId)))];
  const doctorIds = [
    ...new Set(
      rows
        .map((r) => (r.admittingDoctorId ? String(r.admittingDoctorId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [patients, beds, doctors] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } } as Record<string, unknown>)
      .select("patientId fullName")
      .lean() as unknown as Promise<
      Array<{ _id: { toString(): string }; patientId: string; fullName: string }>
    >,
    Bed.find({ _id: { $in: bedIds } } as Record<string, unknown>)
      .select("code ward room bedNumber")
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        code: string;
        ward: string;
        room: string;
        bedNumber: string;
      }>
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
  const bedMap = new Map(
    beds.map((b) => [
      String(b._id),
      {
        code: b.code,
        ward: b.ward,
        room: b.room,
        bedNumber: b.bedNumber,
      },
    ]),
  );
  const doctorMap = new Map(doctors.map((d) => [String(d._id), d.fullName]));

  return rows.map((row) => {
    const patient = patientMap.get(String(row.patientId));
    const bed = bedMap.get(String(row.bedId));
    const doctorId = row.admittingDoctorId
      ? String(row.admittingDoctorId)
      : null;
    return {
      id: String(row._id),
      patientId: String(row.patientId),
      patientDisplayId: patient?.patientId ?? "—",
      patientName: patient?.fullName ?? "Unknown patient",
      bedId: String(row.bedId),
      bedCode: bed?.code ?? "—",
      ward: bed?.ward ?? "—",
      room: bed?.room ?? "—",
      bedNumber: bed?.bedNumber ?? "—",
      encounterId: String(row.encounterId),
      admittingDoctorId: doctorId,
      admittingDoctorName: doctorId
        ? (doctorMap.get(doctorId) ?? "Unknown doctor")
        : null,
      status: row.status,
      reason: row.reason ?? null,
      admittedAt: new Date(row.admittedAt).toISOString(),
      dischargedAt: row.dischargedAt
        ? new Date(row.dischargedAt).toISOString()
        : null,
      dischargeDisposition: row.dischargeDisposition ?? null,
      dischargeSummary: row.dischargeSummary ?? null,
      admittedBy: String(row.admittedBy),
      dischargedBy: row.dischargedBy ? String(row.dischargedBy) : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });
}

export async function getBedOccupancySummary(): Promise<BedOccupancySummary> {
  await connectDb();
  const beds = (await Bed.find({ isActive: true })
    .select("ward status")
    .lean()) as unknown as Array<{ ward: string; status: string }>;

  const byWardMap = new Map<
    string,
    { total: number; available: number; occupied: number; maintenance: number }
  >();

  let available = 0;
  let occupied = 0;
  let maintenance = 0;

  for (const bed of beds) {
    const bucket = byWardMap.get(bed.ward) ?? {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
    };
    bucket.total += 1;
    if (bed.status === "available") {
      available += 1;
      bucket.available += 1;
    } else if (bed.status === "occupied") {
      occupied += 1;
      bucket.occupied += 1;
    } else {
      maintenance += 1;
      bucket.maintenance += 1;
    }
    byWardMap.set(bed.ward, bucket);
  }

  return {
    totalActive: beds.length,
    available,
    occupied,
    maintenance,
    byWard: [...byWardMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ward, counts]) => ({ ward, ...counts })),
  };
}

export async function listBeds(params: {
  ward?: string;
  status?: string;
  includeInactive?: boolean;
}): Promise<BedDto[]> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (!params.includeInactive) filter.isActive = true;
  if (params.ward) filter.ward = params.ward;
  if (params.status && params.status !== "all") filter.status = params.status;

  const rows = (await Bed.find(filter)
    .sort({ ward: 1, room: 1, bedNumber: 1 })
    .lean()) as unknown as Array<Parameters<typeof toBedDto>[0]>;

  return rows.map(toBedDto);
}

export async function listAvailableBeds(): Promise<BedDto[]> {
  return listBeds({ status: "available" });
}

export async function createBed(params: {
  input: CreateBedInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<BedDto> {
  await connectDb();
  const code =
    params.input.code?.trim().toUpperCase() ||
    defaultBedCode(
      params.input.ward,
      params.input.room,
      params.input.bedNumber,
    );

  try {
    const created = await Bed.create({
      ward: params.input.ward.trim(),
      room: params.input.room.trim(),
      bedNumber: params.input.bedNumber.trim(),
      code,
      notes: params.input.notes ?? null,
      status: params.input.status ?? "available",
      createdBy: params.actorId,
    } as Record<string, unknown>);

    await writeAudit({
      actorId: params.actorId,
      action: "ipd.bed_created",
      resourceType: "Bed",
      resourceId: String(created._id),
      ipAddress: params.ipAddress,
      metadata: { code },
    });

    return toBedDto(created as unknown as Parameters<typeof toBedDto>[0]);
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw new IpdServiceError(
        "DUPLICATE_BED",
        "A bed with this ward/room/number or code already exists",
        409,
      );
    }
    throw error;
  }
}

export async function updateBed(params: {
  id: string;
  input: UpdateBedInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<BedDto> {
  if (!isValidObjectId(params.id)) {
    throw new IpdServiceError("NOT_FOUND", "Bed not found", 404);
  }
  await connectDb();

  const existing = await Bed.findById(params.id);
  if (!existing) {
    throw new IpdServiceError("NOT_FOUND", "Bed not found", 404);
  }

  if (existing.status === "occupied") {
    if (
      params.input.status === "available" ||
      params.input.status === "maintenance" ||
      params.input.isActive === false
    ) {
      throw new IpdServiceError(
        "INVALID_STATE",
        "Discharge the patient before changing an occupied bed",
        409,
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (params.input.ward !== undefined) updates.ward = params.input.ward.trim();
  if (params.input.room !== undefined) updates.room = params.input.room.trim();
  if (params.input.bedNumber !== undefined) {
    updates.bedNumber = params.input.bedNumber.trim();
  }
  if (params.input.code !== undefined) {
    updates.code =
      params.input.code?.trim().toUpperCase() ||
      defaultBedCode(
        String(params.input.ward ?? existing.ward),
        String(params.input.room ?? existing.room),
        String(params.input.bedNumber ?? existing.bedNumber),
      );
  }
  if (params.input.notes !== undefined) updates.notes = params.input.notes;
  if (params.input.status !== undefined) updates.status = params.input.status;
  if (params.input.isActive !== undefined) {
    updates.isActive = params.input.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return toBedDto(existing as unknown as Parameters<typeof toBedDto>[0]);
  }

  try {
    Object.assign(existing, updates);
    await existing.save();
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw new IpdServiceError(
        "DUPLICATE_BED",
        "A bed with this ward/room/number or code already exists",
        409,
      );
    }
    throw error;
  }

  await writeAudit({
    actorId: params.actorId,
    action: "ipd.bed_updated",
    resourceType: "Bed",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: { fields: Object.keys(updates) },
  });

  return toBedDto(existing as unknown as Parameters<typeof toBedDto>[0]);
}

export async function listAdmissions(params: {
  status?: string;
  ward?: string;
  page: number;
  pageSize: number;
}): Promise<{
  admissions: AdmissionDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  const status = params.status ?? "admitted";
  if (status !== "all") filter.status = status;

  let bedIds: string[] | undefined;
  if (params.ward) {
    const beds = (await Bed.find({ ward: params.ward })
      .select("_id")
      .lean()) as unknown as Array<{ _id: { toString(): string } }>;
    bedIds = beds.map((b) => String(b._id));
    filter.bedId = { $in: bedIds };
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    Admission.find(filter)
      .sort({ admittedAt: -1 })
      .skip(skip)
      .limit(params.pageSize)
      .lean() as unknown as Promise<RawAdmission[]>,
    Admission.countDocuments(filter),
  ]);

  return {
    admissions: await hydrateAdmissions(rows),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getAdmissionById(
  id: string,
): Promise<AdmissionDto | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const row = (await Admission.findById(id).lean()) as unknown as RawAdmission | null;
  if (!row) return null;
  const [dto] = await hydrateAdmissions([row]);
  return dto ?? null;
}

export async function getActiveAdmissionForPatient(
  patientId: string,
): Promise<AdmissionDto | null> {
  if (!isValidObjectId(patientId)) return null;
  await connectDb();
  const row = (await Admission.findOne({
    patientId,
    status: "admitted",
  } as Record<string, unknown>).lean()) as unknown as RawAdmission | null;
  if (!row) return null;
  const [dto] = await hydrateAdmissions([row]);
  return dto ?? null;
}

export async function admitPatient(params: {
  input: AdmitPatientInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<AdmissionDto> {
  const { patientId, bedId } = params.input;
  if (!isValidObjectId(patientId) || !isValidObjectId(bedId)) {
    throw new IpdServiceError("VALIDATION_ERROR", "Invalid patient or bed id");
  }

  const admittingDoctorId = params.input.admittingDoctorId ?? null;
  if (admittingDoctorId && !isValidObjectId(admittingDoctorId)) {
    throw new IpdServiceError("VALIDATION_ERROR", "Invalid doctor id");
  }

  await connectDb();

  const patient = await Patient.findById(patientId).select("_id isActive");
  if (!patient || !patient.isActive) {
    throw new IpdServiceError("NOT_FOUND", "Patient not found", 404);
  }

  const active = await Admission.findOne({
    patientId,
    status: "admitted",
  } as Record<string, unknown>).select("_id");
  if (active) {
    throw new IpdServiceError(
      "ALREADY_ADMITTED",
      "Patient already has an active admission",
      409,
      { admissionId: String(active._id) },
    );
  }

  if (admittingDoctorId) {
    const doctor = await User.findOne({
      _id: admittingDoctorId,
      role: "DOCTOR",
      isActive: true,
    } as Record<string, unknown>).select("_id");
    if (!doctor) {
      throw new IpdServiceError(
        "VALIDATION_ERROR",
        "Admitting doctor not found or inactive",
      );
    }
  }

  const bedExists = await Bed.findById(bedId).select("_id isActive status");
  if (!bedExists || !bedExists.isActive) {
    throw new IpdServiceError("NOT_FOUND", "Bed not found", 404);
  }

  // Atomically claim the bed so concurrent admits cannot double-book it.
  const claimedBed = await Bed.findOneAndUpdate(
    {
      _id: bedId,
      status: "available",
      isActive: true,
    } as Record<string, unknown>,
    { $set: { status: "occupied" } },
    { returnDocument: "after" },
  );
  if (!claimedBed) {
    throw new IpdServiceError(
      "BED_UNAVAILABLE",
      `Bed is ${bedExists.status}`,
      409,
    );
  }

  const admittedAt = new Date();
  let encounter;
  try {
    encounter = await Encounter.create({
      patientId,
      doctorId: admittingDoctorId,
      type: "ipd",
      status: "in_consultation",
      startedAt: admittedAt,
      createdBy: params.actorId,
    } as Record<string, unknown>);
  } catch (error) {
    await Bed.updateOne(
      { _id: bedId, status: "occupied", currentAdmissionId: null } as Record<
        string,
        unknown
      >,
      { $set: { status: "available" } },
    );
    throw error;
  }

  let admission;
  try {
    admission = await Admission.create({
      patientId,
      bedId,
      encounterId: String(encounter._id),
      admittingDoctorId,
      status: "admitted",
      reason: params.input.reason ?? null,
      admittedAt,
      admittedBy: params.actorId,
    } as Record<string, unknown>);
  } catch (error) {
    await Encounter.findByIdAndDelete(encounter._id);
    await Bed.updateOne(
      { _id: bedId, status: "occupied", currentAdmissionId: null } as Record<
        string,
        unknown
      >,
      { $set: { status: "available" } },
    );
    if (isMongoDuplicateKeyError(error)) {
      const keyPattern = (error as { keyPattern?: Record<string, unknown> })
        .keyPattern;
      if (keyPattern && "bedId" in keyPattern) {
        throw new IpdServiceError(
          "BED_UNAVAILABLE",
          "Bed was just claimed by another admission",
          409,
        );
      }
      throw new IpdServiceError(
        "ALREADY_ADMITTED",
        "Patient already has an active admission",
        409,
      );
    }
    throw error;
  }

  await Bed.updateOne(
    { _id: bedId } as Record<string, unknown>,
    { $set: { currentAdmissionId: admission._id } },
  );

  await writeAudit({
    actorId: params.actorId,
    action: "ipd.admitted",
    resourceType: "Admission",
    resourceId: String(admission._id),
    ipAddress: params.ipAddress,
    metadata: {
      patientId,
      bedId,
      encounterId: String(encounter._id),
    },
  });

  const dto = await getAdmissionById(String(admission._id));
  if (!dto) {
    throw new IpdServiceError(
      "SERVER_ERROR",
      "Admitted but could not load admission",
      500,
    );
  }
  return dto;
}

export async function dischargeAdmission(params: {
  id: string;
  input: DischargeAdmissionInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<AdmissionDto> {
  if (!isValidObjectId(params.id)) {
    throw new IpdServiceError("NOT_FOUND", "Admission not found", 404);
  }
  await connectDb();

  const admission = await Admission.findById(params.id);
  if (!admission) {
    throw new IpdServiceError("NOT_FOUND", "Admission not found", 404);
  }
  if (admission.status !== "admitted") {
    throw new IpdServiceError(
      "INVALID_STATE",
      "Admission is already discharged",
      409,
    );
  }

  const dischargedAt = new Date();
  admission.status = "discharged";
  admission.dischargedAt = dischargedAt;
  admission.dischargeDisposition = params.input.dischargeDisposition;
  admission.dischargeSummary = params.input.dischargeSummary ?? null;
  admission.set("dischargedBy", params.actorId);
  await admission.save();

  await Encounter.updateOne(
    { _id: admission.encounterId } as Record<string, unknown>,
    {
      $set: {
        status: "completed",
        completedAt: dischargedAt,
      },
    },
  );

  await Bed.updateOne(
    { _id: admission.bedId } as Record<string, unknown>,
    {
      $set: {
        status: "available",
        currentAdmissionId: null,
      },
    },
  );

  await writeAudit({
    actorId: params.actorId,
    action: "ipd.discharged",
    resourceType: "Admission",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: {
      disposition: params.input.dischargeDisposition,
      bedId: String(admission.bedId),
    },
  });

  const dto = await getAdmissionById(params.id);
  if (!dto) {
    throw new IpdServiceError(
      "SERVER_ERROR",
      "Discharged but could not load admission",
      500,
    );
  }
  return dto;
}

export async function listWards(): Promise<string[]> {
  await connectDb();
  const wards = await Bed.distinct("ward", { isActive: true });
  return (wards as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}
