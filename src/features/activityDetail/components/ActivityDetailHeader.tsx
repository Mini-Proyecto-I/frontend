import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, BookOpen, Calendar, Clock, AlertCircle } from "lucide-react";
import EditActivityDialog from "./EditActivityDialog";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import DeletingDialog from "./DeletingDialog";
import { deleteActivity } from "@/api/services/activity";
import { useToast } from "@/shared/components/toast";

interface ActivityDetailHeaderProps {
  activityId?: string;
  typeLabel?: string;
  dueDate?: string;
  title?: string;
  description?: string;
  courseId?: string;
  courseName?: string;
  eventDate?: string;
  deadlineDate?: string;
  subtasks?: Array<{
    id: number;
    nombre: string;
    fechaObjetivo: string;
    horas: string;
  }>;
  onActivityUpdated?: () => void;
}


export default function ActivityDetailHeader({
  activityId,
  typeLabel = "Examen parcial",
  dueDate = "Entrega 15 nov",
  title = "Examen de Cálculo",
  description = "Evaluación que cubre límites, derivadas e integrales. Representa el 30% de la nota final del curso.",
  courseId,
  courseName,
  eventDate,
  deadlineDate,
  subtasks,
  onActivityUpdated,
}: ActivityDetailHeaderProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeletingDialog, setShowDeletingDialog] = useState(false);
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!activityId) {
      showToast("Error: ID de actividad no disponible.", "error");
      return;
    }

    setShowDeleteDialog(false);
    setShowDeletingDialog(true);

    try {
      // Llamar al backend para eliminar la actividad
      await deleteActivity(activityId);

      // Cerrar el modal de carga después de un breve delay
      setTimeout(() => {
        setShowDeletingDialog(false);

        // Redirigir a /hoy con el estado para mostrar el modal de éxito
        navigate("/hoy", {
          state: {
            showActivityDeletedSuccess: true,
            deletedActivityName: title
          },
        });
      }, 1500);
    } catch (error: any) {
      console.error("Error al eliminar actividad:", error);

      setShowDeletingDialog(false);

      let errorMessage = "Error al eliminar la actividad. Intenta de nuevo.";

      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, "error");
    }
  };

  const handleActivityUpdated = () => {
    // Aquí puedes recargar los datos de la actividad
    // Por ahora, simplemente cerramos el diálogo y mostramos un mensaje
    setShowEditDialog(false);
    showToast("Actividad actualizada correctamente", "success");

    // Si necesitas recargar los datos, puedes hacer una llamada a la API
    // o usar el onActivityUpdated del padre si existe
    if (onActivityUpdated) {
      onActivityUpdated();
    }
  };

  const formatSimpleDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      // Usar T12:00:00 para evitar desajustes de zona horaria al parsear YYYY-MM-DD
      const date = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
      const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <ToastComponent />
      <div className="flex flex-col gap-6">

        {/* Top row: Badges and Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
              {typeLabel}
            </span>
            <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">
              {dueDate.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-row gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEditDialog(true)}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-all duration-200 ease-out text-sm font-semibold shadow-md active:scale-[0.98]"
            >
              <Pencil className="w-4 h-4" />
              Editar Detalles
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 text-red-500 font-semibold text-sm transition-all duration-200 ease-out active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Actividad
            </button>
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1E293B] dark:text-white tracking-tight">
            {title}
          </h1>

          <div className="flex flex-wrap gap-y-3 gap-x-6 py-1">
            {courseName && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold tracking-tight">{courseName}</span>
              </div>
            )}

            {eventDate && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Fecha Actividad</span>
                  <span className="text-sm font-bold tracking-tight">
                    {formatSimpleDate(eventDate)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Fecha Límite</span>
                <span className="text-sm font-bold tracking-tight">{formatSimpleDate(deadlineDate)}</span>
              </div>
            </div>
          </div>

          <p className="text-slate-500 dark:text-slate-400 max-w-3xl text-lg font-medium leading-relaxed pt-2">
            {description}
          </p>
        </div>

      </div>

      <EditActivityDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        activityId={activityId}
        activityData={{
          title,
          typeLabel,
          dueDate: deadlineDate || dueDate,
          description,
          courseId,
          courseName,
          eventDate,
          subtasks: subtasks || [],
        }}
        onActivityUpdated={handleActivityUpdated}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={title}
        isActivity
      />

      <DeletingDialog
        open={showDeletingDialog}
        onOpenChange={setShowDeletingDialog}
        targetLabel="actividad"
      />
    </>
  );
}
