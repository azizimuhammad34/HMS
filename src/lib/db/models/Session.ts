import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const sessionSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 512,
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Session: Model<SessionDocument> =
  (models.Session as Model<SessionDocument>) ||
  model<SessionDocument>("Session", sessionSchema);
