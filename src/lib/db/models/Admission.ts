import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const admissionSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    bedId: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
    },
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: "Encounter",
      required: true,
      index: true,
    },
    admittingDoctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["admitted", "discharged"],
      default: "admitted",
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    admittedAt: {
      type: Date,
      required: true,
      index: true,
    },
    dischargedAt: {
      type: Date,
      default: null,
    },
    dischargeDisposition: {
      type: String,
      enum: ["home", "transfer", "lama", "deceased", "other"],
      default: null,
    },
    dischargeSummary: {
      type: String,
      maxlength: 5000,
      default: null,
    },
    admittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dischargedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "admissions",
  },
);

admissionSchema.index(
  { patientId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "admitted" },
  },
);
admissionSchema.index(
  { bedId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "admitted" },
  },
);
admissionSchema.index({ status: 1, admittedAt: -1 });

export type AdmissionDocument = InferSchemaType<typeof admissionSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Admission: Model<AdmissionDocument> =
  (models.Admission as Model<AdmissionDocument>) ||
  model<AdmissionDocument>("Admission", admissionSchema);
