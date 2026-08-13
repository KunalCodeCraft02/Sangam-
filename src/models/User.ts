import mongoose, { Schema, models, model } from "mongoose";

export const DIET_TYPES = ["veg", "non-veg", "jain", "vegan"] as const;
export const SPICE_TOLERANCES = ["low", "medium", "high"] as const;
export const ALLERGY_OPTIONS = [
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Gluten",
  "Soy",
  "Shellfish",
  "Eggs",
] as const;

export type DietType = (typeof DIET_TYPES)[number];
export type SpiceTolerance = (typeof SPICE_TOLERANCES)[number];

export const LOCATION_MODES = ["real", "simulated"] as const;
export type LocationMode = (typeof LOCATION_MODES)[number];

export interface IUserLocation {
  lat: number;
  lng: number;
  mode: LocationMode;
  updatedAt: Date;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
  dietType?: DietType;
  allergies: string[];
  spiceTolerance?: SpiceTolerance;
  onboardingComplete: boolean;
  location?: IUserLocation;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  dietType: { type: String, enum: DIET_TYPES },
  allergies: { type: [String], default: [] },
  spiceTolerance: { type: String, enum: SPICE_TOLERANCES },
  onboardingComplete: { type: Boolean, default: false },
  location: {
    type: new Schema<IUserLocation>(
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        mode: { type: String, enum: LOCATION_MODES, required: true },
        updatedAt: { type: Date, required: true },
      },
      { _id: false }
    ),
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const User = models.User || model<IUser>("User", UserSchema);

export default User as mongoose.Model<IUser>;
