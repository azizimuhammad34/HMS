import { z } from "zod";
import { parseHospitalDateTime } from "@/lib/utils/date";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

const scheduledAtField = z.string().trim().min(1, "Scheduled time is required");

function toScheduledAt(value: string, ctx: z.RefinementCtx): Date {
  try {
    const date = parseHospitalDateTime(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid scheduled time" });
      return z.NEVER;
    }
    return date;
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message:
        error instanceof Error ? error.message : "Invalid scheduled time",
    });
    return z.NEVER;
  }
}

export const scheduleAppointmentSchema = z.object({
  patientId: objectIdString,
  doctorId: objectIdString,
  scheduledAt: scheduledAtField.transform(toScheduledAt),
  durationMinutes: z.coerce.number().int().min(5).max(240).optional().default(15),
  reason: z
    .union([z.string().max(300), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: scheduledAtField.transform(toScheduledAt),
  durationMinutes: z.coerce.number().int().min(5).max(240).optional(),
  doctorId: objectIdString.optional(),
  reason: z
    .union([z.string().max(300), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : emptyToNull(v))),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z
    .union([z.string().max(300), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
});

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const appointmentListSchema = z.object({
  date: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
  ),
  doctorId: z.preprocess(emptyToUndefined, objectIdString.optional()),
  patientId: z.preprocess(emptyToUndefined, objectIdString.optional()),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(APPOINTMENT_STATUSES).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type ScheduleAppointmentInput = z.infer<typeof scheduleAppointmentSchema>;
export type RescheduleAppointmentInput = {
  scheduledAt: Date;
  durationMinutes?: number;
  doctorId?: string;
  reason?: string | null;
};
export type CancelAppointmentInput = {
  cancelReason?: string | null;
};
export type AppointmentListInput = z.infer<typeof appointmentListSchema>;
