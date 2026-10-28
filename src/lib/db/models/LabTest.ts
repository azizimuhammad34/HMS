import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const labTestSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "general",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sampleType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "lab_tests",
  },
);

labTestSchema.index({ isActive: 1 });

export type LabTestDocument = InferSchemaType<typeof labTestSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const LabTest: Model<LabTestDocument> =
  (models.LabTest as Model<LabTestDocument>) ||
  model<LabTestDocument>("LabTest", labTestSchema);
