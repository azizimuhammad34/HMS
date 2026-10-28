import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Counter } from "@/lib/db/models/Counter";
import { Encounter } from "@/lib/db/models/Encounter";
import { LabOrder } from "@/lib/db/models/LabOrder";
import { LabTest } from "@/lib/db/models/LabTest";
import { Patient } from "@/lib/db/models/Patient";
import { writeAudit } from "@/lib/services/audit";
import type { LabOrderInput, LabResultInput, LabTestInput } from "@/lib/validations/lab";

export class LabServiceError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "LabServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const LAB_ORDER_COUNTER = "labOrderNumber";
const MAX_ID_RETRIES = 5;

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

async function allocateLabOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: LAB_ORDER_COUNTER },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    if (!counter) throw new Error("Failed to allocate lab order number");
    const number = `LAB-${String(counter.seq).padStart(6, "0")}`;
    const exists = await LabOrder.exists({ orderNumber: number });
    if (!exists) return number;
  }
  throw new Error("Unable to allocate unique lab order number");
}

export async function listLabTests(params: { q?: string; activeOnly?: boolean } = {}) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (params.activeOnly !== false) filter.isActive = true;
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { code: { $regex: q, $options: "i" } },
    ];
  }
  const tests = await LabTest.find(filter).sort({ code: 1 }).lean();
  return tests.map((t: any) => ({
    id: String(t._id),
    code: t.code,
    name: t.name,
    category: t.category,
    price: t.price,
    sampleType: t.sampleType,
    isActive: t.isActive,
  }));
}

export async function createLabTest(params: { input: LabTestInput; actorId: string; ipAddress?: string | null }) {
  if (!isValidObjectId(params.actorId)) throw new LabServiceError("UNAUTHORIZED", "Invalid actor", 401);
  await connectDb();
  const exists = await LabTest.exists({ code: params.input.code });
  if (exists) throw new LabServiceError("DUPLICATE", "Test code already exists", 409);
  const test = await LabTest.create({
    code: params.input.code,
    name: params.input.name,
    category: params.input.category ?? "general",
    price: params.input.price,
    sampleType: params.input.sampleType ?? null,
    isActive: params.input.isActive ?? true,
  });
  return {
    id: String(test._id),
    code: test.code,
    name: test.name,
    category: test.category,
    price: test.price,
    sampleType: test.sampleType ?? null,
    isActive: test.isActive,
  };
}

export async function createLabOrder(params: { input: LabOrderInput; actorId: string; ipAddress?: string | null }) {
  if (!isValidObjectId(params.input.patientId)) throw new LabServiceError("INVALID_PATIENT", "Invalid patient", 400);
  if (!isValidObjectId(params.actorId)) throw new LabServiceError("UNAUTHORIZED", "Invalid actor", 401);
  await connectDb();

  const patient = await Patient.findById(params.input.patientId).select("_id").lean();
  if (!patient) throw new LabServiceError("NOT_FOUND", "Patient not found", 404);

  if (params.input.encounterId && !isValidObjectId(params.input.encounterId)) throw new LabServiceError("INVALID_ENCOUNTER", "Invalid encounter", 400);
  if (params.input.encounterId) {
    const exists = await Encounter.exists({ _id: new Types.ObjectId(params.input.encounterId) } as any);
    if (!exists) throw new LabServiceError("NOT_FOUND", "Encounter not found", 404);
  }

  const testIds = params.input.items.map((i) => i.labTestId).filter((id) => isValidObjectId(id));
  const tests = await LabTest.find({ _id: { $in: testIds.map((id) => new Types.ObjectId(id)) } as any, isActive: true }).lean();
  if (tests.length !== testIds.length) throw new LabServiceError("INVALID_TEST", "One or more tests are invalid or inactive", 400);

  const orderNumber = await allocateLabOrderNumber();
  const items = (tests as any[]).map((t) => ({
    labTestId: t._id,
    labTestName: t.name,
    status: "ordered",
    result: null,
    resultNotes: null,
    completedAt: null,
  }));

  const order = await LabOrder.create({
    orderNumber,
    patientId: params.input.patientId,
    encounterId: params.input.encounterId || null,
    orderedBy: params.actorId,
    items,
    status: "ordered",
    notes: params.input.notes ?? null,
    orderedAt: new Date(),
  });

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    patientId: String(order.patientId),
    encounterId: order.encounterId ? String(order.encounterId) : null,
    items: order.items.map((i: any) => ({
      labTestId: String(i.labTestId),
      labTestName: i.labTestName,
      status: i.status,
      result: i.result ?? null,
      resultNotes: i.resultNotes ?? null,
      completedAt: i.completedAt ? new Date(i.completedAt).toISOString() : null,
    })),
    status: order.status,
    notes: order.notes ?? null,
    orderedAt: order.orderedAt.toISOString(),
  };
}

export async function listLabOrders(params: { patientId?: string; status?: string; page?: number; pageSize?: number } = {}) {
  await connectDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const filter: Record<string, unknown> = {};
  if (params.patientId && isValidObjectId(params.patientId)) filter.patientId = params.patientId;
  if (params.status) filter.status = params.status;

  const [rows, total] = await Promise.all([
    LabOrder.find(filter).sort({ orderedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    LabOrder.countDocuments(filter),
  ]);

  return {
    orders: rows.map((o: any) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      patientId: String(o.patientId),
      encounterId: o.encounterId ? String(o.encounterId) : null,
      items: o.items?.map((i: any) => ({
        labTestId: String(i.labTestId),
        labTestName: i.labTestName,
        status: i.status,
        result: i.result ?? null,
        resultNotes: i.resultNotes ?? null,
        completedAt: i.completedAt ? new Date(i.completedAt).toISOString() : null,
      })) || [],
      status: o.status,
      notes: o.notes ?? null,
      orderedAt: new Date(o.orderedAt).toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function recordLabResult(params: { orderId: string; labTestId: string; input: LabResultInput; actorId: string; ipAddress?: string | null }) {
  if (!isValidObjectId(params.orderId) || !isValidObjectId(params.labTestId)) throw new LabServiceError("NOT_FOUND", "Order or test not found", 404);
  if (!isValidObjectId(params.actorId)) throw new LabServiceError("UNAUTHORIZED", "Invalid actor", 401);
  await connectDb();

  const order = await LabOrder.findById(params.orderId);
  if (!order) throw new LabServiceError("NOT_FOUND", "Lab order not found", 404);

  const item = (order.items as any[]).find((i) => String(i.labTestId) === params.labTestId);
  if (!item) throw new LabServiceError("NOT_FOUND", "Test not found in order", 404);

  item.status = "completed";
  item.result = params.input.result;
  item.resultNotes = params.input.resultNotes ?? null;
  item.completedAt = new Date();

  const allCompleted = (order.items as any[]).every((i) => i.status === "completed" || i.status === "cancelled");
  if (allCompleted) {
    order.status = "completed";
  } else {
    order.status = "in_progress";
  }

  await order.save();

  await writeAudit({
    actorId: params.actorId,
    action: "lab.result_recorded",
    resourceType: "LabOrder",
    resourceId: params.orderId,
    ipAddress: params.ipAddress,
    metadata: { labTestId: params.labTestId },
  });

  return { success: true };
}
