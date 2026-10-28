import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES, type Role } from "@/types/roles";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
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
    collection: "users",
  },
);

userSchema.index({ role: 1, isActive: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Schema.Types.ObjectId;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export const User: Model<UserDocument> =
  (models.User as Model<UserDocument>) ||
  model<UserDocument>("User", userSchema);
