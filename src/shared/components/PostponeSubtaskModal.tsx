import { useState } from "react";
import { Clock, Info, X } from "lucide-react";
import { Button } from "@/shared/components/button";

interface PostponeSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function PostponeSubtaskModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false
}: PostponeSubtaskModalProps) {
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm(note);
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-[#0B1220] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Posponer subtarea
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-2">
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Esta acción actualizará el estado de la tarea a{" "}
            <span className="text-white font-medium">"Pospuesta"</span>.
            La fecha de entrega no se verá afectada.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Nota opcional
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Añade una nota sobre por qué pospones esta subtarea..."
              rows={4}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl text-white text-sm p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none placeholder:text-slate-600"
              disabled={isProcessing}
            />
            <div className="flex items-start gap-2 pt-1">
              <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">
                La nota es visible cuando revises la subtarea en el historial o sección de pospuestas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 mt-2 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20"
            disabled={isProcessing}
          >
            {isProcessing ? "Pospone..." : "Posponer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
