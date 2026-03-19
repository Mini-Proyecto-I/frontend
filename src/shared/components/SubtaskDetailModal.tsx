import React from "react";
import { parseISO, isSameDay } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import { Badge } from "@/shared/components/badge";
import { cn } from "@/shared/utils/utils";

export interface SubtaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask: any;
  getFormattedDate?: (date: string) => string;
}

const STATUS_LABELS: Record<string, string> = {
  DONE: "Completada",
  POSTPONED: "Pospuesta",
  WAITING: "En espera",
  PENDING: "Pendiente",
};

export function SubtaskDetailModal({
  open,
  onOpenChange,
  subtask,
  getFormattedDate = (d) => d,
}: SubtaskDetailModalProps) {
  if (!subtask) return null;

  const isToday = subtask.target_date && isSameDay(parseISO(subtask.target_date), new Date());
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#111827] border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100 uppercase tracking-tight">
            Detalles de la subtarea
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 pt-2">
            Información completa de la planificación
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">
              Nombre de la tarea
            </label>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold text-white">
                {subtask.title || subtask.name}
              </p>
              {isToday && (
                <Badge className="bg-blue-600 text-white border-none text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
                  HOY
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">
                Fecha planificada
              </label>
              <div className="flex items-center gap-2.5 text-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Calendar className="size-4 text-blue-400" />
                </div>
                <span className="text-sm font-semibold">
                  {subtask.target_date ? getFormattedDate(subtask.target_date) : "Sin fecha"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">
                Dedicación estimada
              </label>
              <div className="flex items-center gap-2.5 text-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Clock className="size-4 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold">
                  {subtask.estimated_hours ? parseFloat(String(subtask.estimated_hours)).toFixed(1) : "0.0"}h
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">
              Estado actual
            </label>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none",
                  subtask.status === "DONE" ? "bg-emerald-500/20 text-emerald-400" :
                    subtask.status === "POSTPONED" ? "bg-purple-500/20 text-purple-400" :
                      "bg-blue-500/20 text-blue-400"
                )}
              >
                {STATUS_LABELS[subtask.status] || subtask.status || "Pendiente"}
              </Badge>
            </div>
          </div>

          {subtask.execution_note && (
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">
                Notas / Razón de posposición
              </label>
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "{subtask.execution_note}"
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
