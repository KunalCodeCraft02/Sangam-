import mongoose, { Schema, models, model, Types } from "mongoose";

export const POLL_DURATION_MS = 10 * 60 * 1000;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 3;

export const TRAFFIC_LIGHTS = ["green", "yellow", "red"] as const;
export type TrafficLight = (typeof TRAFFIC_LIGHTS)[number];

export interface IPollOption {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  cuisine?: string;
  score: number;
  light: TrafficLight;
  reasons: string[];
}

export interface IPollVote {
  userId: Types.ObjectId;
  osmId: string;
  votedAt: Date;
}

export interface IPollVeto {
  userId: Types.ObjectId;
  osmId: string;
  vetoedAt: Date;
}

export interface IPoll {
  tripId: Types.ObjectId;
  createdBy: Types.ObjectId;
  options: IPollOption[];
  votes: IPollVote[];
  vetoes: IPollVeto[];
  status: "open" | "closed";
  createdAt: Date;
  closesAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>(
  {
    osmId: { type: String, required: true },
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    cuisine: { type: String },
    score: { type: Number, required: true },
    light: { type: String, enum: TRAFFIC_LIGHTS, required: true },
    reasons: { type: [String], default: [] },
  },
  { _id: false }
);

const PollVoteSchema = new Schema<IPollVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    osmId: { type: String, required: true },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PollVetoSchema = new Schema<IPollVeto>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    osmId: { type: String, required: true },
    vetoedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>({
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  options: {
    type: [PollOptionSchema],
    validate: {
      validator: (opts: IPollOption[]) =>
        opts.length >= MIN_POLL_OPTIONS && opts.length <= MAX_POLL_OPTIONS,
      message: `A poll must have between ${MIN_POLL_OPTIONS} and ${MAX_POLL_OPTIONS} options`,
    },
  },
  votes: { type: [PollVoteSchema], default: [] },
  vetoes: { type: [PollVetoSchema], default: [] },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  createdAt: { type: Date, default: Date.now },
  closesAt: { type: Date, required: true },
});

const Poll = models.Poll || model<IPoll>("Poll", PollSchema);

export default Poll as mongoose.Model<IPoll>;
