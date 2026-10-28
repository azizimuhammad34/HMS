import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const medicineSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    genericName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    strength: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    form: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "ointment", "drops", "inhaler", "other"],
      default: "tablet",
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "piece",
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 10,
      min: 0,
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
  },
  {
    timestamps: true,
    collection: "medicines",
  },
);

medicineSchema.index({ name: 1 });
medicineSchema.index({ isActive: 1 });

export type MedicineDocument = InferSchemaType<typeof medicineSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Medicine: Model<MedicineDocument> =
  (models.Medicine as Model<MedicineDocument>) ||
  model<MedicineDocument>("Medicine", medicineSchema);
