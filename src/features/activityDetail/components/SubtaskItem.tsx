import { useState } from "react";
import { Pencil, Trash2, Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import EditSubtaskDialog from "./EditSubtaskDialog";

interface SubtaskItemProps {
  title: string;
  date: string;
  hours: string;
  completed?: boolean;
  isActive?: boolean;
  todayBadge?: boolean;
}

export default function SubtaskItem({
  title,
  date,
  hours,
  completed = false,
  isActive = false,
  todayBadge = false,
}: SubtaskItemProps) {
  const [isChecked, setIsChecked] = useState(completed);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const borderClass = isActive
    ? "border-l-4 border-l-primary hover:border-primary/50"
    : "hover:border-primary/30";

  const handleDelete = () => {
    // Aquí iría la lógica para eliminar la subtarea
    console.log("Eliminar subtarea:", title);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleSaveEdit = (data: { nombre: string; fechaObjetivo: string; horas: string }) => {
    // Aquí iría la lógica para guardar los cambios de la subtarea
    console.log("Guardar cambios de subtarea:", data);
    // Por ahora solo actualizamos el estado local para mostrar los cambios
    // Cuando se conecte al backend, aquí se haría la llamada API
  };

  const handleSubtaskClick = (e: React.MouseEvent) => {
    // Prevenir que se abra el modal si se hace clic en el checkbox o en los botones
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('label')
    ) {
      return;
    }
    setShowDetailsDialog(true);
  };

  return (
    <>
      <article
        onClick={handleSubtaskClick}
        className={`group cursor-pointer bg-white dark:bg-[#1e2433] border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden ${borderClass}`}
      >
      <label className="checkbox-wrapper relative flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
        />
        <div className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all group-hover:border-primary ${
          isChecked 
            ? "bg-blue-600 border-blue-600" 
            : "border-slate-400 dark:border-slate-600"
        }`}>
          {isChecked && (
            <svg
              className="w-4 h-4 text-white transition-opacity pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </label>
      <div className={`flex-1 min-w-0 ${isChecked ? "line-through text-slate-500 dark:text-slate-400" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <h4 className={`font-medium truncate ${isChecked ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
            {title}
          </h4>
          {todayBadge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500 text-white uppercase shadow-sm">
              HOY
            </span>
          )}
        </div>
        <div className={`flex flex-wrap items-center gap-3 text-sm ${isChecked ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-400"}`}>
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 text-slate-400 dark:text-slate-500" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-slate-400 dark:text-slate-500" />
            <span>{hours}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleEdit}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        >
          <Pencil className="size-4" />
          <span className="text-sm font-medium">editar</span>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <Trash2 className="size-4" />
          <span className="text-sm font-medium">Eliminar</span>
        </button>
      </div>
    </article>

    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            Detalles de la subtarea
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2">
            Información completa de la subtarea
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Nombre
            </label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {title}
              </p>
              {todayBadge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-bold uppercase">
                  HOY
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                Fecha objetivo
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-slate-400 dark:text-slate-500" />
                <span className="text-base text-slate-900 dark:text-white">{date}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                Horas estimadas
              </label>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-slate-400 dark:text-slate-500" />
                <span className="text-base text-slate-900 dark:text-white">{hours}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Estado
            </label>
            <p className="text-base text-slate-900 dark:text-white mt-1">
              {isChecked ? "Completada" : "Pendiente"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <EditSubtaskDialog
      open={showEditDialog}
      onOpenChange={setShowEditDialog}
      subtaskData={{
        nombre: title,
        fechaObjetivo: date.includes("nov") ? (date.includes("10") ? "2024-11-10" : date.includes("12") ? "2024-11-12" : date.includes("14") ? "2024-11-14" : "") : "",
        horas: hours,
      }}
      onSave={handleSaveEdit}
    />
    </>
  );
}
