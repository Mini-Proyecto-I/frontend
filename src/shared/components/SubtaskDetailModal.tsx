import React, { useState } from "react";
import { parseISO, isSameDay } from "date-fns";
import { Calendar, Clock, History, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import { Badge } from "@/shared/components/badge";
import { cn } from "@/shared/utils/utils";
import { TaskHistoryModal } from "./TaskHistoryModal";

export interface SubtaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask: any;
  getFormattedDate?: (date: string) => string;
  onEdit?: (subtask: any) => void;
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
  onEdit,
}: SubtaskDetailModalProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySubtaskId, setHistorySubtaskId] = useState<string | null>(null);
  const [historyTaskTitle, setHistoryTaskTitle] = useState("");

  const handleShowHistory = (subtaskId: string, title: string) => {
    setHistorySubtaskId(subtaskId);
    setHistoryTaskTitle(title);
    setIsHistoryModalOpen(true);
  };

  if (!subtask) return null;

  const isToday = subtask.target_date && isSameDay(parseISO(subtask.target_date), new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#111827] border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white text-slate-100 tracking-tight">
            Detalles de la Tarea
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleShowHistory(subtask.id, subtask.title || subtask.name)}
              className="p-2 px-4 rounded-xl text-slate-400 hover:text-blue-400 bg-slate-800/20 hover:bg-blue-500/10 transition-all group cursor-pointer border border-slate-800/60 hover:border-blue-500/20 shadow-sm"
              title="Ver historial de la tarea"
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-semibold">Ver historial</span>
              </div>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(subtask);
                }}
                className="p-2 px-4 rounded-xl text-slate-400 hover:text-emerald-400 bg-slate-800/20 hover:bg-emerald-500/10 transition-all group cursor-pointer border border-slate-800/60 hover:border-emerald-500/20 shadow-sm"
                title="Editar tarea"
              >
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
                  <span className="text-sm font-semibold">Editar</span>
                </div>
              </button>
            )}
          </div>

          <TaskHistoryModal
            open={isHistoryModalOpen}
            onOpenChange={setIsHistoryModalOpen}
            subtaskId={historySubtaskId}
            taskTitle={historyTaskTitle}
          />

        </div>
      </DialogContent>
    </Dialog>
  );
}
