import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const dispenseItemSchema = new Schema(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    dosage: {
      type: String,
      maxlength: 120,
      default: null,
    },
    frequency: {
      type: String,
      maxlength: 120,
      default: null,
    },
    duration: {
      type: String,
      maxlength: 120,
      default: null,
    },
  },
  { _id: false },
);

const dispenseSchema = new Schema(
  {
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: "Encounter",
      index: true,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [dispenseItemSchema],
      required: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
    dispensedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "dispenses",
  },
);

dispenseSchema.index({ patientId: 1, dispensedAt: -1 });

export type DispenseDocument = InferSchemaType<typeof dispenseSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Dispense: Model<DispenseDocument> =
  (models.Dispense as Model<DispenseDocument>) ||
  model<DispenseDocument>("Dispense", dispenseSchema);
