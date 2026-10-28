import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A patient visit/encounter (distinct from patient registration).
 * "Today's visits" counts encounters started today.
 */
const encounterSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["opd", "ipd", "emergency"],
      default: "opd",
    },
    status: {
      type: String,
      enum: ["checked_in", "in_consultation", "completed", "cancelled"],
      default: "checked_in",
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "encounters",
  },
);

encounterSchema.index({ startedAt: -1 });
encounterSchema.index({ doctorId: 1, status: 1, startedAt: -1 });

export type EncounterDocument = InferSchemaType<typeof encounterSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Encounter: Model<EncounterDocument> =
  (models.Encounter as Model<EncounterDocument>) ||
  model<EncounterDocument>("Encounter", encounterSchema);
