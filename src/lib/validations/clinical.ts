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

export const clinicalNoteSchema = z.object({
  noteType: z.enum(["consultation", "progress", "other"]).default("consultation"),
  chiefComplaint: optionalText(500),
  history: optionalText(5000),
  examination: optionalText(5000),
  assessment: optionalText(5000),
  plan: optionalText(5000),
});

export const diagnosisSchema = z.object({
  description: z.string().trim().min(2, "Diagnosis is required").max(300),
  code: optionalText(32),
  kind: z.enum(["primary", "secondary"]).default("primary"),
});

export const prescriptionItemSchema = z.object({
  medication: z.string().trim().min(1, "Medication is required").max(200),
  dosage: optionalText(120),
  frequency: optionalText(120),
  duration: optionalText(120),
  instructions: optionalText(500),
});

export const prescriptionSchema = z.object({
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medication"),
  notes: optionalText(1000),
});

export const encounterListSchema = z.object({
  date: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
  ),
  status: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z
      .enum(["checked_in", "in_consultation", "completed", "cancelled", "active"])
      .optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type ClinicalNoteInput = {
  noteType?: "consultation" | "progress" | "other";
  chiefComplaint?: string | null;
  history?: string | null;
  examination?: string | null;
  assessment?: string | null;
  plan?: string | null;
};

export type DiagnosisInput = {
  description: string;
  code?: string | null;
  kind?: "primary" | "secondary";
};

export type PrescriptionInput = {
  items: Array<{
    medication: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
  notes?: string | null;
};

export type EncounterListInput = z.infer<typeof encounterListSchema>;
