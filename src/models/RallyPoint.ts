import mongoose, { Schema, models, model, Types } from "mongoose";

export const RALLY_POINT_STATUSES = ["proposed", "confirmed", "cancelled"] as const;
export type RallyPointStatus = (typeof RALLY_POINT_STATUSES)[number];

export const RALLY_VOTE_CHOICES = ["yes", "no"] as const;
export type RallyVoteChoice = (typeof RALLY_VOTE_CHOICES)[number];

export interface IRallyPointVote {
  userId: Types.ObjectId;
  vote: RallyVoteChoice;
  votedAt: Date;
}

export interface IRallyPointEta {
  userId: Types.ObjectId;
  userName: string;
  durationSeconds: number;
  distanceMeters: number;
  routeGeoJson: [number, number][];
}

export interface IRallyPoint {
  tripId: Types.ObjectId;
  proposedBy: Types.ObjectId;
  proposedByName: string;
  lat: number;
  lng: number;
  meetTimeLabel: string;
  status: RallyPointStatus;
  votes: IRallyPointVote[];
  etas: IRallyPointEta[];
  createdAt: Date;
  confirmedAt?: Date;
}

const RallyPointVoteSchema = new Schema<IRallyPointVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vote: { type: String, enum: RALLY_VOTE_CHOICES, required: true },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RallyPointEtaSchema = new Schema<IRallyPointEta>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    distanceMeters: { type: Number, required: true },
    routeGeoJson: { type: [[Number]], default: [] },
  },
  { _id: false }
);

const RallyPointSchema = new Schema<IRallyPoint>({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
  proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  proposedByName: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  meetTimeLabel: { type: String, required: true },
  status: { type: String, enum: RALLY_POINT_STATUSES, default: "proposed" },
  votes: { type: [RallyPointVoteSchema], default: [] },
  etas: { type: [RallyPointEtaSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
});

const RallyPoint =
  models.RallyPoint || model<IRallyPoint>("RallyPoint", RallyPointSchema, "rallypoints");

export default RallyPoint as mongoose.Model<IRallyPoint>;
