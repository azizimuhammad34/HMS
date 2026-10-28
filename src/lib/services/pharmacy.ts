import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connection";
import { Dispense } from "@/lib/db/models/Dispense";
import { Encounter } from "@/lib/db/models/Encounter";
import { Medicine } from "@/lib/db/models/Medicine";
import { Patient } from "@/lib/db/models/Patient";
import { Prescription } from "@/lib/db/models/Prescription";
import { User } from "@/lib/db/models/User";
import { writeAudit } from "@/lib/services/audit";
import type { DispenseInput, MedicineInput } from "@/lib/validations/pharmacy";

export class PharmacyServiceError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "PharmacyServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

export async function listMedicines(params: { q?: string; activeOnly?: boolean } = {}) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (params.activeOnly !== false) {
    filter.isActive = true;
  }
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { genericName: { $regex: q, $options: "i" } },
    ];
  }
  const meds = await Medicine.find(filter).sort({ name: 1 }).lean();
  return meds.map((m: any) => ({
    id: String(m._id),
    name: m.name,
    genericName: m.genericName ?? null,
    strength: m.strength ?? null,
    form: m.form,
    unit: m.unit,
    stock: m.stock,
    minStock: m.minStock,
    price: m.price,
    isActive: m.isActive,
  }));
}

export async function createMedicine(params: {
  input: MedicineInput;
  actorId: string;
  ipAddress?: string | null;
}) {
  if (!isValidObjectId(params.actorId)) {
    throw new PharmacyServiceError("UNAUTHORIZED", "Invalid actor", 401);
  }
  await connectDb();
  const med = await Medicine.create({
    name: params.input.name,
    genericName: params.input.genericName ?? null,
    strength: params.input.strength ?? null,
    form: params.input.form,
    unit: params.input.unit,
    stock: params.input.stock,
    minStock: params.input.minStock,
    price: params.input.price,
    isActive: params.input.isActive ?? true,
  });
  await writeAudit({
    actorId: params.actorId,
    action: "pharmacy.medicine_created",
    resourceType: "Medicine",
    resourceId: String(med._id),
    ipAddress: params.ipAddress,
  });
  return {
    id: String(med._id),
    name: med.name,
    genericName: med.genericName ?? null,
    strength: med.strength ?? null,
    form: med.form,
    unit: med.unit,
    stock: med.stock,
    minStock: med.minStock,
    price: med.price,
    isActive: med.isActive,
  };
}

export async function dispensePrescription(params: {
  input: DispenseInput;
  actorId: string;
  ipAddress?: string | null;
}) {
  if (!isValidObjectId(params.input.patientId)) {
    throw new PharmacyServiceError("INVALID_PATIENT", "Invalid patient", 400);
  }
  if (!isValidObjectId(params.actorId)) {
    throw new PharmacyServiceError("UNAUTHORIZED", "Invalid actor", 401);
  }
  await connectDb();

  const patient = await Patient.findById(params.input.patientId).select("patientId fullName").lean();
  if (!patient) throw new PharmacyServiceError("NOT_FOUND", "Patient not found", 404);

  if (params.input.prescriptionId && !isValidObjectId(params.input.prescriptionId)) {
    throw new PharmacyServiceError("INVALID_PRESCRIPTION", "Invalid prescription", 400);
  }
  if (params.input.encounterId && !isValidObjectId(params.input.encounterId)) {
    throw new PharmacyServiceError("INVALID_ENCOUNTER", "Invalid encounter", 400);
  }

  if (params.input.prescriptionId) {
    const exists = await Prescription.exists({ _id: new Types.ObjectId(params.input.prescriptionId) } as any);
    if (!exists) throw new PharmacyServiceError("NOT_FOUND", "Prescription not found", 404);
  }
  if (params.input.encounterId) {
    const exists = await Encounter.exists({ _id: new Types.ObjectId(params.input.encounterId) } as any);
    if (!exists) throw new PharmacyServiceError("NOT_FOUND", "Encounter not found", 404);
  }

  const medicineIds = params.input.items.map((i) => i.medicineId).filter((id) => isValidObjectId(id));
  const medicines = await Medicine.find({ _id: { $in: medicineIds.map((id) => new Types.ObjectId(id)) } as any }).lean();
  const medMap = new Map((medicines as any[]).map((m) => [String(m._id), m]));

  for (const item of params.input.items) {
    const med = medMap.get(item.medicineId);
    if (!med) throw new PharmacyServiceError("NOT_FOUND", "Medicine not found", 404);
    if (!med.isActive) throw new PharmacyServiceError("INVALID_MEDICINE", "Medicine is not active", 400);
    if ((med.stock ?? 0) < item.quantity) {
      throw new PharmacyServiceError("INSUFFICIENT_STOCK", `Insufficient stock for ${med.name}`, 400);
    }
  }

  const dispenseItems = params.input.items.map((item) => {
    const med = medMap.get(item.medicineId);
    return {
      medicineId: item.medicineId,
      medicineName: med?.name ?? item.medicineId,
      quantity: item.quantity,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
    };
  });

  const dispense = await Dispense.create({
    prescriptionId: params.input.prescriptionId || null,
    patientId: params.input.patientId,
    encounterId: params.input.encounterId || null,
    dispensedBy: params.actorId,
    items: dispenseItems,
    notes: params.input.notes ?? null,
    dispensedAt: new Date(),
  });

  for (const item of params.input.items) {
    await Medicine.updateOne({ _id: new Types.ObjectId(item.medicineId) } as any, { $inc: { stock: -item.quantity } });
  }

  await writeAudit({
    actorId: params.actorId,
    action: "pharmacy.dispensed",
    resourceType: "Dispense",
    resourceId: String(dispense._id),
    ipAddress: params.ipAddress,
    metadata: { patientId: params.input.patientId, itemCount: dispenseItems.length },
  });

  return {
    id: String(dispense._id),
    prescriptionId: dispense.prescriptionId ? String(dispense.prescriptionId) : null,
    patientId: String(dispense.patientId),
    encounterId: dispense.encounterId ? String(dispense.encounterId) : null,
    dispensedBy: String(dispense.dispensedBy),
    items: dispenseItems,
    notes: dispense.notes ?? null,
    dispensedAt: dispense.dispensedAt.toISOString(),
  };
}

export async function listDispenses(params: {
  patientId?: string;
  prescriptionId?: string;
  page?: number;
  pageSize?: number;
}) {
  await connectDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const filter: Record<string, unknown> = {};
  if (params.patientId && isValidObjectId(params.patientId)) filter.patientId = params.patientId;
  if (params.prescriptionId && isValidObjectId(params.prescriptionId)) filter.prescriptionId = params.prescriptionId;

  const [rows, total] = await Promise.all([
    Dispense.find(filter).sort({ dispensedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Dispense.countDocuments(filter),
  ]);

  return {
    dispenses: rows.map((r: any) => ({
      id: String(r._id),
      prescriptionId: r.prescriptionId ? String(r.prescriptionId) : null,
      patientId: String(r.patientId),
      encounterId: r.encounterId ? String(r.encounterId) : null,
      dispensedBy: String(r.dispensedBy),
      items: r.items,
      notes: r.notes ?? null,
      dispensedAt: new Date(r.dispensedAt).toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
