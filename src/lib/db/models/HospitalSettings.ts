import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const hospitalSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: " Hospital Management System",
    },
    city: {
      type: String,
      default: "Gilgit",
      maxlength: 100,
    },
    region: {
      type: String,
      default: "Gilgit-Baltistan",
      maxlength: 100,
    },
    country: {
      type: String,
      default: "Pakistan",
      maxlength: 100,
    },
    patientIdPrefix: {
      type: String,
      default: "HOSP",
      maxlength: 10,
    },
    timezone: {
      type: String,
      default: "Asia/Karachi",
    },
    currency: {
      type: String,
      default: "PKR",
      maxlength: 3,
    },
  },
  {
    timestamps: true,
    collection: "hospital_settings",
  },
);

export type HospitalSettingsDocument = InferSchemaType<
  typeof hospitalSettingsSchema
> & {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const HospitalSettings: Model<HospitalSettingsDocument> =
  (models.HospitalSettings as Model<HospitalSettingsDocument>) ||
  model<HospitalSettingsDocument>("HospitalSettings", hospitalSettingsSchema);
