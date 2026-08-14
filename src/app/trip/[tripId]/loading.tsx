import LoadingOverlay from "@/components/LoadingOverlay";

const TRIP_LOADING_MESSAGES = ["Loading your trip...", "Getting the crew together..."];

export default function TripLoading() {
  return <LoadingOverlay visible messages={TRIP_LOADING_MESSAGES} />;
}
