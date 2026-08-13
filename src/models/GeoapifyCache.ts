import mongoose, { Schema, models, model } from "mongoose";
import type { GeoapifyFeature } from "@/lib/geoapify";

// Cached in MongoDB rather than an in-process Map: on Vercel, serverless
// function invocations don't reliably share memory (different containers,
// cold starts), so an in-memory cache would silently do nothing in
// production despite appearing to work in local dev.
export const CACHE_TTL_SECONDS = 600;

export interface IGeoapifyCache {
  cacheKey: string;
  features: GeoapifyFeature[];
  createdAt: Date;
}

const GeoapifyCacheSchema = new Schema<IGeoapifyCache>({
  cacheKey: { type: String, required: true, unique: true },
  features: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: CACHE_TTL_SECONDS },
});

const GeoapifyCache =
  models.GeoapifyCache ||
  model<IGeoapifyCache>("GeoapifyCache", GeoapifyCacheSchema, "geoapifycache");

export default GeoapifyCache as mongoose.Model<IGeoapifyCache>;
