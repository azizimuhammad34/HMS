import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Actual payments received (or refunded).
 * Dashboard "today's revenue" sums completed payments by paidAt, not invoices.
 */
const paymentSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "PKR",
      maxlength: 3,
    },
    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "other"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["completed", "refunded", "failed"],
      required: true,
      index: true,
    },
    paidAt: {
      type: Date,
      required: true,
      index: true,
    },
    refundOfPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "payments",
  },
);

paymentSchema.index({ status: 1, paidAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Payment: Model<PaymentDocument> =
  (models.Payment as Model<PaymentDocument>) ||
  model<PaymentDocument>("Payment", paymentSchema);
