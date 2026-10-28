import { z } from "zod";

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

const optionalObjectId = z
  .union([objectIdString, z.null()])
  .optional()
  .transform((v) => (v == null || v === "" ? null : v));

const moneyAmount = z.coerce
  .number()
  .finite("Amount must be a number")
  .positive("Amount must be greater than zero")
  .max(10_000_000, "Amount is too large");

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "void",
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "other",
] as const;

export const createInvoiceSchema = z.object({
  patientId: objectIdString,
  encounterId: optionalObjectId,
  totalAmount: moneyAmount,
});

export const invoiceListSchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z
      .enum(["issued", "partially_paid", "paid", "void", "open", "all"])
      .optional(),
  ),
  patientId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    objectIdString.optional(),
  ),
  q: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(80).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const recordPaymentSchema = z.object({
  invoiceId: objectIdString,
  amount: moneyAmount,
  method: z.enum(PAYMENT_METHODS).default("cash"),
  notes: z
    .union([z.string().max(500), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
});

export const refundPaymentSchema = z.object({
  amount: moneyAmount.optional(),
  notes: z
    .union([z.string().max(500), z.null()])
    .optional()
    .transform((v) => emptyToNull(v)),
});

export type CreateInvoiceInput = {
  patientId: string;
  encounterId?: string | null;
  totalAmount: number;
};

export type InvoiceListInput = z.infer<typeof invoiceListSchema>;

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  method?: (typeof PAYMENT_METHODS)[number];
  notes?: string | null;
};

export type RefundPaymentInput = {
  amount?: number;
  notes?: string | null;
};
