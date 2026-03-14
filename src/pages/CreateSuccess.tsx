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
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 shadow-inner border border-blue-500/20">
            <CheckCircle2 className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            ¡Actividad creada exitosamente!
          </h1>
          <p className="text-base text-slate-400 mt-3 max-w-sm mx-auto">
            Ya hemos preparado <span className="text-white font-bold">"{title}"</span> en tu calendario y subtareas.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center w-full">
          {state.activityId && (
            <button
              type="button"
              onClick={() => navigate(`/actividad/${state.activityId}`)}
              className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 text-sm font-bold hover:bg-slate-700/50 hover:text-white transition-all w-full sm:w-auto"
            >
              Ver detalle
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/hoy")}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl transition-all w-full sm:w-auto"
          >
            Ir a mi panel de Hoy
          </button>
        </div>
      </div>
    </div>
  );
}

