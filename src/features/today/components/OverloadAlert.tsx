import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/card";

interface OverloadAlertProps {
  totalHours: number;
  dailyLimit: number;
  conflictedCount?: number;
}

export const OverloadAlert = ({ totalHours, dailyLimit, conflictedCount }: OverloadAlertProps) => {
  const isOverloaded = totalHours > dailyLimit;
  const count = conflictedCount ?? 0;
  return (
    <Card className="border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 via-orange-500/10 to-red-500/10 shadow-lg shadow-yellow-500/10">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-orange-500">
            {isOverloaded ? "Límite diario excedido" : "Conflicto de planificación detectado"}
          </p>
          <p className="text-sm text-slate-300/90 mt-1">
            {isOverloaded ? (
              <>
                Has planificado{" "}
                <strong className="text-white">{totalHours.toFixed(1)}h</strong> de estudio hoy, pero tu límite diario es{" "}
                <strong className="text-white">{dailyLimit}h</strong>. Considera reprogramar algunas tareas.
              </>
            ) : (
              <>
                Se detectaron{" "}
                <strong className="text-white">{count}</strong>{" "}
                {count === 1 ? "tarea en conflicto" : "tareas en conflicto"}. Considera reprogramarlas para mantener un plan realista.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
