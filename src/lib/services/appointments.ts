import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Appointment } from "@/lib/db/models/Appointment";
import { Encounter } from "@/lib/db/models/Encounter";
import { Patient } from "@/lib/db/models/Patient";
import { User } from "@/lib/db/models/User";
import { writeAudit } from "@/lib/services/audit";
import { getDayBounds, parseHospitalDateTime } from "@/lib/utils/date";
import type {
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  ScheduleAppointmentInput,
} from "@/lib/validations/appointment";

const ACTIVE_STATUSES = ["scheduled", "checked_in", "in_progress"] as const;

export type AppointmentDto = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  reason: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  encounterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DoctorOption = {
  id: string;
  fullName: string;
  email: string;
};

export class AppointmentServiceError extends Error {
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
    this.name = "AppointmentServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

function appointmentEnd(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

type RawAppointment = {
  _id: { toString(): string };
  patientId: { toString(): string };
  doctorId: { toString(): string };
  scheduledAt: Date;
  durationMinutes?: number | null;
  status: string;
  reason?: string | null;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function findDoctorConflict(params: {
  doctorId: string;
  scheduledAt: Date;
  durationMinutes: number;
  excludeId?: string;
}): Promise<boolean> {
  const rangeStart = params.scheduledAt;
  const rangeEnd = appointmentEnd(params.scheduledAt, params.durationMinutes);

  const filter: Record<string, unknown> = {
    doctorId: params.doctorId,
    status: { $in: [...ACTIVE_STATUSES] },
    scheduledAt: {
      $lt: rangeEnd,
      $gt: new Date(rangeStart.getTime() - 4 * 60 * 60 * 1000),
    },
  };
  if (params.excludeId) {
    filter._id = { $ne: params.excludeId };
  }

  const candidates = (await Appointment.find(filter)
    .select("scheduledAt durationMinutes")
    .lean()) as unknown as Array<{
    scheduledAt: Date;
    durationMinutes?: number | null;
  }>;

  return candidates.some((appt) => {
    const start = new Date(appt.scheduledAt);
    const end = appointmentEnd(start, appt.durationMinutes ?? 15);
    return start < rangeEnd && end > rangeStart;
  });
}

async function hydrateAppointments(
  rows: RawAppointment[],
): Promise<AppointmentDto[]> {
  if (rows.length === 0) return [];

  const patientIds = [...new Set(rows.map((r) => String(r.patientId)))];
  const doctorIds = [...new Set(rows.map((r) => String(r.doctorId)))];
  const appointmentIds = rows.map((r) => String(r._id));

  const [patients, doctors, encounters] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } } as Record<string, unknown>)
      .select("patientId fullName")
      .lean() as unknown as Promise<
      Array<{ _id: { toString(): string }; patientId: string; fullName: string }>
    >,
    User.find({ _id: { $in: doctorIds } } as Record<string, unknown>)
      .select("fullName")
      .lean() as unknown as Promise<
      Array<{ _id: { toString(): string }; fullName: string }>
    >,
    Encounter.find({
      appointmentId: { $in: appointmentIds },
    } as Record<string, unknown>)
      .select("appointmentId")
      .lean() as unknown as Promise<
      Array<{
        _id: { toString(): string };
        appointmentId?: { toString(): string } | null;
      }>
    >,
  ]);

  const patientMap = new Map(
    patients.map((p) => [
      String(p._id),
      { patientId: p.patientId, fullName: p.fullName },
    ]),
  );
  const doctorMap = new Map(
    doctors.map((d) => [String(d._id), d.fullName]),
  );
  const encounterMap = new Map(
    encounters
      .filter((e) => e.appointmentId)
      .map((e) => [String(e.appointmentId), String(e._id)]),
  );

  return rows.map((row) => {
    const patient = patientMap.get(String(row.patientId));
    return {
      id: String(row._id),
      patientId: String(row.patientId),
      patientDisplayId: patient?.patientId ?? "—",
      patientName: patient?.fullName ?? "Unknown patient",
      doctorId: String(row.doctorId),
      doctorName: doctorMap.get(String(row.doctorId)) ?? "Unknown doctor",
      scheduledAt: new Date(row.scheduledAt).toISOString(),
      durationMinutes: row.durationMinutes ?? 15,
      status: row.status,
      reason: row.reason ?? null,
      cancelReason: row.cancelReason ?? null,
      cancelledAt: row.cancelledAt
        ? new Date(row.cancelledAt).toISOString()
        : null,
      encounterId: encounterMap.get(String(row._id)) ?? null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });
}

export async function listDoctors(): Promise<DoctorOption[]> {
  await connectDb();
  const doctors = (await User.find({ role: "DOCTOR", isActive: true })
    .sort({ fullName: 1 })
    .select("fullName email")
    .lean()) as unknown as Array<{
    _id: { toString(): string };
    fullName: string;
    email: string;
  }>;

  return doctors.map((d) => ({
    id: String(d._id),
    fullName: d.fullName,
    email: d.email,
  }));
}

export async function listAppointments(params: {
  date?: string;
  doctorId?: string;
  patientId?: string;
  status?: string;
  page: number;
  pageSize: number;
  scopedDoctorId?: string;
}): Promise<{
  appointments: AppointmentDto[];
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
    scheduledAt: { $gte: start, $lte: end },
  };

  const doctorId = params.scopedDoctorId ?? params.doctorId;
  if (doctorId) {
    if (!isValidObjectId(doctorId)) {
      throw new AppointmentServiceError("VALIDATION_ERROR", "Invalid doctor id");
    }
    filter.doctorId = doctorId;
  }
  if (params.patientId) {
    if (!isValidObjectId(params.patientId)) {
      throw new AppointmentServiceError(
        "VALIDATION_ERROR",
        "Invalid patient id",
      );
    }
    filter.patientId = params.patientId;
  }
  if (params.status) {
    filter.status = params.status;
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(params.pageSize)
      .lean() as unknown as Promise<RawAppointment[]>,
    Appointment.countDocuments(filter),
  ]);

  return {
    appointments: await hydrateAppointments(rows),
    total,
    page: params.page,
    pageSize: params.pageSize,
    date: dateLabel,
  };
}

export async function getAppointmentById(
  id: string,
): Promise<AppointmentDto | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const row = (await Appointment.findById(id).lean()) as unknown as RawAppointment | null;
  if (!row) return null;
  const [dto] = await hydrateAppointments([row]);
  return dto ?? null;
}

export async function scheduleAppointment(params: {
  input: ScheduleAppointmentInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<AppointmentDto> {
  await connectDb();

  const [patient, doctor] = await Promise.all([
    Patient.findOne({
      _id: params.input.patientId,
      isActive: true,
    } as Record<string, unknown>).lean(),
    User.findOne({
      _id: params.input.doctorId,
      role: "DOCTOR",
      isActive: true,
    } as Record<string, unknown>).lean(),
  ]);

  if (!patient) {
    throw new AppointmentServiceError("NOT_FOUND", "Patient not found", 404);
  }
  if (!doctor) {
    throw new AppointmentServiceError(
      "NOT_FOUND",
      "Doctor not found or inactive",
      404,
    );
  }

  const conflict = await findDoctorConflict({
    doctorId: params.input.doctorId,
    scheduledAt: params.input.scheduledAt,
    durationMinutes: params.input.durationMinutes,
  });
  if (conflict) {
    throw new AppointmentServiceError(
      "CONFLICT",
      "Doctor already has an overlapping appointment",
      409,
    );
  }

  const created = await Appointment.create({
    patientId: params.input.patientId,
    doctorId: params.input.doctorId,
    scheduledAt: params.input.scheduledAt,
    durationMinutes: params.input.durationMinutes,
    reason: params.input.reason,
    status: "scheduled",
    createdBy: params.actorId,
  });

  await writeAudit({
    actorId: params.actorId,
    action: "appointments.scheduled",
    resourceType: "Appointment",
    resourceId: String(created._id),
    ipAddress: params.ipAddress,
    metadata: {
      patientId: String(created.patientId),
      doctorId: String(created.doctorId),
      scheduledAt: created.scheduledAt.toISOString(),
    },
  });

  const dto = await getAppointmentById(String(created._id));
  if (!dto) {
    throw new AppointmentServiceError(
      "SERVER_ERROR",
      "Appointment created but could not be loaded",
      500,
    );
  }
  return dto;
}

export async function rescheduleAppointment(params: {
  id: string;
  input: RescheduleAppointmentInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<AppointmentDto> {
  if (!isValidObjectId(params.id)) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  await connectDb();

  const existing = await Appointment.findById(params.id);
  if (!existing) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  if (existing.status === "cancelled" || existing.status === "completed") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      `Cannot reschedule a ${existing.status} appointment`,
      409,
    );
  }
  if (existing.status === "checked_in" || existing.status === "in_progress") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      "Cannot reschedule after check-in",
      409,
    );
  }

  const doctorId = params.input.doctorId ?? String(existing.doctorId);
  if (params.input.doctorId && params.input.doctorId !== String(existing.doctorId)) {
    const doctor = await User.findOne({
      _id: params.input.doctorId,
      role: "DOCTOR",
      isActive: true,
    } as Record<string, unknown>).lean();
    if (!doctor) {
      throw new AppointmentServiceError(
        "NOT_FOUND",
        "Doctor not found or inactive",
        404,
      );
    }
  }

  const durationMinutes =
    params.input.durationMinutes ?? existing.durationMinutes ?? 15;

  const conflict = await findDoctorConflict({
    doctorId,
    scheduledAt: params.input.scheduledAt,
    durationMinutes,
    excludeId: params.id,
  });
  if (conflict) {
    throw new AppointmentServiceError(
      "CONFLICT",
      "Doctor already has an overlapping appointment",
      409,
    );
  }

  existing.scheduledAt = params.input.scheduledAt;
  existing.durationMinutes = durationMinutes;
  existing.set("doctorId", doctorId);
  if (params.input.reason !== undefined) {
    existing.reason = params.input.reason;
  }
  existing.status = "scheduled";
  await existing.save();

  await writeAudit({
    actorId: params.actorId,
    action: "appointments.rescheduled",
    resourceType: "Appointment",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: {
      scheduledAt: existing.scheduledAt.toISOString(),
      doctorId,
    },
  });

  const dto = await getAppointmentById(params.id);
  if (!dto) {
    throw new AppointmentServiceError(
      "SERVER_ERROR",
      "Appointment updated but could not be loaded",
      500,
    );
  }
  return dto;
}

export async function cancelAppointment(params: {
  id: string;
  input: CancelAppointmentInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<AppointmentDto> {
  if (!isValidObjectId(params.id)) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  await connectDb();

  const existing = await Appointment.findById(params.id);
  if (!existing) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  if (existing.status === "cancelled") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      "Appointment is already cancelled",
      409,
    );
  }
  if (existing.status === "completed") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      "Cannot cancel a completed appointment",
      409,
    );
  }
  if (existing.status === "checked_in" || existing.status === "in_progress") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      "Cannot cancel after check-in; complete the visit instead",
      409,
    );
  }

  existing.status = "cancelled";
  existing.cancelledAt = new Date();
  existing.cancelReason = params.input.cancelReason ?? null;
  await existing.save();

  await writeAudit({
    actorId: params.actorId,
    action: "appointments.cancelled",
    resourceType: "Appointment",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: { cancelReason: existing.cancelReason },
  });

  const dto = await getAppointmentById(params.id);
  if (!dto) {
    throw new AppointmentServiceError(
      "SERVER_ERROR",
      "Appointment cancelled but could not be loaded",
      500,
    );
  }
  return dto;
}

export async function checkInAppointment(params: {
  id: string;
  actorId: string;
  ipAddress?: string | null;
}): Promise<{ appointment: AppointmentDto; encounterId: string }> {
  if (!isValidObjectId(params.id)) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  await connectDb();

  const existing = await Appointment.findById(params.id);
  if (!existing) {
    throw new AppointmentServiceError("NOT_FOUND", "Appointment not found", 404);
  }
  if (existing.status === "cancelled" || existing.status === "no_show") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      `Cannot check in a ${existing.status} appointment`,
      409,
    );
  }
  if (existing.status === "completed") {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      "Appointment is already completed",
      409,
    );
  }

  const existingEncounter = (await Encounter.findOne({
    appointmentId: String(existing._id),
  } as Record<string, unknown>).lean()) as unknown as {
    _id: { toString(): string };
  } | null;

  if (
    (existing.status === "checked_in" || existing.status === "in_progress") &&
    existingEncounter
  ) {
    const dto = await getAppointmentById(params.id);
    if (!dto) {
      throw new AppointmentServiceError(
        "SERVER_ERROR",
        "Could not load appointment",
        500,
      );
    }
    return { appointment: dto, encounterId: String(existingEncounter._id) };
  }

  if (existing.status !== "scheduled" && !existingEncounter) {
    throw new AppointmentServiceError(
      "INVALID_STATE",
      `Cannot check in from status ${existing.status}`,
      409,
    );
  }

  let encounterId: string;
  if (existingEncounter) {
    encounterId = String(existingEncounter._id);
  } else {
    const encounter = await Encounter.create({
      patientId: String(existing.patientId),
      appointmentId: String(existing._id),
      doctorId: String(existing.doctorId),
      type: "opd",
      status: "checked_in",
      startedAt: new Date(),
      createdBy: params.actorId,
    } as Record<string, unknown>);
    encounterId = String(encounter._id);
  }

  if (existing.status === "scheduled") {
    existing.status = "checked_in";
    await existing.save();
  }

  await writeAudit({
    actorId: params.actorId,
    action: "appointments.checked_in",
    resourceType: "Appointment",
    resourceId: params.id,
    ipAddress: params.ipAddress,
    metadata: { encounterId },
  });

  const dto = await getAppointmentById(params.id);
  if (!dto) {
    throw new AppointmentServiceError(
      "SERVER_ERROR",
      "Checked in but could not load appointment",
      500,
    );
  }
  return { appointment: dto, encounterId };
}
