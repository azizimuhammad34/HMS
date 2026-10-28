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

export const labTestSchema = z.object({
  code: z.string().trim().min(1).max(32).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, "Name is required").max(200),
  category: optionalText(100),
  price: z.coerce.number().min(0).default(0),
  sampleType: optionalText(100),
  isActive: z.coerce.boolean().optional(),
});

export const labOrderItemSchema = z.object({
  labTestId: z.string().min(1, "Test is required"),
});

export const labOrderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  encounterId: optionalText(64).transform((v) => v),
  items: z.array(labOrderItemSchema).min(1, "Add at least one test"),
  notes: optionalText(1000),
});

export const labResultSchema = z.object({
  result: z.string().trim().min(1, "Result is required").max(2000),
  resultNotes: optionalText(1000),
});

export type LabTestInput = z.infer<typeof labTestSchema>;
export type LabOrderInput = z.infer<typeof labOrderSchema>;
export type LabResultInput = z.infer<typeof labResultSchema>;
