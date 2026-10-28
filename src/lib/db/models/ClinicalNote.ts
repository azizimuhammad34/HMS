import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const clinicalNoteSchema = new Schema(
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
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    noteType: {
      type: String,
      enum: ["consultation", "progress", "other"],
      default: "consultation",
    },
    chiefComplaint: {
      type: String,
      maxlength: 500,
      default: null,
    },
    history: {
      type: String,
      maxlength: 5000,
      default: null,
    },
    examination: {
      type: String,
      maxlength: 5000,
      default: null,
    },
    assessment: {
      type: String,
      maxlength: 5000,
      default: null,
    },
    plan: {
      type: String,
      maxlength: 5000,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "clinical_notes",
  },
);

clinicalNoteSchema.index({ encounterId: 1, createdAt: -1 });
clinicalNoteSchema.index({ patientId: 1, createdAt: -1 });

export type ClinicalNoteDocument = InferSchemaType<typeof clinicalNoteSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ClinicalNote: Model<ClinicalNoteDocument> =
  (models.ClinicalNote as Model<ClinicalNoteDocument>) ||
  model<ClinicalNoteDocument>("ClinicalNote", clinicalNoteSchema);
