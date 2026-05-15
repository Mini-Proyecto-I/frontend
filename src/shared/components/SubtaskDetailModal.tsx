import React, { useState, useEffect } from "react";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { parseISO, isSameDay } from "date-fns";
import { Calendar, Clock, History, Pencil, AlertCircle, CalendarRange, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import { Badge } from "@/shared/components/badge";
import { Button } from "@/shared/components/button";
import { cn } from "@/shared/utils/utils";
import { TaskHistoryModal } from "./TaskHistoryModal";
import { Separator } from "@/shared/components/separator";

export interface SubtaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask: any;
  getFormattedDate?: (date: string) => string;
  onEdit?: (subtask: any) => void;
  onReprogram?: (subtask: any) => void;
  onPostpone?: (subtask: any) => void;
  onDelete?: (subtask: any) => void | Promise<void>;
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
  onReprogram,
  onPostpone,
  onDelete,
}: SubtaskDetailModalProps) {
  const navigate = useNavigate();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySubtaskId, setHistorySubtaskId] = useState<string | null>(null);
  const [historyTaskTitle, setHistoryTaskTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowDeleteDialog(false);
    }
  }, [open]);

  const handleShowHistory = (subtaskId: string, title: string) => {
    setHistorySubtaskId(subtaskId);
    setHistoryTaskTitle(title);
    setIsHistoryModalOpen(true);
  };

  if (!subtask) return null;

  const isToday = subtask.target_date && isSameDay(parseISO(subtask.target_date), new Date());
  const subtaskName = subtask.title || subtask.name;

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    await onDelete(subtask);
  };

  const handleDeleteDialogOpenChange = (next: boolean) => {
    setShowDeleteDialog(next);
    if (!next) {
      onOpenChange(false);
    }
  };

  return (
    <>
    <Dialog open={open && !showDeleteDialog} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#111827] border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {subtask.title || subtask.name}
            </DialogTitle>
            {isToday && (
              <Badge className="bg-blue-600 text-white border-none text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
                HOY
              </Badge>
            )}
          </div>
          <DialogDescription className="sr-only">
            Detalles de la subtarea
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-2">

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

          {(subtask.posponed_note || subtask.execution_note || subtask.note) && (
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 group hover:border-purple-500/30 transition-all shadow-sm">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {subtask.status === "POSTPONED" ? "Motivo de la posposición" : "Nota / Observación"}
              </label>
              <div className="relative pl-3 border-l border-purple-500/20">
                <p className="text-[13px] text-slate-300 italic leading-relaxed">
                  "{subtask.posponed_note || subtask.execution_note || subtask.note}"
                </p>
              </div>
            </div>
          )}

          <Separator className="bg-slate-800/60" />

          {/* Activity Info */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 group hover:border-blue-500/30 transition-all cursor-pointer"
            onClick={() => {
              if (subtask.activity?.id) {
                onOpenChange(false);
                navigate(`/actividad/${subtask.activity.id}`);
              }
            }}>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] block mb-1">
                  Actividad principal
                </label>
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {subtask.activity?.title || "Actividad"}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {subtask.activity?.course?.name || "Sin curso asignado"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-800/60" />

          {/* Centralized Actions */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">
              Acciones de tarea
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit?.(subtask);
                }}
                className="h-11 rounded-xl border-slate-800 bg-slate-800/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <Pencil className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
                <span className="font-bold">Editar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReprogram?.(subtask);
                }}
                className="h-11 rounded-xl border-slate-800 bg-slate-800/20 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <CalendarRange className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Reprogramar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onPostpone?.(subtask);
                }}
                className="h-11 rounded-xl border-slate-800 bg-slate-800/20 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30 transition-all flex items-center justify-center gap-2 group"
                disabled={subtask.status === "DONE"}
              >
                <Clock className="w-4 h-4 group-hover:animate-pulse transition-transform" />
                <span className="font-bold">Posponer</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={!onDelete}
                className="h-11 rounded-xl border-slate-800 bg-slate-800/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="font-bold">Eliminar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShowHistory(subtask.id, subtask.title || subtask.name)}
                className="h-11 rounded-xl border-slate-800 bg-slate-800/20 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 col-span-2 group"
              >
                <History className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="font-bold">Ver historial completo</span>
              </Button>
            </div>
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

    <DeleteConfirmationDialog
      open={showDeleteDialog}
      onOpenChange={handleDeleteDialogOpenChange}
      onConfirm={handleConfirmDelete}
      itemName={subtaskName}
    />
    </>
  );
}
