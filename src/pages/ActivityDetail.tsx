import { useParams } from "react-router-dom";
import { ActivityDetailView } from "@/features/activityDetail";

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();

  return <ActivityDetailView activityId={id} />;
}
