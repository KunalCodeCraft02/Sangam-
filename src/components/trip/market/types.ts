export interface ShoppingRoute {
  logId: string;
  itemName: string;
  lat: number;
  lng: number;
  routeGeoJson: [number, number][];
  durationSeconds: number;
  distanceMeters: number;
}
