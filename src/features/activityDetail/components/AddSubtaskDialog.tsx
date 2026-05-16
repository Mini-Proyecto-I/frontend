import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Calendar, ClipboardList, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/dialog";
import { Button } from "@/shared/components/button";
import { useToast } from "@/shared/components/toast";
import { createSubtask, putSubtaskWithConflictTolerance } from "@/api/services/subtask";
import WeeklyDatePicker from "@/features/create/components/WeeklyDatePicker";
import { MessageModal } from "@/shared/components/MessageModal";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import { formatStudyHours, normalizeHalfHourStep } from "@/shared/utils/studyLimitFormat";

interface AddSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  onSubtaskCreated?: () => void | Promise<void>;
  deadlineDate?: string; // Fecha de entrega de la actividad para validar
  existingSubtasks?: Array<{
    id: string;
    title: string;
    dateOriginal?: string;
    hours: string;
  }>;
}

export default function AddSubtaskDialog({
  open,
  onOpenChange,
  activityId,
  onSubtaskCreated,
  deadlineDate,
  existingSubtasks = [],
}: AddSubtaskDialogProps) {
  const [nombre, setNombre] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [horas, setHoras] = useState("0.5");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [showConflictConfirmModal, setShowConflictConfirmModal] = useState(false);
  const [conflictErrorMessage, setConflictErrorMessage] = useState("");
  const [errors, setErrors] = useState<{
    nombre?: string;
    fechaObjetivo?: string;
    horas?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const createdModalHandledRef = useRef(false);
  const conflictModalRef = useRef<HTMLDivElement | null>(null);
  const conflictCancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const plannedSubtasks = useMemo(
    () =>
      existingSubtasks
        .map((subtask) => ({
          id: subtask.id,
          title: subtask.title,
          hours: parseFloat(subtask.hours.replace(/h/gi, "").trim()) || 0,
          date: subtask.dateOriginal || "",
        }))
        .filter((subtask) => subtask.date && subtask.hours > 0),
    [existingSubtasks]
  );

  const getTodayDate = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = (): string | undefined => {
    if (deadlineDate) {
      return deadlineDate;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!nombre.trim()) {
      newErrors.nombre = "El nombre de la subtarea es obligatorio.";
    }

    if (!fechaObjetivo) {
      newErrors.fechaObjetivo = "La fecha objetivo es obligatoria.";
    } else if (deadlineDate && fechaObjetivo > deadlineDate) {
      newErrors.fechaObjetivo = "La fecha objetivo no puede ser posterior a la fecha de entrega de la actividad.";
    }

    if (!horas || parseFloat(horas) <= 0) {
      newErrors.horas = "Las horas estimadas son obligatorias y deben ser mayores a 0.";
    } else {
      const hoursValue = parseFloat(horas);
      if (isNaN(hoursValue) || hoursValue <= 0) {
        newErrors.horas = "Las horas estimadas deben ser un número válido mayor a 0.";
      } else if (hoursValue % 0.5 !== 0) {
        newErrors.horas = "Las horas deben ir en bloques de 30 min (ej: 1h, 1h 30min, 2h, 2h 30min).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isDailyLimitConflictError = (error: any): boolean => {
    const estimatedHoursError = error?.response?.data?.estimated_hours;
    if (!estimatedHoursError) return false;

    const raw = Array.isArray(estimatedHoursError)
      ? estimatedHoursError[0]
      : estimatedHoursError;
    const text = String(raw || "").toLowerCase();
    return text.includes("limite diario") || text.includes("límite diario") || text.includes("excede");
  };

  const getConflictErrorMessage = (error: any): string => {
    const estimatedHoursError = error?.response?.data?.estimated_hours;
    if (estimatedHoursError) {
      return Array.isArray(estimatedHoursError)
        ? String(estimatedHoursError[0] || "")
        : String(estimatedHoursError);
    }
    return "Esta subtarea supera tu límite diario de estudio. Puedes crearla igualmente y resolver el conflicto después.";
  };

  const markCreatedAndShowSuccess = () => {
    setNombre("");
    setFechaObjetivo("");
    setHoras("0.5");
    setErrors({});
    setShowDatePicker(false);
    setShowConflictConfirmModal(false);
    setConflictErrorMessage("");
    createdModalHandledRef.current = false;
    setShowCreatedModal(true);
  };

  const waitForSubtasksRefresh = async () => {
    if (onSubtaskCreated) {
      await onSubtaskCreated();
    }
  };

  const createWithConflictTolerance = async (estimatedHours: number) => {
    const createdSubtask = await createSubtask(activityId, {
      title: nombre.trim(),
      estimated_hours: estimatedHours,
      target_date: null,
      status: "PENDING",
    });

    await putSubtaskWithConflictTolerance(createdSubtask.id, {
      target_date: fechaObjetivo,
      estimated_hours: estimatedHours,
      reason: "Creación desde /actividad/:id con conflicto permitido",
    });
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast("Por favor, completa todos los campos obligatorios", "error");
      return;
    }

    if (!activityId) {
      showToast("Error: ID de actividad no disponible", "error");
      return;
    }

    try {
      setIsSaving(true);

      const cleanHours = horas.trim().replace(/h/gi, "").trim();
      const estimatedHours = parseFloat(cleanHours);

      if (isNaN(estimatedHours) || estimatedHours <= 0) {
        showToast("Las horas estimadas deben ser un número válido mayor a 0.", "error");
        return;
      }

      await createSubtask(activityId, {
        title: nombre.trim(),
        estimated_hours: estimatedHours,
        target_date: fechaObjetivo || null,
        status: "PENDING",
      });
      await waitForSubtasksRefresh();
      markCreatedAndShowSuccess();
    } catch (error: any) {
      console.error("Error al crear subtarea:", error);

      if (isDailyLimitConflictError(error)) {
        setConflictErrorMessage(getConflictErrorMessage(error));
        setShowConflictConfirmModal(true);
        return;
      }

      let errorMessage = "Error al crear la subtarea. Intenta de nuevo.";

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
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setFechaObjetivo("");
    setHoras("0.5");
    setErrors({});
    setShowDatePicker(false);
    setShowCreatedModal(false);
    setShowConflictConfirmModal(false);
    setConflictErrorMessage("");
    createdModalHandledRef.current = false;
    onOpenChange(false);
  };

  const handleCreatedModalClose = () => {
    if (createdModalHandledRef.current) {
      return;
    }
    createdModalHandledRef.current = true;
    setShowCreatedModal(false);
    onOpenChange(false);
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "d 'de' MMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const textInputClass =
    "w-full h-10 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none px-3 py-1.5 border transition-colors bg-[#1F2937]/50 border-slate-700/50 focus:ring-blue-500 focus:border-blue-500";

  useEffect(() => {
    if (!showConflictConfirmModal) return;

    const modalEl = conflictModalRef.current;
    if (!modalEl) return;

    conflictCancelBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        setShowConflictConfirmModal(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || active === modalEl) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modalEl.addEventListener("keydown", handleKeyDown);
    return () => {
      modalEl.removeEventListener("keydown", handleKeyDown);
    };
  }, [showConflictConfirmModal, isSaving]);

  return (
    <>
      <ToastComponent />
      <Dialog
        modal={!showDatePicker && !showConflictConfirmModal && !showCreatedModal}
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !showDatePicker && !showConflictConfirmModal && !showCreatedModal) {
            handleClose();
          }
        }}
      >
        <DialogContent className="w-[min(94vw,920px)] max-w-[920px] bg-[#111827] border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl">Crear nueva subtarea</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Usa el mismo formato del plan de estudio de /crear.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_132px] gap-3 items-center px-1 mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                Nombre subtarea <span className="text-blue-500">*</span>
                <InfoTooltip text="Escribe un nombre descriptivo para una tarea concreta que te ayude a completar la actividad." />
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                Fecha objetivo <span className="text-blue-500">*</span>
                <InfoTooltip text="Fecha objetivo para completar esta subtarea." />
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                Est. Horas <span className="text-blue-500">*</span>
                <InfoTooltip text="Horas estimadas para completar esta subtarea." />
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_132px] gap-3 rounded-xl px-3 py-3 bg-[#1F2937]/50 border border-slate-700/50">
              <div>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errors.nombre) {
                    setErrors((prev) => ({ ...prev, nombre: undefined }));
                  }
                }}
                placeholder="ej. Revisar apuntes de clase"
                className={`${textInputClass} ${errors.nombre ? "border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]" : ""}`}
              />
              {errors.nombre && (
                <div className="mt-2 flex items-start gap-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-3.5 w-3.5 text-[#EF4444]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-[#EF4444] flex-1">{errors.nombre}</p>
                </div>
              )}
            </div>

              <div>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`relative w-full h-10 rounded-lg text-sm pl-7 pr-2 py-1.5 border transition-colors bg-[#1F2937]/50 text-left cursor-pointer hover:border-blue-500/50 hover:bg-[#1F2937]/70 ${
                  errors.fechaObjetivo
                    ? "border-[#EF4444]"
                    : fechaObjetivo
                    ? "border-blue-500/40 text-slate-200"
                    : "border-slate-700/50 text-slate-500"
                }`}
              >
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <span className={fechaObjetivo ? "text-slate-200" : "text-slate-500"}>
                  {fechaObjetivo ? formatDisplayDate(fechaObjetivo) : "Seleccionar fecha objetivo"}
                </span>
              </button>
              {errors.fechaObjetivo && (
                <div className="mt-2 flex items-start gap-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-3.5 w-3.5 text-[#EF4444]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-[#EF4444] flex-1">{errors.fechaObjetivo}</p>
                </div>
              )}
            </div>

            <div>
              <div className={`w-full h-10 rounded-lg text-sm border transition-colors bg-[#1F2937]/50 text-slate-200 flex items-center overflow-hidden ${
                errors.horas ? "border-[#EF4444]" : "border-slate-700/50"
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    const next = normalizeHalfHourStep(parseFloat(horas) - 0.5, 0.5, 24);
                    setHoras(String(next));
                    if (errors.horas) setErrors((prev) => ({ ...prev, horas: undefined }));
                  }}
                  className="h-full w-[30px] p-0 text-slate-200 hover:bg-[#334155]/40 text-sm font-bold border-r border-slate-700/50"
                  aria-label="Restar 30 minutos"
                >
                  -
                </button>
                <span className="h-full flex-1 px-1 text-slate-100 font-bold text-xs flex items-center justify-center text-center">
                  {formatStudyHours(parseFloat(horas) || 0)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = normalizeHalfHourStep(parseFloat(horas) + 0.5, 0.5, 24);
                    setHoras(String(next));
                    if (errors.horas) setErrors((prev) => ({ ...prev, horas: undefined }));
                  }}
                  className="h-full w-[30px] p-0 text-slate-200 hover:bg-[#334155]/40 text-sm font-bold border-l border-slate-700/50"
                  aria-label="Sumar 30 minutos"
                >
                  +
                </button>
              </div>
              {errors.horas && (
                <div className="mt-2 flex items-start gap-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-3.5 w-3.5 text-[#EF4444]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-[#EF4444] flex-1">{errors.horas}</p>
                </div>
              )}
            </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="cursor-pointer bg-[#111827] border-border text-foreground hover:bg-[#111827]/80"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="cursor-pointer bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
            >
              {isSaving ? "Guardando..." : "Guardar subtarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showDatePicker && (
        <WeeklyDatePicker
          value={fechaObjetivo}
          onChange={(date) => {
            setFechaObjetivo(date);
            if (errors.fechaObjetivo) {
              setErrors((prev) => ({ ...prev, fechaObjetivo: undefined }));
            }
          }}
          minDate={getTodayDate()}
          maxDate={getMaxDate()}
          plannedSubtasks={plannedSubtasks}
          onClose={() => setShowDatePicker(false)}
        />
      )}
      <MessageModal
        open={showCreatedModal}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleCreatedModalClose();
          }
        }}
        type="success"
        title="¡Nueva tarea añadida correctamente!"
        message="Tu nueva subtarea fue guardada correctamente en el plan de estudio."
        onConfirm={handleCreatedModalClose}
        overlayClassName="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      />
      {showConflictConfirmModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div
            ref={conflictModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-modal-title"
            aria-describedby="conflict-modal-description"
            aria-label="Conflicto de horas detectado"
            tabIndex={-1}
            className="w-full max-w-[560px] bg-[#111827] border border-amber-400/30 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            <div className="p-6 sm:p-7 relative">
              <button
                type="button"
                onClick={() => setShowConflictConfirmModal(false)}
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
                  <h3 id="conflict-modal-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Conflicto de horas detectado
                  </h3>
                  <p id="conflict-modal-description" className="text-slate-400 text-sm mt-2 leading-relaxed">
                    Esta subtarea supera tu límite diario. ¿Deseas añadirla igualmente y resolver el conflicto después?
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  {conflictErrorMessage || "Se detectó una sobrecarga de horas para la fecha seleccionada."}
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  ref={conflictCancelBtnRef}
                  type="button"
                  onClick={() => setShowConflictConfirmModal(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/60 text-slate-200 font-bold transition-all"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const cleanHours = horas.trim().replace(/h/gi, "").trim();
                    const estimatedHours = parseFloat(cleanHours);
                    if (isNaN(estimatedHours) || estimatedHours <= 0) {
                      showToast("Las horas estimadas deben ser un número válido mayor a 0.", "error");
                      return;
                    }

                    try {
                      setIsSaving(true);
                      await createWithConflictTolerance(estimatedHours);
                      await waitForSubtasksRefresh();
                      markCreatedAndShowSuccess();
                    } catch (error: any) {
                      console.error("Error al crear subtarea con conflicto permitido:", error);
                      showToast(
                        error?.response?.data?.detail || "No se pudo crear la subtarea con conflicto.",
                        "error"
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Sí, añadir con conflicto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
