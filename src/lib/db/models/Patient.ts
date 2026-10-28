import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const patientSchema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    sex: {
      type: String,
      enum: ["male", "female", "other", "unknown"],
      default: "unknown",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "patients",
  },
);

patientSchema.index({ fullName: "text", phone: 1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ phone: 1, fullName: 1 });

export type PatientDocument = InferSchemaType<typeof patientSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Patient: Model<PatientDocument> =
  (models.Patient as Model<PatientDocument>) ||
  model<PatientDocument>("Patient", patientSchema);
