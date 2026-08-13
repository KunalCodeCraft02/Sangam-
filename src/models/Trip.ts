import mongoose, { Schema, models, model, Types } from "mongoose";

export const MAX_TRIP_MEMBERS = 15;

export const TRIP_STATUSES = ["active", "completed"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export interface ITrip {
  name: string;
  destination: string;
  destLat?: number;
  destLng?: number;
  startDate: Date;
  endDate: Date;
  createdBy: Types.ObjectId;
  memberIds: Types.ObjectId[];
  status: TripStatus;
  endedAt?: Date;
  createdAt: Date;
}

const TripSchema = new Schema<ITrip>({
  name: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  destLat: { type: Number },
  destLng: { type: Number },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  memberIds: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
    default: [],
    validate: {
      validator: (ids: Types.ObjectId[]) => ids.length <= MAX_TRIP_MEMBERS,
      message: `A trip cannot have more than ${MAX_TRIP_MEMBERS} members`,
    },
  },
  status: { type: String, enum: TRIP_STATUSES, default: "active" },
  endedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const Trip = models.Trip || model<ITrip>("Trip", TripSchema);

export default Trip as mongoose.Model<ITrip>;
