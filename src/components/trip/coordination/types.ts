export interface SosFeedItem {
  type: "sos";
  id: string;
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  resolved: boolean;
  createdAt: string;
}

export interface RallyEta {
  userId: string;
  userName: string;
  durationSeconds: number;
  distanceMeters: number;
  routeGeoJson: [number, number][];
}

export interface RallyFeedItem {
  type: "rally";
  id: string;
  tripId: string;
  proposedBy: string;
  proposedByName: string;
  lat: number;
  lng: number;
  meetTimeLabel: string;
  status: "proposed" | "confirmed" | "cancelled";
  yesVotes: number;
  noVotes: number;
  myVote: "yes" | "no" | null;
  createdAt: string;
  confirmedAt: string | null;
  etas: RallyEta[];
}

export type GroupFeedItem = SosFeedItem | RallyFeedItem;
