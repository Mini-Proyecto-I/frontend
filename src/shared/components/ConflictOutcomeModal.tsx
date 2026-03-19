import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/button";

export interface ConflictOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  outcome: any; // The { resolved, dateKey, availableHours, overworkHours, limitHours } object
  source: "reduce" | "move" | null;
  onContinueResolving: () => void;
  // Day Formatting helpers
  getRelativeDateLabel: (date: string) => string;
  getFormattedDate: (date: string) => string;
}

export function ConflictOutcomeModal({
  isOpen,
  onClose,
  outcome,
  source,
  onContinueResolving,
  getRelativeDateLabel,
  getFormattedDate,
}: ConflictOutcomeModalProps) {
  if (!isOpen || !outcome) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-[440px] bg-[#111827] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden border ${
          outcome.resolved ? "border-emerald-500/30" : "border-[#F59E0B]/30"
        }`}
      >
        <div className="p-6 sm:p-7 text-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border ${
              outcome.resolved
                ? "bg-emerald-500/20 border-emerald-500/30"
                : "bg-[#F59E0B]/10 border-[#F59E0B]/25"
            }`}
          >
            {outcome.resolved ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2} />
            ) : (
              <AlertCircle className="w-8 h-8 text-[#F59E0B]" strokeWidth={2} />
            )}
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {outcome.resolved
              ? "Conflicto solucionado"
              : source === "reduce"
              ? "Horas actualizadas, pero sigue el conflicto"
              : "Aún hay conflicto"}
          </h3>

          <p className="text-slate-400 text-base mt-3 leading-relaxed">
            {outcome.resolved ? (
              <>
                {(() => {
                  const todayKey = new Date().toISOString().slice(0, 10);
                  const isToday = outcome.dateKey === todayKey;
                  const label = getRelativeDateLabel(outcome.dateKey);
                  const fullDate = getFormattedDate(outcome.dateKey);
                  return (
                    <>
                      {isToday ? (
                        <>
                          El conflicto de{" "}
                          <span className="text-white font-bold">{label}</span>{" "}
                          fue solucionado. Te quedan{" "}
                        </>
                      ) : (
                        <>
                          Para el día{" "}
                          <span className="text-white font-bold">
                            {fullDate || outcome.dateKey}
                          </span>{" "}
                          el conflicto fue solucionado. Te quedan{" "}
                        </>
                      )}
                      <span className="text-emerald-300 font-extrabold">
                        {outcome.availableHours % 1 === 0
                          ? outcome.availableHours
                          : outcome.availableHours.toFixed(1)}
                        h
                      </span>{" "}
                      disponibles.
                    </>
                  );
                })()}
              </>
            ) : source === "reduce" ? (
              <>
                Se redujeron las horas de la tarea, pero el día{" "}
                <span className="text-white font-bold">
                  {getRelativeDateLabel(outcome.dateKey)}
                </span>{" "}
                sigue en conflicto. Puedes seguir ajustando esta u otras tareas para resolverlo.
              </>
            ) : (
              <>
                El día{" "}
                <span className="text-white font-bold">
                  {getRelativeDateLabel(outcome.dateKey)}
                </span>{" "}
                sigue sobrecargado. Hay un sobretrabajo de{" "}
                <span className="text-[#F59E0B] font-extrabold">
                  {outcome.overworkHours % 1 === 0
                    ? outcome.overworkHours
                    : outcome.overworkHours.toFixed(1)}
                  h
                </span>{" "}
                sobre tu límite de{" "}
                <span className="text-slate-200 font-bold">
                  {outcome.limitHours}h
                </span>
                .
              </>
            )}
          </p>

          {outcome.resolved || source !== "reduce" ? (
            <Button
              onClick={onClose}
              className="mt-6 w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 text-base"
            >
              Entendido
            </Button>
          ) : (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onContinueResolving}
                className="h-12 flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-lg shadow-blue-600/20 text-base"
              >
                Seguir resolviendo
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-700/60 text-slate-200 font-bold text-base"
              >
                Más tarde
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
