import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/card";

interface OverloadAlertProps {
  totalHours: number;
  dailyLimit: number;
}

export const OverloadAlert = ({ totalHours, dailyLimit }: OverloadAlertProps) => {
  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Límite diario excedido</p>
          <p className="text-sm text-muted-foreground mt-1">
            Has planificado <strong className="text-foreground">{totalHours.toFixed(1)}h</strong> de estudio hoy, pero tu límite diario es{' '}
            <strong className="text-foreground">{dailyLimit}h</strong>. Considera reprogramar algunas tareas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
