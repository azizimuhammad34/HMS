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

const optionalNumber = (min?: number, max?: number) =>
  z.preprocess(
    (v) => {
      if (v === "" || v == null) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const num = Number(v);
        if (Number.isNaN(num)) return v;
        return num;
      }
      return v;
    },
    z
      .union([z.number(), z.null()])
      .optional()
      .refine(
        (v) => {
          if (v == null) return true;
          if (min != null && v < min) return false;
          if (max != null && v > max) return false;
          return true;
        },
        { message: "Value out of range" },
      )
      .transform((v) => (v == null ? null : v)),
  );

export const vitalSignSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  encounterId: optionalText(64).transform((v) => v),
  admissionId: optionalText(64).transform((v) => v),
  temperature: optionalNumber(30, 45),
  pulse: optionalNumber(20, 250),
  respiratoryRate: optionalNumber(5, 80),
  bloodPressureSystolic: optionalNumber(40, 300),
  bloodPressureDiastolic: optionalNumber(20, 200),
  oxygenSaturation: optionalNumber(50, 100),
  height: optionalNumber(0, 300),
  weight: optionalNumber(0, 500),
  painScore: optionalNumber(0, 10),
  notes: optionalText(1000),
});

export const nursingNoteSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  encounterId: optionalText(64).transform((v) => v),
  admissionId: optionalText(64).transform((v) => v),
  note: z.string().trim().min(1, "Note is required").max(5000),
  shift: z.enum(["morning", "evening", "night"]).optional().nullable(),
});

export type VitalSignInput = z.infer<typeof vitalSignSchema>;
export type NursingNoteInput = z.infer<typeof nursingNoteSchema>;
