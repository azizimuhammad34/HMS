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

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  genericName: optionalText(200),
  strength: optionalText(100),
  form: z.enum(["tablet", "capsule", "syrup", "injection", "cream", "ointment", "drops", "inhaler", "other"]).default("tablet"),
  unit: z.string().trim().min(1).max(50).default("piece"),
  stock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(10),
  price: z.coerce.number().min(0).default(0),
  isActive: z.coerce.boolean().optional(),
});

export const dispenseItemSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  dosage: optionalText(120),
  frequency: optionalText(120),
  duration: optionalText(120),
});

export const dispenseSchema = z.object({
  prescriptionId: optionalText(64).transform((v) => v),
  patientId: z.string().min(1, "Patient is required"),
  encounterId: optionalText(64).transform((v) => v),
  items: z.array(dispenseItemSchema).min(1, "Add at least one item"),
  notes: optionalText(1000),
});

export type MedicineInput = z.infer<typeof medicineSchema>;
export type DispenseInput = z.infer<typeof dispenseSchema>;
