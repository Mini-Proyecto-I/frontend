import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Calendar, Clock, Loader2, CheckCircle2, AlertCircle, AlertTriangle, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import EditSubtaskModal from "@/shared/components/EditSubtaskModal";
import { patchSubtask, updateSubtask, deleteSubtask } from "@/api/services/subtask";
import { useToast } from "@/shared/components/toast";
import { SubtaskDetailModal } from "@/shared/components/SubtaskDetailModal";

interface SubtaskItemProps {
  id: string;
  activityId: string;
  title: string;
  date: string;
  note?: string;
  dateOriginal?: string; // Fecha original en formato YYYY-MM-DD para el modal de edición
  hours: string;
  completed?: boolean;
  isActive?: boolean;
  todayBadge?: boolean;
  onStatusChange?: (subtaskId: string, newStatus: boolean) => void; // Callback con ID y nuevo estado para actualización optimista
  onSubtaskUpdated?: () => void; // Callback para refrescar todas las subtareas después de editar
  deadlineDate?: string; // Fecha de entrega de la actividad
  isConflicted?: boolean;
  status?: string;
  onOpenResolveConflict?: () => void;
  onOpenPostpone?: () => void;
}

export default function SubtaskItem({
  id,
  activityId,
  title,
  date,
  note,
  dateOriginal,
  hours,
  completed = false,
  isActive = false,
  todayBadge = false,
  onStatusChange,
  onSubtaskUpdated,
  deadlineDate,
  isConflicted = false,
  status = "PENDING",
  onOpenResolveConflict,
  onOpenPostpone,
}: SubtaskItemProps) {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(completed);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const borderClass = isConflicted
    ? "border-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.5)] bg-amber-400/10"
    : status === "POSTPONED"
      ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
      : isActive
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

  const handleSaveEditFromTodayModal = async (payload: { title: string; estimatedHours: number }) => {
    if (!activityId || !id) {
      showToast("Error: ID de actividad o subtarea no disponible.", "error");
      return { ok: false as const, error: "ID de actividad o subtarea no disponible." };
    }

    // Guardar temporalmente lo que el usuario está intentando editar
    setPendingEditData({
      nombre: payload.title,
      horas: String(payload.estimatedHours),
    });

    try {
      const subtaskUpdateData: any = {
        title: payload.title.trim(),
        estimated_hours: String(payload.estimatedHours),
      };

      await updateSubtask(activityId, id, subtaskUpdateData);

      showToast("¡Todo salió bien! La subtarea se actualizó correctamente.", "success");

      // Cerrar modal (el modal también se cierra al recibir ok:true, esto es solo por consistencia)
      setShowEditDialog(false);

      setTimeout(() => {
        setShowEditSuccessDialog(true);
      }, 200);

      if (onSubtaskUpdated) onSubtaskUpdated();
      setPendingEditData(null);

      return { ok: true as const };
    } catch (error: any) {
      console.error("Error al actualizar subtarea:", error);

      // Detectar si es un error de conflicto de horas (mismo criterio que antes)
      let isConflictError = false;
      if (error?.response?.data) {
        if (error.response.data.estimated_hours) {
          const hoursError = Array.isArray(error.response.data.estimated_hours)
            ? error.response.data.estimated_hours[0]
            : error.response.data.estimated_hours;
          if (typeof hoursError === "string" && hoursError.includes("excede el limite diario")) {
            isConflictError = true;
          }
        } else if (error.response.data.detail) {
          const detailError = error.response.data.detail;
          if (typeof detailError === "string" && detailError.includes("excede el limite diario")) {
            isConflictError = true;
          }
        }
      }

      if (isConflictError) {
        const fechaSubtask = dateOriginal || date.split(" ")[0];
        const limiteDiario = (() => {
          const saved = window.localStorage.getItem("studyLimitHours");
          return saved ? parseFloat(saved) : 6;
        })();

        const horasActualesSubtask = parseFloat(hours.replace("h", "").trim()) || 0;
        const horasIntentadas = payload.estimatedHours;
        const diferenciaHoras = horasIntentadas - horasActualesSubtask;
        const horasOcupadasEstimadas = limiteDiario + diferenciaHoras;

        setConflictData({
          fecha: fechaSubtask,
          horasAntiguas: horasActualesSubtask,
          horasIntentadas: horasIntentadas,
          horasOcupadas: Math.max(horasOcupadasEstimadas, horasIntentadas),
          limiteDiario: limiteDiario,
        });

        setShowConflictModal(true);
        setShowEditDialog(false);
        return { ok: false as const, handled: true };
      }

      // Error normal
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
        } else if (typeof error.response.data === "object") {
          const firstError = Object.values(error.response.data)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === "string") {
            errorMessage = firstError;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, "error");
      return { ok: false as const, error: errorMessage };
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
        <div className={`flex-1 min-w-0 ${isChecked ? "line-through text-slate-500 dark:text-slate-400" : ""} ${status === "POSTPONED" ? "opacity-80" : ""}`}>
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
            {isConflicted && (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold animate-pulse">
                <AlertTriangle className="size-4" />
                <span>Conflicto de horas</span>
              </div>
            )}
            {status === "POSTPONED" && (
              <div className="flex items-center gap-1.5 text-purple-400 font-bold italic">
                <Clock className="size-4" />
                <span>Pospuesta</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
          {isConflicted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenResolveConflict?.();
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all font-bold text-sm shadow-lg shadow-amber-500/20"
            >
              <AlertTriangle className="size-4" />
              Resolver conflicto
            </button>
          )}

          {!isConflicted && !isChecked && status !== "POSTPONED" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPostpone?.();
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all font-bold text-sm"
            >
              <Clock className="size-4" />
              Posponer
            </button>
          )}

          {isChecked && note && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailsDialog(true);
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20 rounded-lg transition-all font-bold text-sm"
            >
              <FileText className="size-4" />
              Ver nota
            </button>
          )}

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

      <SubtaskDetailModal
        open={showDetailsDialog}
        onOpenChange={(open: boolean) => setShowDetailsDialog(open)}
        subtask={{
          id, // Importante para el historial
          title,
          target_date: dateOriginal || date.split(" ")[0],
          estimated_hours: hours.replace("h", ""),
          status: isChecked ? "DONE" : "PENDING",
          execution_note: note,
        }}
        onEdit={() => {
          setShowDetailsDialog(false);
          setShowEditDialog(true);
        }}
      />

      <EditSubtaskModal
        open={showEditDialog}
        onOpenChange={handleCloseEditDialog}
        initialTitle={(pendingEditData?.nombre ?? title) as string}
        initialHours={(pendingEditData?.horas ?? hours.replace("h", "")) as string}
        onReprogram={() => {
          const dateKey = dateOriginal || date.split(" ")[0];
          const estimatedHours = parseFloat(hours.replace("h", "").trim()) || 0;
          navigate("/calendario", {
            state: {
              focusDate: dateKey,
              reprogramSubtask: {
                id,
                activityId,
                title,
                deadline: deadlineDate,
                dateKey,
                durationNum: estimatedHours,
              },
            },
          });
        }}
        onSave={handleSaveEditFromTodayModal}
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
          <div className="w-full max-w-[560px] bg-[#111827] border border-amber-400/30 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
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
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
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
