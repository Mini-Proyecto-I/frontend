import { useState } from "react";
import { Calendar } from "lucide-react";
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
import { createSubtask } from "@/api/services/subtack";

interface AddSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  onSubtaskCreated?: () => void;
  deadlineDate?: string; // Fecha de entrega de la actividad para validar
}

export default function AddSubtaskDialog({
  open,
  onOpenChange,
  activityId,
  onSubtaskCreated,
  deadlineDate,
}: AddSubtaskDialogProps) {
  const [nombre, setNombre] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [horas, setHoras] = useState("");
  const [errors, setErrors] = useState<{
    nombre?: string;
    fechaObjetivo?: string;
    horas?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();

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
        newErrors.horas = "Las horas deben ser múltiplos de 0.5 (ej: 1, 1.5, 2, 2.5, etc.).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      showToast("¡Todo salió bien! La subtarea se creó correctamente.", "success");

      // Limpiar el formulario
      setNombre("");
      setFechaObjetivo("");
      setHoras("");
      setErrors({});

      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        onOpenChange(false);
        if (onSubtaskCreated) {
          onSubtaskCreated();
        }
      }, 500);
    } catch (error: any) {
      console.error("Error al crear subtarea:", error);

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
    setHoras("");
    setErrors({});
    onOpenChange(false);
  };

  const inputClass =
    "w-full rounded-lg bg-[#111827] border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <>
      <ToastComponent />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] bg-[#1E293B] border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Añadir nueva subtarea</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Completa los campos para crear una nueva subtarea en esta actividad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                <span className="text-white">Nombre de la subtarea:</span> <span className="text-primary">*</span>
              </label>
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
                className={`${inputClass} ${errors.nombre ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
              />
              {errors.nombre && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.nombre}</p>
                </div>
              )}
            </div>

            {/* Fecha objetivo */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                <span className="text-white">Fecha objetivo:</span> <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={fechaObjetivo}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  onChange={(e) => {
                    setFechaObjetivo(e.target.value);
                    if (errors.fechaObjetivo) {
                      setErrors((prev) => ({ ...prev, fechaObjetivo: undefined }));
                    }
                  }}
                  className={`${inputClass} pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.fechaObjetivo ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
                />
              </div>
              {errors.fechaObjetivo && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.fechaObjetivo}</p>
                </div>
              )}
            </div>

            {/* Horas estimadas */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                <span className="text-white">Horas estimadas:</span> <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={horas}
                  onChange={(e) => {
                    setHoras(e.target.value);
                    if (errors.horas) {
                      setErrors((prev) => ({ ...prev, horas: undefined }));
                    }
                  }}
                  placeholder="ej. 2.5"
                  className={`${inputClass} text-center pr-10 ${errors.horas ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  hr
                </span>
              </div>
              {errors.horas && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.horas}</p>
                </div>
              )}
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
    </>
  );
}
