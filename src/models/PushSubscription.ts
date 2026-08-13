import mongoose, { Schema, models, model, Types } from "mongoose";

export interface IPushSubscription {
  userId: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
});

const PushSubscription =
  models.PushSubscription || model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

export default PushSubscription as mongoose.Model<IPushSubscription>;
