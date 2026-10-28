import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const bedSchema = new Schema(
  {
    ward: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    bedNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    /** Unique display code, e.g. GEN-101-A */
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
      default: "available",
      index: true,
    },
    currentAdmissionId: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
      default: null,
    },
    notes: {
      type: String,
      maxlength: 500,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "beds",
  },
);

bedSchema.index({ ward: 1, room: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ status: 1, isActive: 1 });

export type BedDocument = InferSchemaType<typeof bedSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Bed: Model<BedDocument> =
  (models.Bed as Model<BedDocument>) || model<BedDocument>("Bed", bedSchema);
