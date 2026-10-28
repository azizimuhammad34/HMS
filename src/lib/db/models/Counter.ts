import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Atomic counters for readable sequential IDs (e.g. patient IDs).
 * Prefer findOneAndUpdate with $inc over counting documents.
 */
const counterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "counters",
  },
);

export type CounterDocument = InferSchemaType<typeof counterSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Counter: Model<CounterDocument> =
  (models.Counter as Model<CounterDocument>) ||
  model<CounterDocument>("Counter", counterSchema);
