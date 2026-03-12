import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, Calendar, Clock, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import EditSubtaskDialog from "./EditSubtaskDialog";
import { patchSubtask, updateSubtask, deleteSubtask } from "@/api/services/subtack";
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
  deadlineDate?: string; // Fecha de entrega de la actividad
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
  deadlineDate,
}: SubtaskItemProps) {
  const [isChecked, setIsChecked] = useState(completed);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditSuccessDialog, setShowEditSuccessDialog] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<{ nombre: string; horas: string } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    fecha: string;
    horasAntiguas: number;
    horasIntentadas: number;
    horasOcupadas: number;
    limiteDiario: number;
  } | null>(null);
  const [isLoadingConflictData, setIsLoadingConflictData] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const localChangeRef = useRef(false); // Ref para rastrear si el cambio fue iniciado localmente
  const lastLocalStateRef = useRef<boolean | null>(null); // Ref para rastrear el último estado establecido localmente
  const deleteArmTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (deleteArmTimeoutRef.current) {
        window.clearTimeout(deleteArmTimeoutRef.current);
      }
    };
  }, []);

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

  const handleDelete = async () => {
    if (!activityId || !id) {
      showToast("Error: ID de actividad o subtarea no disponible.", "error");
      return;
    }

    setIsDeleting(true);

    try {
      // Llamar al backend para eliminar la subtarea
      await deleteSubtask(activityId, id);

      // Recargar solo las subtareas (no toda la actividad)
      if (onSubtaskUpdated) {
        onSubtaskUpdated();
      }
    } catch (error: any) {
      console.error("Error al eliminar subtarea:", error);

      let errorMessage = "Error al eliminar la subtarea. Intenta de nuevo.";

      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Si ya estamos "eliminando", ignorar más clics
    if (isDeleting) return;

    // Primer click: armar confirmación
    if (!deleteArmed) {
      setDeleteArmed(true);
      if (deleteArmTimeoutRef.current) {
        window.clearTimeout(deleteArmTimeoutRef.current);
      }
      deleteArmTimeoutRef.current = window.setTimeout(() => {
        setDeleteArmed(false);
      }, 2500);
      return;
    }

    // Segundo click: confirmar (solo UI por ahora)
    setDeleteArmed(false);
    if (deleteArmTimeoutRef.current) {
      window.clearTimeout(deleteArmTimeoutRef.current);
      deleteArmTimeoutRef.current = null;
    }
    handleDelete();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = (open: boolean) => {
    // Si se cierra el modal de edición, descartamos el borrador
    if (!open) {
      setPendingEditData(null);
    }
    setShowEditDialog(open);
  };

  const handleSaveEdit = async (data: { nombre: string; horas: string }) => {
    if (!activityId || !id) {
      showToast("Error: ID de actividad o subtarea no disponible.", "error");
      return;
    }

    // Guardar temporalmente lo que el usuario está intentando editar
    setPendingEditData({
      nombre: data.nombre,
      horas: data.horas,
    });

    try {
      // Convertir horas de string a número (remover "h" si está presente)
      const cleanHours = data.horas.trim().replace(/h/gi, "").trim();
      const estimatedHours = parseFloat(cleanHours);

      if (isNaN(estimatedHours) || estimatedHours <= 0) {
        showToast("Las horas estimadas deben ser un número válido mayor a 0.", "error");
        return;
      }

      setIsSavingEdit(true);

      // Preparar los datos para el backend
      const subtaskUpdateData: any = {
        title: data.nombre.trim(),
        estimated_hours: estimatedHours.toString(),
      };

      // Llamar a la API para actualizar la subtarea
      await updateSubtask(activityId, id, subtaskUpdateData);

      // Mostrar mensaje de éxito primero
      showToast("¡Todo salió bien! La subtarea se actualizó correctamente.", "success");

      // Cerrar el modal de editar
      setShowEditDialog(false);

      // Mostrar el modal de éxito después de un breve delay
      setTimeout(() => {
        setShowEditSuccessDialog(true);
      }, 200);

      // Refrescar solo las subtareas mediante el callback
      if (onSubtaskUpdated) {
        onSubtaskUpdated();
      }
      // Limpiar el borrador porque ya se guardó correctamente
      setPendingEditData(null);
    } catch (error: any) {
      console.error("Error al actualizar subtarea:", error);

      // Detectar si es un error de conflicto de horas
      let isConflictError = false;
      let conflictErrorMessage = "";

      if (error?.response?.data) {
        if (error.response.data.estimated_hours) {
          const hoursError = Array.isArray(error.response.data.estimated_hours)
            ? error.response.data.estimated_hours[0]
            : error.response.data.estimated_hours;
          
          // Verificar si el mensaje indica conflicto de límite diario
          if (typeof hoursError === 'string' && hoursError.includes("excede el limite diario")) {
            isConflictError = true;
            conflictErrorMessage = hoursError;
          }
        } else if (error.response.data.detail) {
          const detailError = error.response.data.detail;
          if (typeof detailError === 'string' && detailError.includes("excede el limite diario")) {
            isConflictError = true;
            conflictErrorMessage = detailError;
          }
        }
      }

      // Si es un error de conflicto, obtener información y mostrar el modal de conflicto
      if (isConflictError) {
        const cleanHours = data.horas.trim().replace(/h/gi, "").trim();
        const estimatedHours = parseFloat(cleanHours);
        const fechaSubtask = dateOriginal || date.split(' ')[0]; // Usar dateOriginal si está disponible, sino parsear date
        
        // Obtener límite diario del localStorage
        const limiteDiario = (() => {
          const saved = window.localStorage.getItem("studyLimitHours");
          return saved ? parseFloat(saved) : 6;
        })();

        // Obtener horas actuales de la subtarea (antes de editar)
        const horasActualesSubtask = parseFloat(hours.replace("h", "").trim()) || 0;
        const horasIntentadas = estimatedHours;
        
        // Calcular horas ocupadas del día
        // Las horas ocupadas serían: horas de otras subtareas del día + horas actuales de esta subtarea
        // Como no tenemos acceso directo a todas las subtareas del día,
        // estimaremos que las horas ocupadas = límite diario + (horas intentadas - horas actuales)
        // Esto es una aproximación, pero nos da una idea del conflicto
        const diferenciaHoras = horasIntentadas - horasActualesSubtask;
        const horasOcupadasEstimadas = limiteDiario + diferenciaHoras;
        
        setConflictData({
          fecha: fechaSubtask,
          horasAntiguas: horasActualesSubtask,
          horasIntentadas: horasIntentadas,
          horasOcupadas: Math.max(horasOcupadasEstimadas, horasIntentadas), // Al menos las horas intentadas
          limiteDiario: limiteDiario,
        });
        
        setShowConflictModal(true);
        setShowEditDialog(false); // Cerrar el modal de editar
        return;
      }

      // Si no es conflicto, mostrar el error normal
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
    } finally {
      setIsSavingEdit(false);
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
        className={`group cursor-pointer bg-[#111827] border border-slate-700/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:bg-slate-800 hover:border-slate-600 relative overflow-hidden ${borderClass}`}
      >
        <label className="checkbox-wrapper relative flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isChecked}
            disabled={isUpdating}
            onChange={(e) => handleCheckChange(e.target.checked)}
          />
          <div className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all group-hover:border-primary ${isChecked
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
            <h4 className={`truncate font-bold ${isChecked ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 rounded-lg transition-all"
          >
            <Pencil className="size-4" />
            <span className="text-sm font-bold">editar</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${isDeleting
              ? "text-red-600 bg-red-100 dark:bg-red-900/30 cursor-wait"
              : deleteArmed
                ? "text-white bg-red-600 hover:bg-red-500"
                : "text-red-500 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20"
              }`}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            <span className="text-sm font-bold">
              {isDeleting ? "Eliminando..." : deleteArmed ? "¿Seguro?" : "Eliminar"}
            </span>
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
        onOpenChange={handleCloseEditDialog}
        subtaskData={
          pendingEditData ?? {
            nombre: title,
            horas: hours.replace("h", ""), // Remover la "h" para el input
          }
        }
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
      />

      <Dialog open={showEditSuccessDialog} onOpenChange={setShowEditSuccessDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Subtarea actualizada
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2">
              Tu subtarea{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {title}
              </span>{" "}
              se ha editado correctamente.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Modal de conflicto de horas */}
      {showConflictModal && conflictData && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-[560px] bg-[#111827] border border-[#F59E0B]/30 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
            <div className="p-6 sm:p-7 relative">
              {/*
                Usar el último nombre editado si existe (para consistencia entre el modal de edición y el de conflicto)
              */}
              {(() => {
                const conflictTitle = pendingEditData?.nombre?.trim() ? pendingEditData.nombre.trim() : title;
                return (
                  <>
              <button
                type="button"
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                  setPendingEditData(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div className="pr-8">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Conflicto de horas detectado
                  </h3>
                </div>
              </div>

              <p className="mt-6 text-sm text-slate-300 leading-relaxed">
                No pudimos actualizar{" "}
                <span className="font-semibold text-white">"{conflictTitle}"</span> de{" "}
                <span className="font-semibold text-white">{conflictData.horasAntiguas.toFixed(1)}h</span> a{" "}
                <span className="font-semibold text-white">{conflictData.horasIntentadas.toFixed(1)}h</span> porque ese día se superaría tu límite de horas de estudio.
              </p>

              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-red-400">
                    {conflictData.horasOcupadas.toFixed(1)}h
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-xl font-bold text-slate-300">
                    {conflictData.limiteDiario.toFixed(1)}h
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Horas resultantes / Límite diario de estudio
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictData(null);
                    setShowEditDialog(true); // Volver a abrir el modal de editar
                  }}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all"
                >
                  Reajustar
                </button>
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictData(null);
                    setPendingEditData(null);
                  }}
                  className="flex-1 h-11 rounded-xl bg-white hover:bg-slate-100 text-blue-600 font-bold border border-slate-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
