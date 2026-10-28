import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const nursingNoteSchema = new Schema(
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
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "night", null],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "nursing_notes",
  },
);

nursingNoteSchema.index({ patientId: 1, createdAt: -1 });
nursingNoteSchema.index({ admissionId: 1, createdAt: -1 });

export type NursingNoteDocument = InferSchemaType<typeof nursingNoteSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const NursingNote: Model<NursingNoteDocument> =
  (models.NursingNote as Model<NursingNoteDocument>) ||
  model<NursingNoteDocument>("NursingNote", nursingNoteSchema);
