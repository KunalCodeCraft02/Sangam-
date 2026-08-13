import mongoose, { Schema, models, model, Types } from "mongoose";

export interface IDeviceToken {
  userId: Types.ObjectId;
  token: string;
  platform: "android" | "ios";
  createdAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["android", "ios"], required: true },
  createdAt: { type: Date, default: Date.now },
});

const DeviceToken = models.DeviceToken || model<IDeviceToken>("DeviceToken", DeviceTokenSchema);

export default DeviceToken as mongoose.Model<IDeviceToken>;
