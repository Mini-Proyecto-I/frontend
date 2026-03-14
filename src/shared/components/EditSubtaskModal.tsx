import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, Pencil, X, Trash2 } from "lucide-react";
import { Input } from "@/shared/components/input";
import { Button } from "@/shared/components/button";

type SaveResult =
  | { ok: true }
  | { ok: false; error?: string; handled?: boolean };

interface EditSubtaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  initialHours: string | number | null | undefined;
  onSave: (data: { title: string; estimatedHours: number }) => Promise<SaveResult> | SaveResult;
  onReprogram?: () => void;
  onDelete?: () => void;
}

export default function EditSubtaskModal({
  open,
  onOpenChange,
  initialTitle,
  initialHours,
  onSave,
  onReprogram,
  onDelete,
}: EditSubtaskModalProps) {
  const navigate = useNavigate();
  const [editTitle, setEditTitle] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const wasOpenRef = useRef(false);

  // Cargar valores SOLO cuando se abre (evita resets durante guardado/refetch)
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open && !wasOpen) {
      setEditError(null);
      setEditTitle(String(initialTitle ?? ""));
      const h = initialHours;
      setEditHours(h === undefined || h === null ? "" : String(h));
      setIsSavingEdit(false);
    }
  }, [open, initialTitle, initialHours]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[560px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="p-6 sm:p-7 relative">
          <button
            type="button"
            onClick={() => {
              if (isSavingEdit) return;
              onOpenChange(false);
            }}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Pencil className="w-6 h-6 text-blue-400" />
            </div>
            <div className="pr-8">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Editar subtarea
              </h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                Puedes ajustar el título y las horas. Para cambiar la fecha, usa{" "}
                <span className="text-blue-300 font-semibold">Reprogramar</span>.
              </p>
            </div>
          </div>

          <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Título
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-11 bg-[#1F2937]/60 border-slate-700/60 text-slate-200 rounded-xl focus-visible:ring-blue-500"
                placeholder="Título de la subtarea"
                disabled={isSavingEdit}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Horas estimadas
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                className="h-11 bg-[#1F2937]/60 border-slate-700/60 text-slate-200 rounded-xl focus-visible:ring-blue-500"
                disabled={isSavingEdit}
              />
            </div>

            {editError && (
              <p className="text-red-400 text-xs font-semibold">{editError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {onDelete && (
                <Button
                  onClick={onDelete}
                  className="h-11 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold border border-red-500/30 w-full sm:w-auto px-4"
                  disabled={isSavingEdit}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
              <Button
                onClick={() => {
                  if (onReprogram) {
                    onReprogram();
                    return;
                  }
                  navigate("/calendario");
                }}
                className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 w-full sm:w-auto px-4"
                disabled={isSavingEdit}
              >
                <CalendarRange className="w-4 h-4 mr-2" />
                Reprogramar
              </Button>
              <Button
                disabled={isSavingEdit}
                onClick={async () => {
                  setEditError(null);

                  const nextTitle = editTitle.trim();
                  if (!nextTitle) {
                    setEditError("El título no puede estar vacío.");
                    return;
                  }

                  const nextHours = parseFloat(String(editHours));
                  if (!Number.isFinite(nextHours) || nextHours <= 0) {
                    setEditError("Ingresa horas válidas (mayores a 0).");
                    return;
                  }

                  if (!Number.isInteger(nextHours * 2)) {
                    setEditError(
                      "Las horas deben ir en pasos de 0.5 (por ejemplo: 0.5, 1.0, 1.5)."
                    );
                    return;
                  }

                  setIsSavingEdit(true);
                  try {
                    const result = await onSave({
                      title: nextTitle,
                      estimatedHours: nextHours,
                    });

                    if (result?.ok) {
                      onOpenChange(false);
                      return;
                    }

                    if (result?.handled) {
                      // El caller abrió otro modal/flujo (p. ej. conflicto). No mostrar error genérico.
                      return;
                    }

                    setEditError(
                      result?.error ||
                        "No se pudo guardar los cambios. Verifica que las horas no excedan tu límite diario o ajusta la subtarea y vuelve a intentarlo."
                    );
                  } catch {
                    setEditError(
                      "No se pudo guardar los cambios. Revisa tu conexión y que las horas no excedan tu límite diario."
                    );
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-lg shadow-blue-600/20"
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

