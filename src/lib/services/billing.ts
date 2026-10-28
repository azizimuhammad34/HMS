import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Counter } from "@/lib/db/models/Counter";
import { Encounter } from "@/lib/db/models/Encounter";
import { Invoice } from "@/lib/db/models/Invoice";
import { Patient } from "@/lib/db/models/Patient";
import { Payment } from "@/lib/db/models/Payment";
import { writeAudit } from "@/lib/services/audit";
import { isMongoDuplicateKeyError } from "@/lib/services/patient-id";
import {
  outstandingAmount,
  roundMoney,
} from "@/lib/utils/billing-display";
import type {
  CreateInvoiceInput,
  InvoiceListInput,
  RecordPaymentInput,
  RefundPaymentInput,
} from "@/lib/validations/billing";

const INVOICE_COUNTER = "invoiceNumber";
const INVOICE_PREFIX = "INV";
const MAX_ID_RETRIES = 5;

export class BillingServiceError extends Error {
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
    this.name = "BillingServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type InvoiceDto = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  encounterId: string | null;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  currency: string;
  status: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentDto = {
  id: string;
  patientId: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string;
  refundOfPaymentId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
};

export type InvoiceDetailDto = InvoiceDto & {
  payments: PaymentDto[];
};

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

function invoiceStatusFromPaid(
  totalAmount: number,
  amountPaid: number,
): "issued" | "partially_paid" | "paid" {
  const paid = roundMoney(amountPaid);
  const total = roundMoney(totalAmount);
  if (paid <= 0) return "issued";
  if (paid + 0.0001 >= total) return "paid";
  return "partially_paid";
}

async function allocateInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: INVOICE_COUNTER },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    if (!counter) {
      throw new Error("Failed to allocate invoice number");
    }
    const invoiceNumber = `${INVOICE_PREFIX}-${String(counter.seq).padStart(6, "0")}`;
    const exists = await Invoice.exists({ invoiceNumber });
    if (!exists) return invoiceNumber;
  }
  throw new Error("Unable to allocate a unique invoice number after retries");
}

type RawInvoice = {
  _id: { toString(): string };
  invoiceNumber: string;
  patientId: { toString(): string };
  encounterId?: { toString(): string } | null;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  status: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type RawPayment = {
  _id: { toString(): string };
  patientId: { toString(): string };
  invoiceId?: { toString(): string } | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: Date;
  refundOfPaymentId?: { toString(): string } | null;
  notes?: string | null;
  recordedBy?: { toString(): string } | null;
  createdAt: Date;
};

function toPaymentDto(row: RawPayment): PaymentDto {
  return {
    id: String(row._id),
    patientId: String(row.patientId),
    invoiceId: row.invoiceId ? String(row.invoiceId) : null,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    status: row.status,
    paidAt: new Date(row.paidAt).toISOString(),
    refundOfPaymentId: row.refundOfPaymentId
      ? String(row.refundOfPaymentId)
      : null,
    notes: row.notes ?? null,
    recordedBy: row.recordedBy ? String(row.recordedBy) : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

async function hydrateInvoices(rows: RawInvoice[]): Promise<InvoiceDto[]> {
  if (rows.length === 0) return [];
  const patientIds = [...new Set(rows.map((r) => String(r.patientId)))];
  const patientObjectIds = patientIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const patients = (await Patient.find({ _id: { $in: patientObjectIds } } as any)
    .select("patientId fullName")
    .lean()) as unknown as Array<{
    _id: { toString(): string };
    patientId: string;
    fullName: string;
  }>;
  const patientMap = new Map(
    patients.map((p) => [
      String(p._id),
      { displayId: p.patientId, name: p.fullName },
    ]),
  );

  return rows.map((row) => {
    const patient = patientMap.get(String(row.patientId));
    return {
      id: String(row._id),
      invoiceNumber: row.invoiceNumber,
      patientId: String(row.patientId),
      patientDisplayId: patient?.displayId ?? "—",
      patientName: patient?.name ?? "Unknown patient",
      encounterId: row.encounterId ? String(row.encounterId) : null,
      totalAmount: row.totalAmount,
      amountPaid: row.amountPaid,
      outstanding: outstandingAmount(row.totalAmount, row.amountPaid),
      currency: row.currency,
      status: row.status,
      issuedAt: new Date(row.issuedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });
}

export async function createInvoice(params: {
  input: CreateInvoiceInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<InvoiceDto> {
  const { patientId, encounterId } = params.input;
  if (!isValidObjectId(patientId)) {
    throw new BillingServiceError("VALIDATION_ERROR", "Invalid patient id");
  }
  if (encounterId && !isValidObjectId(encounterId)) {
    throw new BillingServiceError("VALIDATION_ERROR", "Invalid encounter id");
  }

  const totalAmount = roundMoney(params.input.totalAmount);
  if (totalAmount <= 0) {
    throw new BillingServiceError(
      "VALIDATION_ERROR",
      "Invoice total must be greater than zero",
    );
  }

  await connectDb();

  const patient = await Patient.findById(patientId).select("_id isActive");
  if (!patient || !patient.isActive) {
    throw new BillingServiceError("NOT_FOUND", "Patient not found", 404);
  }

  if (encounterId) {
    const encounter = await Encounter.findById(encounterId).select(
      "_id patientId",
    );
    if (!encounter) {
      throw new BillingServiceError("NOT_FOUND", "Encounter not found", 404);
    }
    if (String(encounter.patientId) !== patientId) {
      throw new BillingServiceError(
        "VALIDATION_ERROR",
        "Encounter does not belong to this patient",
      );
    }
  }

  let invoice;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt += 1) {
    const invoiceNumber = await allocateInvoiceNumber();
    try {
      invoice = await Invoice.create({
        invoiceNumber,
        patientId,
        encounterId: encounterId ?? null,
        totalAmount,
        amountPaid: 0,
        currency: "PKR",
        status: "issued",
        issuedAt: new Date(),
        createdBy: params.actorId,
      } as Record<string, unknown>);
      break;
    } catch (error) {
      if (isMongoDuplicateKeyError(error) && attempt < MAX_ID_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  if (!invoice) {
    throw new BillingServiceError(
      "SERVER_ERROR",
      "Could not create invoice",
      500,
    );
  }

  await writeAudit({
    actorId: params.actorId,
    action: "billing.invoice_created",
    resourceType: "Invoice",
    resourceId: String(invoice._id),
    ipAddress: params.ipAddress,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      patientId,
      totalAmount,
    },
  });

  const dto = await getInvoiceById(String(invoice._id));
  if (!dto) {
    throw new BillingServiceError(
      "SERVER_ERROR",
      "Created but could not load invoice",
      500,
    );
  }
  return dto;
}

export async function listInvoices(params: InvoiceListInput): Promise<{
  invoices: InvoiceDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await connectDb();
  const filter: Record<string, unknown> = {};

  if (params.patientId) {
    filter.patientId = params.patientId;
  }

  if (params.status === "open") {
    filter.status = { $in: ["issued", "partially_paid"] };
  } else if (params.status && params.status !== "all") {
    filter.status = params.status;
  }

  if (params.q) {
    const q = params.q.trim();
    const invoiceMatch = {
      invoiceNumber: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    };
    const patients = (await Patient.find({
      $or: [
        { patientId: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { fullName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      ],
    })
      .select("_id")
      .limit(50)
      .lean()) as unknown as Array<{ _id: { toString(): string } }>;

    filter.$or = [
      invoiceMatch,
      ...(patients.length > 0
        ? [{ patientId: { $in: patients.map((p) => p._id) } }]
        : []),
    ];
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(params.pageSize)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return {
    invoices: await hydrateInvoices(rows as unknown as RawInvoice[]),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getInvoiceById(id: string): Promise<InvoiceDto | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const row = (await Invoice.findById(id).lean()) as unknown as RawInvoice | null;
  if (!row) return null;
  const [dto] = await hydrateInvoices([row]);
  return dto ?? null;
}

export async function getInvoiceDetail(
  id: string,
): Promise<InvoiceDetailDto | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;

  const payments = (await Payment.find({ invoiceId: id })
    .sort({ paidAt: -1 })
    .lean()) as unknown as RawPayment[];

  return {
    ...invoice,
    payments: payments.map(toPaymentDto),
  };
}

export async function recordPayment(params: {
  input: RecordPaymentInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<{ payment: PaymentDto; invoice: InvoiceDto }> {
  const { invoiceId } = params.input;
  if (!isValidObjectId(invoiceId)) {
    throw new BillingServiceError("VALIDATION_ERROR", "Invalid invoice id");
  }

  const amount = roundMoney(params.input.amount);
  if (amount <= 0) {
    throw new BillingServiceError(
      "VALIDATION_ERROR",
      "Payment amount must be greater than zero",
    );
  }

  await connectDb();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new BillingServiceError("NOT_FOUND", "Invoice not found", 404);
  }
  if (invoice.status === "void") {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Cannot record payment on a void invoice",
      409,
    );
  }
  if (invoice.status === "draft") {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Cannot record payment on a draft invoice",
      409,
    );
  }
  if (invoice.status === "paid") {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Invoice is already fully paid",
      409,
    );
  }

  const outstanding = outstandingAmount(invoice.totalAmount, invoice.amountPaid);
  if (amount > outstanding + 0.0001) {
    throw new BillingServiceError(
      "VALIDATION_ERROR",
      `Payment exceeds outstanding balance of ${outstanding}`,
      400,
      { outstanding },
    );
  }

  const paidAt = new Date();
  const payment = await Payment.create({
    patientId: invoice.patientId,
    invoiceId: invoice._id,
    amount,
    currency: invoice.currency || "PKR",
    method: params.input.method ?? "cash",
    status: "completed",
    paidAt,
    recordedBy: params.actorId,
    notes: params.input.notes ?? null,
  } as Record<string, unknown>);

  const newPaid = roundMoney(invoice.amountPaid + amount);
  invoice.amountPaid = newPaid;
  invoice.status = invoiceStatusFromPaid(invoice.totalAmount, newPaid);
  await invoice.save();

  await writeAudit({
    actorId: params.actorId,
    action: "billing.payment_recorded",
    resourceType: "Payment",
    resourceId: String(payment._id),
    ipAddress: params.ipAddress,
    metadata: {
      invoiceId,
      amount,
      method: params.input.method ?? "cash",
    },
  });

  const invoiceDto = await getInvoiceById(invoiceId);
  if (!invoiceDto) {
    throw new BillingServiceError(
      "SERVER_ERROR",
      "Payment recorded but could not load invoice",
      500,
    );
  }

  return {
    payment: toPaymentDto(payment.toObject() as unknown as RawPayment),
    invoice: invoiceDto,
  };
}

export async function refundPayment(params: {
  paymentId: string;
  input: RefundPaymentInput;
  actorId: string;
  ipAddress?: string | null;
}): Promise<{ refund: PaymentDto; invoice: InvoiceDto | null }> {
  if (!isValidObjectId(params.paymentId)) {
    throw new BillingServiceError("NOT_FOUND", "Payment not found", 404);
  }

  await connectDb();

  const original = await Payment.findById(params.paymentId);
  if (!original) {
    throw new BillingServiceError("NOT_FOUND", "Payment not found", 404);
  }
  if (original.status !== "completed") {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Only completed payments can be refunded",
      409,
    );
  }
  if (original.refundOfPaymentId) {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Cannot refund a refund record",
      409,
    );
  }

  const priorRefunds = await Payment.aggregate<{ total: number }>([
    {
      $match: {
        refundOfPaymentId: original._id,
        status: "refunded",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const alreadyRefunded = priorRefunds[0]?.total ?? 0;
  const refundable = roundMoney(original.amount - alreadyRefunded);
  if (refundable <= 0) {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Payment has already been fully refunded",
      409,
    );
  }

  const requested =
    params.input.amount != null
      ? roundMoney(params.input.amount)
      : refundable;
  if (requested <= 0) {
    throw new BillingServiceError(
      "VALIDATION_ERROR",
      "Refund amount must be greater than zero",
    );
  }
  if (requested > refundable + 0.0001) {
    throw new BillingServiceError(
      "VALIDATION_ERROR",
      `Refund exceeds refundable amount of ${refundable}`,
      400,
      { refundable },
    );
  }

  const refund = await Payment.create({
    patientId: original.patientId,
    invoiceId: original.invoiceId,
    amount: requested,
    currency: original.currency || "PKR",
    method: original.method,
    status: "refunded",
    paidAt: new Date(),
    refundOfPaymentId: original._id,
    recordedBy: params.actorId,
    notes: params.input.notes ?? null,
  } as Record<string, unknown>);

  let invoiceDto: InvoiceDto | null = null;
  if (original.invoiceId) {
    const invoice = await Invoice.findById(original.invoiceId);
    if (invoice && invoice.status !== "void") {
      const newPaid = roundMoney(Math.max(0, invoice.amountPaid - requested));
      invoice.amountPaid = newPaid;
      invoice.status = invoiceStatusFromPaid(invoice.totalAmount, newPaid);
      await invoice.save();
      invoiceDto = await getInvoiceById(String(invoice._id));
    }
  }

  await writeAudit({
    actorId: params.actorId,
    action: "billing.payment_refunded",
    resourceType: "Payment",
    resourceId: String(refund._id),
    ipAddress: params.ipAddress,
    metadata: {
      originalPaymentId: params.paymentId,
      amount: requested,
      invoiceId: original.invoiceId ? String(original.invoiceId) : null,
    },
  });

  return {
    refund: toPaymentDto(refund.toObject() as unknown as RawPayment),
    invoice: invoiceDto,
  };
}

export async function voidInvoice(params: {
  id: string;
  actorId: string;
  ipAddress?: string | null;
}): Promise<InvoiceDto> {
  if (!isValidObjectId(params.id)) {
    throw new BillingServiceError("NOT_FOUND", "Invoice not found", 404);
  }
  await connectDb();

  const invoice = await Invoice.findById(params.id);
  if (!invoice) {
    throw new BillingServiceError("NOT_FOUND", "Invoice not found", 404);
  }
  if (invoice.status === "void") {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Invoice is already void",
      409,
    );
  }
  if (roundMoney(invoice.amountPaid) > 0) {
    throw new BillingServiceError(
      "INVALID_STATE",
      "Cannot void an invoice with recorded payments; refund them first",
      409,
    );
  }

  invoice.status = "void";
  await invoice.save();

  await writeAudit({
    actorId: params.actorId,
    action: "billing.invoice_voided",
    resourceType: "Invoice",
    resourceId: params.id,
    ipAddress: params.ipAddress,
  });

  const dto = await getInvoiceById(params.id);
  if (!dto) {
    throw new BillingServiceError(
      "SERVER_ERROR",
      "Voided but could not load invoice",
      500,
    );
  }
  return dto;
}
