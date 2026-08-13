import mongoose, { Schema, models, model, Types } from "mongoose";

export interface IWishlistItem {
  tripId: Types.ObjectId;
  name: string;
  addedBy: Types.ObjectId;
  createdAt: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
  name: { type: String, required: true, trim: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

const WishlistItem = models.WishlistItem || model<IWishlistItem>("WishlistItem", WishlistItemSchema);

export default WishlistItem as mongoose.Model<IWishlistItem>;
