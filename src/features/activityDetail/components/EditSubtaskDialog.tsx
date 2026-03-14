import { useState, useEffect, useRef } from "react";
import { Clock, Loader2, CalendarRange } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/dialog";
import { Button } from "@/shared/components/button";
import InfoTooltip from "@/features/create/components/InfoTooltip";

interface EditSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtaskData?: {
    nombre?: string;
    horas?: string;
  };
  onSave: (data: { nombre: string; horas: string }) => void;
  isSaving?: boolean;
}

export default function EditSubtaskDialog({
  open,
  onOpenChange,
  subtaskData = {},
  onSave,
  isSaving = false,
}: EditSubtaskDialogProps) {
  const [nombre, setNombre] = useState("");
  const [horas, setHoras] = useState("");
  const [errors, setErrors] = useState<{
    nombre?: string;
    horas?: string;
  }>({});

  const wasOpenRef = useRef(false);

  // Cargar datos SOLO cuando se abre el modal (evita que se "reseteen" los inputs durante el guardado/refetch)
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    if (open && !wasOpen) {
      setNombre(subtaskData.nombre || "");
      setHoras(subtaskData.horas || "");
      setErrors({});
    }
  }, [open, subtaskData?.nombre, subtaskData?.horas]);

  // Validar que las horas sean múltiplos de 0.5 (1, 1.5, 2, 2.5, etc.)
  const validateHours = (hoursStr: string): boolean => {
    if (!hoursStr.trim()) return false;
    
    // Remover "h" si está presente
    const cleanHours = hoursStr.trim().replace(/h/gi, "").trim();
    
    // Convertir a número
    const hours = parseFloat(cleanHours);
    
    // Verificar que sea un número válido
    if (isNaN(hours) || hours <= 0) {
      return false;
    }
    
    // Verificar que sea múltiplo de 0.5
    const remainder = hours % 0.5;
    return Math.abs(remainder) < 0.001; // Tolerancia para errores de punto flotante
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!nombre.trim()) {
      newErrors.nombre = "El nombre de la subtarea es obligatorio.";
    }

    if (!horas.trim()) {
      newErrors.horas = "Las horas estimadas son obligatorias.";
    } else if (!validateHours(horas)) {
      newErrors.horas = "Las horas deben ser múltiplos de 0.5 (ej: 1, 1.5, 2, 2.5, etc.).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        nombre: nombre.trim(),
        horas: horas.trim(),
      });
    }
  };

  const inputClass =
    "w-full rounded-lg bg-[#111827] border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#111827] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Editar subtarea
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Ajusta el título y las horas estimadas. Para cambiar la fecha, usa la opción{" "}
            <span className="text-blue-300 font-semibold">Reprogramar</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Nombre subtarea:</span> <span className="text-[#9CA3AF]">¿Qué tarea específica debes hacer?</span> <span className="text-primary">*</span>
              <InfoTooltip text="Escribe un nombre descriptivo para una tarea concreta que te ayude a completar la actividad." />
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setErrors((prev) => ({ ...prev, nombre: undefined }));
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

          {/* Horas estimadas */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Horas estimadas:</span> <span className="text-[#9CA3AF]">¿Cuánto tiempo te tomará?</span> <span className="text-primary">*</span>
              <InfoTooltip text="Horas estimadas para completar esta subtarea." />
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={horas}
                onChange={(e) => {
                  setHoras(e.target.value);
                  setErrors((prev) => ({ ...prev, horas: undefined }));
                }}
                placeholder="ej. 2h, 3h estimadas"
                className={`${inputClass} pl-10 ${errors.horas ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
              />
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

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer bg-[#1E293B] border-border text-muted-foreground hover:bg-[#1E293B]/80"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              window.location.href = "/calendario";
            }}
            className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 flex items-center gap-2"
          >
            <CalendarRange className="h-4 w-4" />
            Reprogramar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
