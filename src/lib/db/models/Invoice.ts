import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: "Encounter",
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: "PKR",
      maxlength: 3,
    },
    status: {
      type: String,
      enum: ["draft", "issued", "partially_paid", "paid", "void"],
      default: "issued",
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
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
    collection: "invoices",
  },
);

invoiceSchema.index({ status: 1, issuedAt: -1 });

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Invoice: Model<InvoiceDocument> =
  (models.Invoice as Model<InvoiceDocument>) ||
  model<InvoiceDocument>("Invoice", invoiceSchema);
