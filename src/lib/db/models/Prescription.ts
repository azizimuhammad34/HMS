import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const prescriptionItemSchema = new Schema(
  {
    medication: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    frequency: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    duration: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  { _id: false },
);

const prescriptionSchema = new Schema(
  {
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: "Encounter",
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [prescriptionItemSchema],
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "At least one medication is required",
      },
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
      index: true,
    },
    prescribedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "prescriptions",
  },
);

prescriptionSchema.index({ encounterId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, prescribedAt: -1 });

export type PrescriptionDocument = InferSchemaType<typeof prescriptionSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Prescription: Model<PrescriptionDocument> =
  (models.Prescription as Model<PrescriptionDocument>) ||
  model<PrescriptionDocument>("Prescription", prescriptionSchema);
