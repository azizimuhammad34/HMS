import { z } from "zod";

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => emptyToNull(v));

export const BED_STATUSES = ["available", "occupied", "maintenance"] as const;
export const DISCHARGE_DISPOSITIONS = [
  "home",
  "transfer",
  "lama",
  "deceased",
  "other",
] as const;

export const createBedSchema = z.object({
  ward: z.string().trim().min(1, "Ward is required").max(80),
  room: z.string().trim().min(1, "Room is required").max(40),
  bedNumber: z.string().trim().min(1, "Bed number is required").max(20),
  code: optionalText(40),
  notes: optionalText(500),
  status: z.enum(["available", "maintenance"]).default("available"),
});

export const updateBedSchema = z.object({
  ward: z.string().trim().min(1).max(80).optional(),
  room: z.string().trim().min(1).max(40).optional(),
  bedNumber: z.string().trim().min(1).max(20).optional(),
  code: optionalText(40),
  notes: optionalText(500),
  status: z.enum(["available", "maintenance"]).optional(),
  isActive: z.boolean().optional(),
});

export const admitPatientSchema = z.object({
  patientId: z.string().trim().min(1, "Patient is required"),
  bedId: z.string().trim().min(1, "Bed is required"),
  admittingDoctorId: optionalText(32),
  reason: optionalText(500),
});

export const dischargeAdmissionSchema = z.object({
  dischargeDisposition: z.enum(DISCHARGE_DISPOSITIONS),
  dischargeSummary: optionalText(5000),
});

export const admissionListSchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["admitted", "discharged", "all"]).optional(),
  ),
  ward: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(80).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const bedListSchema = z.object({
  ward: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(80).optional(),
  ),
  status: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["available", "occupied", "maintenance", "all"]).optional(),
  ),
  includeInactive: z.preprocess(
    (v) => v === "true" || v === true,
    z.boolean().optional(),
  ),
});

export type CreateBedInput = {
  ward: string;
  room: string;
  bedNumber: string;
  code?: string | null;
  notes?: string | null;
  status?: "available" | "maintenance";
};

export type UpdateBedInput = {
  ward?: string;
  room?: string;
  bedNumber?: string;
  code?: string | null;
  notes?: string | null;
  status?: "available" | "maintenance";
  isActive?: boolean;
};

export type AdmitPatientInput = {
  patientId: string;
  bedId: string;
  admittingDoctorId?: string | null;
  reason?: string | null;
};

export type DischargeAdmissionInput = {
  dischargeDisposition: (typeof DISCHARGE_DISPOSITIONS)[number];
  dischargeSummary?: string | null;
};

export type AdmissionListInput = z.infer<typeof admissionListSchema>;
export type BedListInput = z.infer<typeof bedListSchema>;
