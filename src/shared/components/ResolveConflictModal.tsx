import React from "react";
import { AlertCircle, X, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/shared/components/button";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import { useEffect, useRef } from "react";
import { formatStudyHours, normalizeHalfHourStep } from "@/shared/utils/studyLimitFormat";

export interface ResolveConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;

  // Conflict state
  conflictedCount?: number;
  conflictedTasks?: any[];
  selectedConflictId?: string | null;
  onSelectConflictId?: (id: string) => void;
  selectedConflict: any;

  // Day stats (optional)
  dateFormatted?: string;
  dayLabel?: string;
  usedHours?: number;
  limitHours?: number;
  overworkHours?: number;

  // Reduce action
  reduceHours: string;
  setReduceHours: (val: string) => void;
  isReducing: boolean;
  reduceError: string;
  onReduceConfirm: () => void;

  // Move action
  onMoveTask: () => void;
}

export function ResolveConflictModal({
  isOpen,
  onClose,
  isLoading = false,
  conflictedCount = 1,
  conflictedTasks = [],
  selectedConflictId,
  onSelectConflictId,
  selectedConflict,
  dateFormatted,
  dayLabel,
  usedHours,
  limitHours = 6,
  overworkHours,
  reduceHours,
  setReduceHours,
  isReducing,
  reduceError,
  onReduceConfirm,
  onMoveTask,
}: ResolveConflictModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const maxReducibleHours = Math.max(0.5, parseFloat(String(selectedConflict?.estimated_hours ?? 0)) || 0.5);
  const parsedReduceHours = parseFloat(String(reduceHours));
  const normalizedReduceHours = Number.isFinite(parsedReduceHours)
    ? normalizeHalfHourStep(parsedReduceHours, 0.5, maxReducibleHours)
    : normalizeHalfHourStep(maxReducibleHours, 0.5, maxReducibleHours);

  const handleAdjustReduceHours = (delta: number) => {
    const next = normalizeHalfHourStep(normalizedReduceHours + delta, 0.5, maxReducibleHours);
    setReduceHours(String(next));
  };

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !selectedConflict) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div 
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Resolución de conflicto"
      className="relative w-full max-w-[560px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="p-6 sm:p-7 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Conflictos sin resolver
              </h3>
              <p className="text-slate-400 text-base mt-1.5 leading-relaxed">
                {conflictedCount > 1 ? (
                  <>
                    Tienes todavía{" "}
                    <span className="text-white font-semibold">{conflictedCount}</span>{" "}
                    tareas en conflicto. Puedes resolverlo moviendo la tarea o reduciendo sus horas.
                  </>
                ) : (
                  <>
                    Tienes una tarea en conflicto. Puedes resolverlo moviendo la tarea o reduciendo sus horas.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Selector de tarea */}
            {conflictedCount > 1 && conflictedTasks.length > 0 && onSelectConflictId && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Seleccionar tarea
                </label>
                <div className="relative">
                  <select
                    value={String(selectedConflictId ?? selectedConflict.id)}
                    onChange={(e) => onSelectConflictId(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#1F2937]/60 border border-slate-700/60 text-slate-200 text-base font-medium pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 cursor-pointer appearance-none"
                  >
                    {conflictedTasks.map((t: any) => (
                      <option key={t.id} value={String(t.id)}>
                        {(t.activity?.title || t.course || "Actividad") + " — " + t.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Info de la tarea seleccionada */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-lg font-bold text-white leading-snug mb-2">
                {selectedConflict.title || selectedConflict.name}
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-slate-300">
                <span>
                  <span className="text-slate-500 font-medium">Actividad:</span>{" "}
                  <span className="font-semibold text-slate-200">{selectedConflict.activity?.title || selectedConflict.course || "Actividad"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-200">
                    {formatStudyHours(parseFloat(String(selectedConflict.estimated_hours ?? 0)))}
                  </span>
                </span>
              </div>
            </div>

            {/* Resumen del día (opcional si se pasan los datos) */}
            {usedHours !== undefined && limitHours !== undefined && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Resumen del día</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-0.5">Fecha</p>
                    <p className="text-lg font-bold text-white capitalize">{dateFormatted || "—"}</p>
                    {dayLabel && !dayLabel.startsWith("HACE") && (
                      <p className="text-sm text-slate-500 mt-1">{dayLabel}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-0.5">Horas usadas / Límite</p>
                    <p className="text-lg font-bold text-amber-400">
                      {formatStudyHours(usedHours)} / {formatStudyHours(limitHours)}
                    </p>
                  </div>
                  {overworkHours !== undefined && overworkHours > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-slate-500 text-sm font-medium mb-0.5">Sobretrabajo</p>
                      <p className="text-base font-bold text-amber-500">
                        +{formatStudyHours(overworkHours)} sobre el límite
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reducir horas */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block mb-3">
                <span className="inline-flex items-center gap-2">
                  <span>Reestablecer nueva estimación de horas</span>
                  <InfoTooltip text="Con esto cambias la estimación de horas de tu tarea a una nueva. Las horas deben ser menores a las actuales y mayores a 30 min." />
                </span>
              </label>

              <div className="flex gap-3 items-center flex-wrap">
                <Button
                  type="button"
                  onClick={() => handleAdjustReduceHours(-0.5)}
                  disabled={isReducing || normalizedReduceHours <= 0.5}
                  className="h-12 w-12 p-0 rounded-xl bg-[#1F2937]/60 border border-slate-700/60 text-slate-200 hover:bg-[#334155]/60 disabled:opacity-50"
                >
                  -
                </Button>
                <div className="h-12 min-w-[120px] px-4 rounded-xl bg-[#1F2937]/60 border border-slate-700/60 text-slate-100 font-bold text-base flex items-center justify-center">
                  {formatStudyHours(normalizedReduceHours)}
                </div>
                <Button
                  type="button"
                  onClick={() => handleAdjustReduceHours(0.5)}
                  disabled={isReducing || normalizedReduceHours >= maxReducibleHours}
                  className="h-12 w-12 p-0 rounded-xl bg-[#1F2937]/60 border border-slate-700/60 text-slate-200 hover:bg-[#334155]/60 disabled:opacity-50"
                >
                  +
                </Button>
                <Button
                  onClick={onReduceConfirm}
                  disabled={isReducing}
                  className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 text-base"
                >
                  Establecer
                </Button>
              </div>
              {reduceError && (
                <p className="text-amber-500 text-sm font-semibold mt-2">
                  {reduceError}
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                onClick={onMoveTask}
                className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-lg shadow-blue-600/20 text-base"
              >
                Mover tarea
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-700/60 text-slate-200 font-bold text-base"
              >
                Más tarde
              </Button>
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px]" />
        )}
      </div>
    </div>
  );
}
