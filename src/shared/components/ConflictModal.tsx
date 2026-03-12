import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

interface ConflictTask {
  nombre: string;
  horas: number;
  fecha: string;
}

interface ConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Para una sola tarea (caso de editar subtarea)
  singleTask?: {
    nombre: string;
    horasAntiguas: number;
    horasIntentadas: number;
    horasOcupadas: number;
    limiteDiario: number;
    fecha: string;
  };
  // Para múltiples tareas (caso de crear subtareas)
  multipleTasks?: {
    tasks: ConflictTask[];
    limiteDiario: number;
    horasOcupadasPorFecha: Record<string, number>;
  };
  onReajustar?: () => void;
}

const formatearFecha = (fechaStr: string): string => {
  if (!fechaStr) return "sin fecha";
  try {
    const fecha = new Date(fechaStr + 'T00:00:00');
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return fecha.toLocaleDateString('es-ES', opciones);
  } catch {
    return fechaStr;
  }
};

export default function ConflictModal({
  open,
  onOpenChange,
  singleTask,
  multipleTasks,
  onReajustar,
}: ConflictModalProps) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const isMultiple = !!multipleTasks;
  const limiteDiario = singleTask?.limiteDiario || multipleTasks?.limiteDiario || 6;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[560px] bg-[#111827] border border-[#F59E0B]/30 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="p-6 sm:p-7 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div className="pr-8">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Conflicto de horas detectado
              </h3>
            </div>
          </div>

          {isMultiple ? (
            // Caso de múltiples tareas
            <>
              <p className="mt-6 text-sm text-slate-300 leading-relaxed">
                Las siguientes tareas tiene un conflicto y no pueden ser añadidas porque exceden el limite de horas de estudio.
              </p>

               <div className="mt-6 space-y-4 max-h-[280px] overflow-y-auto pr-2 scrollbar-gray">
                {(() => {
                  // Agrupar tareas por fecha
                  const tasksByDate: Record<string, ConflictTask[]> = {};
                  multipleTasks.tasks.forEach(task => {
                    const fecha = task.fecha || "sin fecha";
                    if (!tasksByDate[fecha]) {
                      tasksByDate[fecha] = [];
                    }
                    tasksByDate[fecha].push(task);
                  });

                  return Object.entries(tasksByDate).map(([fecha, tasks]) => {
                    const horasOcupadas = multipleTasks.horasOcupadasPorFecha[fecha] || 0;
                    const exceso = Math.max(0, horasOcupadas - limiteDiario);

                    return (
                      <div key={fecha} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="mb-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-white">
                              {formatearFecha(fecha)}
                            </p>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-red-400 font-black">
                                +{exceso.toFixed(1)}h
                              </span>
                              <span className="text-slate-400">/</span>
                              <span className="text-white font-bold">
                                {limiteDiario.toFixed(1)}h
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {tasks.map((task, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-slate-300 truncate">
                                  {task.nombre}
                                </span>
                                <span className="text-slate-400 shrink-0">
                                  {task.horas.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            // Caso de una sola tarea
            <>
              <p className="mt-6 text-sm text-slate-300 leading-relaxed">
                {singleTask?.horasAntiguas && singleTask.horasAntiguas > 0 ? (
                  <>
                    No pudimos actualizar{" "}
                    <span className="font-semibold text-white">"{singleTask?.nombre}"</span> de{" "}
                    <span className="font-semibold text-white">{singleTask.horasAntiguas.toFixed(1)}h</span> a{" "}
                    <span className="font-semibold text-white">{singleTask.horasIntentadas.toFixed(1)}h</span> porque ese día se superaría tu límite de horas de estudio.
                  </>
                ) : (
                  <>
                    No pudimos agregar{" "}
                    <span className="font-semibold text-white">"{singleTask?.nombre}"</span> de{" "}
                    <span className="font-semibold text-white">{singleTask?.horasIntentadas.toFixed(1)}h</span> porque ese día se superaría tu límite de horas de estudio.
                  </>
                )}
              </p>

              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-red-400">
                    {singleTask?.horasOcupadas.toFixed(1)}h
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-xl font-bold text-slate-300">
                    {limiteDiario.toFixed(1)}h
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Horas resultantes / Límite diario de estudio
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {onReajustar && (
              <button
                onClick={() => {
                  onReajustar();
                  onOpenChange(false);
                }}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all"
              >
                Reajustar
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className={`h-11 rounded-xl bg-white hover:bg-slate-100 text-blue-600 font-bold border border-slate-200 transition-all ${onReajustar ? 'flex-1' : 'w-full'}`}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
