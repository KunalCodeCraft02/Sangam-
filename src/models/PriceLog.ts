import mongoose, { Schema, models, model, Types } from "mongoose";
import { PRICE_LOG_CATEGORIES, type PriceLogCategory } from "@/lib/priceLogCategories";

export interface IPriceLog {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: string;
  itemName: string;
  priceInr: number;
  lat: number;
  lng: number;
  locationName?: string;
  shopName?: string;
  category: PriceLogCategory;
  imageUrl?: string;
  loggedAt: Date;
  createdAt: Date;
}

const PriceLogSchema = new Schema<IPriceLog>({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  clientId: { type: String, required: true },
  itemName: { type: String, required: true, trim: true },
  priceInr: { type: Number, required: true, min: 0 },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  locationName: { type: String },
  shopName: { type: String, trim: true },
  category: { type: String, enum: PRICE_LOG_CATEGORIES, default: "Other" },
  imageUrl: { type: String },
  loggedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Lets offline clients safely retry the same queued entry without creating duplicates.
PriceLogSchema.index({ tripId: 1, clientId: 1 }, { unique: true });

const PriceLog = models.PriceLog || model<IPriceLog>("PriceLog", PriceLogSchema);

export default PriceLog as mongoose.Model<IPriceLog>;
