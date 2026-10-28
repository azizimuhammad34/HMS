import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const vitalSignSchema = new Schema(
  {
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
    admissionId: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    temperature: {
      type: Number,
      default: null,
    },
    pulse: {
      type: Number,
      default: null,
    },
    respiratoryRate: {
      type: Number,
      default: null,
    },
    bloodPressureSystolic: {
      type: Number,
      default: null,
    },
    bloodPressureDiastolic: {
      type: Number,
      default: null,
    },
    oxygenSaturation: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },
    bmi: {
      type: Number,
      default: null,
    },
    painScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "vital_signs",
  },
);

vitalSignSchema.index({ patientId: 1, recordedAt: -1 });

export type VitalSignDocument = InferSchemaType<typeof vitalSignSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const VitalSign: Model<VitalSignDocument> =
  (models.VitalSign as Model<VitalSignDocument>) ||
  model<VitalSignDocument>("VitalSign", vitalSignSchema);
