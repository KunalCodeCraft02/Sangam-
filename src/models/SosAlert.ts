import mongoose, { Schema, models, model, Types } from "mongoose";

export interface ISosAlert {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  lat: number;
  lng: number;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

const SosAlertSchema = new Schema<ISosAlert>({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const SosAlert = models.SosAlert || model<ISosAlert>("SosAlert", SosAlertSchema, "sosalerts");

export default SosAlert as mongoose.Model<ISosAlert>;
