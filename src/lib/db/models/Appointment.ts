import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const appointmentSchema = new Schema(
  {
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
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 240,
    },
    status: {
      type: String,
      enum: ["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"],
      default: "scheduled",
      index: true,
    },
    reason: {
      type: String,
      maxlength: 300,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      maxlength: 300,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "appointments",
  },
);

appointmentSchema.index({ doctorId: 1, scheduledAt: 1, status: 1 });
appointmentSchema.index({ scheduledAt: 1, status: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Appointment: Model<AppointmentDocument> =
  (models.Appointment as Model<AppointmentDocument>) ||
  model<AppointmentDocument>("Appointment", appointmentSchema);
