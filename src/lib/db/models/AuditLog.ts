import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      maxlength: 80,
    },
    resourceId: {
      type: String,
      default: null,
      maxlength: 64,
    },
    ipAddress: {
      type: String,
      default: null,
      maxlength: 64,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    success: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
};

export const AuditLog: Model<AuditLogDocument> =
  (models.AuditLog as Model<AuditLogDocument>) ||
  model<AuditLogDocument>("AuditLog", auditLogSchema);
