import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

type CreateSuccessState = {
  activityId?: string;
  title?: string;
  courseId?: string | null;
};

export default function CreateSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as CreateSuccessState;

  const title = state.title ?? "Actividad";

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-[#1E293B] p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500/15 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              Actividad creada exitosamente
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Se creó <span className="text-foreground font-medium">"{title}"</span>.
            </p>
            {state.activityId && (
              <p className="text-xs text-muted-foreground mt-1">
                ID: <span className="font-mono">{state.activityId}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          {state.activityId && (
            <button
              type="button"
              onClick={() => navigate(`/actividad/${state.activityId}`)}
              className="px-5 py-2.5 rounded-lg bg-[#111827] border border-border text-foreground text-sm font-medium hover:bg-[#111827]/80 transition-colors"
            >
              Ver detalle
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/hoy")}
            className="px-5 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors"
          >
            Volver a Hoy
          </button>
        </div>
      </div>
    </div>
  );
}

