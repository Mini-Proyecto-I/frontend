import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import EditSubtaskDialog from "./EditSubtaskDialog";
import { patchSubtask, updateSubtask } from "@/api/services/subtack";
import { useToast } from "@/shared/components/toast";

interface SubtaskItemProps {
  id: string;
  activityId: string;
  title: string;
  date: string;
  dateOriginal?: string; // Fecha original en formato YYYY-MM-DD para el modal de edición
  hours: string;
  completed?: boolean;
  isActive?: boolean;
  todayBadge?: boolean;
  onStatusChange?: (subtaskId: string, newStatus: boolean) => void; // Callback con ID y nuevo estado para actualización optimista
  onSubtaskUpdated?: () => void; // Callback para refrescar todas las subtareas después de editar
}

export default function SubtaskItem({
  id,
  activityId,
  title,
  date,
  dateOriginal,
  hours,
  completed = false,
  isActive = false,
  todayBadge = false,
  onStatusChange,
  onSubtaskUpdated,
}: SubtaskItemProps) {
  const [isChecked, setIsChecked] = useState(completed);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const localChangeRef = useRef(false); // Ref para rastrear si el cambio fue iniciado localmente
  const lastLocalStateRef = useRef<boolean | null>(null); // Ref para rastrear el último estado establecido localmente
  
  const borderClass = isActive
    ? "border-l-4 border-l-primary hover:border-primary/50"
    : "hover:border-primary/30";

  // Sincronizar el estado del checkbox cuando cambie el prop completed
  // Solo si el cambio NO fue iniciado localmente y el estado es diferente
  useEffect(() => {
    // Si el cambio no fue iniciado localmente, sincronizar con el prop
    if (!localChangeRef.current) {
      setIsChecked(completed);
      lastLocalStateRef.current = null; // Resetear el ref cuando recibimos datos del backend
    }
  }, [completed]);

  const handleCheckChange = async (checked: boolean) => {
    // Actualización optimista: cambiar el estado visual inmediatamente
    const previousChecked = isChecked;
    localChangeRef.current = true; // Marcar que el cambio fue iniciado localmente
    lastLocalStateRef.current = checked; // Guardar el estado local
    setIsChecked(checked);
    setIsUpdating(true);
    
    // Notificar al padre inmediatamente para actualizar gráfico y estado
    if (onStatusChange) {
      onStatusChange(id, checked);
    }
    
    // Actualizar en segundo plano sin bloquear la UI
    patchSubtask(activityId, id, { status: checked ? "DONE" : "PENDING" })
      .then(() => {
        // Esperar un momento antes de permitir sincronización para que el refresh del backend complete
        setTimeout(() => {
          localChangeRef.current = false;
          lastLocalStateRef.current = null;
        }, 1000);
      })
      .catch((error: any) => {
        console.error("Error al actualizar estado de subtarea:", error);
        // Revertir el cambio si falla
        setIsChecked(previousChecked);
        localChangeRef.current = false;
        lastLocalStateRef.current = null;
        
        // Revertir también en el padre
        if (onStatusChange) {
          onStatusChange(id, previousChecked);
        }
        
        const errorMessage = 
          error?.response?.data?.detail ||
          error?.message ||
          "Error al actualizar el estado de la subtarea";
        showToast(errorMessage, "error");
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const handleDelete = () => {
    // Aquí iría la lógica para eliminar la subtarea
    console.log("Eliminar subtarea:", title);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (data: { nombre: string; fechaObjetivo: string; horas: string }) => {
    if (!activityId || !id) {
      showToast("Error: ID de actividad o subtarea no disponible.", "error");
      return;
    }

    try {
      // Convertir horas de string a número (remover "h" si está presente)
      const cleanHours = data.horas.trim().replace(/h/gi, "").trim();
      const estimatedHours = parseFloat(cleanHours);

      if (isNaN(estimatedHours) || estimatedHours <= 0) {
        showToast("Las horas estimadas deben ser un número válido mayor a 0.", "error");
        return;
      }

      // Preparar los datos para el backend
      const subtaskUpdateData: any = {
        title: data.nombre.trim(),
        estimated_hours: estimatedHours.toString(),
        target_date: data.fechaObjetivo || null,
      };

      // Llamar a la API para actualizar la subtarea
      await updateSubtask(activityId, id, subtaskUpdateData);

      // Mostrar mensaje de éxito primero
      showToast("¡Todo salió bien! La subtarea se actualizó correctamente.", "success");

      // Cerrar el modal después de un breve delay para que el usuario vea el mensaje
      setTimeout(() => {
        setShowEditDialog(false);
      }, 200);

      // Refrescar todos los datos de las subtareas después de cerrar el modal
      if (onSubtaskUpdated) {
        setTimeout(() => {
          onSubtaskUpdated();
        }, 500);
      }
    } catch (error: any) {
      console.error("Error al actualizar subtarea:", error);
      
      let errorMessage = "Error al actualizar la subtarea. Intenta de nuevo.";
      
      if (error?.response?.data) {
        if (error.response.data.title) {
          errorMessage = Array.isArray(error.response.data.title)
            ? error.response.data.title[0]
            : error.response.data.title;
        } else if (error.response.data.estimated_hours) {
          errorMessage = Array.isArray(error.response.data.estimated_hours)
            ? error.response.data.estimated_hours[0]
            : error.response.data.estimated_hours;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const firstError = Object.values(error.response.data)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    }
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
      <ToastComponent />
      <article
        onClick={handleSubtaskClick}
        className={`group cursor-pointer bg-white dark:bg-[#1e2433] border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden ${borderClass}`}
      >
      <label className="checkbox-wrapper relative flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isChecked}
          disabled={isUpdating}
          onChange={(e) => handleCheckChange(e.target.checked)}
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
        fechaObjetivo: dateOriginal || "", // Usar la fecha original en formato YYYY-MM-DD
        horas: hours.replace("h", ""), // Remover la "h" para el input
      }}
      onSave={handleSaveEdit}
    />
    </>
  );
}
