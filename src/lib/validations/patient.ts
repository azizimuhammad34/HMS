import { z } from "zod";

export const SEX_VALUES = ["male", "female", "other", "unknown"] as const;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parses YYYY-MM-DD (preferred) or other Date-parseable strings. */
function parseDateOfBirth(value: string): Date {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = match
    ? new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
      )
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date of birth");
  }
  if (date.getTime() > Date.now()) {
    throw new Error("Date of birth cannot be in the future");
  }
  return date;
}

const optionalNullableText = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : emptyToNull(v)));

const dateOfBirthField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    try {
      return parseDateOfBirth(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Invalid date of birth",
      });
      return z.NEVER;
    }
  });

export const registerPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  dateOfBirth: dateOfBirthField.transform((v) => v ?? null),
  sex: z.enum(SEX_VALUES).default("unknown"),
  phone: z
    .union([z.string().max(30), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
  address: z
    .union([z.string().max(300), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
  emergencyContactName: z
    .union([z.string().max(120), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
  emergencyContactPhone: z
    .union([z.string().max(30), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
  confirmDuplicate: z.boolean().optional().default(false),
});

export const updatePatientSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  dateOfBirth: dateOfBirthField,
  sex: z.enum(SEX_VALUES).optional(),
  phone: optionalNullableText(30),
  address: optionalNullableText(300),
  emergencyContactName: optionalNullableText(120),
  emergencyContactPhone: optionalNullableText(30),
});

export const patientSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

/** Explicit partial type — Zod transforms make optional keys look required. */
export type UpdatePatientInput = {
  fullName?: string;
  dateOfBirth?: Date | null;
  sex?: (typeof SEX_VALUES)[number];
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type PatientSearchInput = z.infer<typeof patientSearchSchema>;
