import { useParams } from "react-router-dom";

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="text-2xl font-bold">Detalle de actividad</h1>
      <p className="text-muted-foreground mt-1">
        Actividad ID: {id || "—"} (en desarrollo).
      </p>
    </div>
  );
}
