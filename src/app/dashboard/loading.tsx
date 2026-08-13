import LoadingOverlay from "@/components/LoadingOverlay";

const DASHBOARD_LOADING_MESSAGES = ["Finding your trips...", "Syncing your crew..."];

export default function DashboardLoading() {
  return <LoadingOverlay visible messages={DASHBOARD_LOADING_MESSAGES} />;
}
