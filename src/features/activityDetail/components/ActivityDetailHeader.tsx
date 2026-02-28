import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
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
  return (
    <>
      <ToastComponent />
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {typeLabel}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">
            {dueDate}
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl">{description}</p>
      </div>

      <div className="flex flex-row gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowEditDialog(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 border-2 border-slate-500 hover:border-slate-400 text-white transition-all duration-200 ease-out text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Pencil className="size-4" />
          Editar Actividad
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 border-2 border-red-500 hover:border-red-400 text-white font-semibold text-sm shadow-lg shadow-red-900/40 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
        >
          <Trash2 className="size-4" />
          Eliminar Actividad
        </button>
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
        onActivityUpdated={onActivityUpdated}
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
    </div>
    </>
  );
}
