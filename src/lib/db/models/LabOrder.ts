import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const labOrderItemSchema = new Schema(
  {
    labTestId: {
      type: Schema.Types.ObjectId,
      ref: "LabTest",
      required: true,
    },
    labTestName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ordered", "collected", "in_progress", "completed", "cancelled"],
      default: "ordered",
    },
    result: {
      type: String,
      maxlength: 2000,
      default: null,
    },
    resultNotes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const labOrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [labOrderItemSchema],
      required: true,
    },
    status: {
      type: String,
      enum: ["ordered", "collected", "in_progress", "completed", "cancelled"],
      default: "ordered",
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
    orderedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "lab_orders",
  },
);

labOrderSchema.index({ patientId: 1, orderedAt: -1 });

export type LabOrderDocument = InferSchemaType<typeof labOrderSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const LabOrder: Model<LabOrderDocument> =
  (models.LabOrder as Model<LabOrderDocument>) ||
  model<LabOrderDocument>("LabOrder", labOrderSchema);
