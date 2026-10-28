import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const diagnosisSchema = new Schema(
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
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    code: {
      type: String,
      trim: true,
      maxlength: 32,
      default: null,
    },
    kind: {
      type: String,
      enum: ["primary", "secondary"],
      default: "primary",
    },
  },
  {
    timestamps: true,
    collection: "diagnoses",
  },
);

diagnosisSchema.index({ encounterId: 1, createdAt: -1 });
diagnosisSchema.index({ patientId: 1, createdAt: -1 });

export type DiagnosisDocument = InferSchemaType<typeof diagnosisSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Diagnosis: Model<DiagnosisDocument> =
  (models.Diagnosis as Model<DiagnosisDocument>) ||
  model<DiagnosisDocument>("Diagnosis", diagnosisSchema);
