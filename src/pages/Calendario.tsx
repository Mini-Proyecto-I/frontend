import { Link } from "react-router-dom";
import { Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/button";

export default function Calendario() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full px-4 text-center">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full transform scale-150" />
        <div className="relative w-32 h-32 bg-[#111827] border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/40 flex items-center justify-center">
          <Calendar className="w-16 h-16 text-blue-500" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
        Calendario <span className="text-blue-400">en construcción</span>
      </h1>
      <p className="text-slate-400 text-lg max-w-md mb-10">
        Aquí podrás reprogramar tus tareas y ver tu plan de estudio en un calendario. Estamos trabajando en ello.
      </p>

      <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">
        <Link to="/hoy" className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver a Hoy
        </Link>
      </Button>
    </div>
  );
}
