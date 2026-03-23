import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";
import { Loader2, History, Clock, CalendarRange, HelpCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getNotesOfSubtask as getPosponedLogs } from "@/api/services/posponedLog";
import { getNotesOfSubtask as getReprogrammingLogs } from "@/api/services/reprogrammingLog";

interface TaskHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtaskId: string | null;
  taskTitle: string;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  open,
  onOpenChange,
  subtaskId,
  taskTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && subtaskId) {
      fetchHistory();
    }
  }, [open, subtaskId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [posponed, reprogramming] = await Promise.all([
        getPosponedLogs(subtaskId!),
        getReprogrammingLogs(subtaskId!),
      ]);

      const combined = [
        ...posponed.map((log: any) => ({ ...log, type: "posponed" })),
        ...reprogramming.map((log: any) => ({ ...log, type: "reprogramming" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistory(combined);
    } catch (error) {
      console.error("Error fetching task history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0F172A] border-slate-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            Historial de la Tarea
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Historial completo para: <span className="text-blue-300 font-semibold">"{taskTitle}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-slate-400 text-sm font-medium">Buscando historial...</p>
            </div>
          ) : history.length > 0 ? (
            history.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} className="relative pl-6 pb-6 last:pb-2">
                {/* Timeline indicator */}
                <div className="absolute left-[7px] top-1 bottom-0 w-[2px] bg-slate-800" />
                <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-4 border-[#0F172A] z-10 ${
                  item.type === 'posponed' ? 'bg-purple-500' : 'bg-blue-500'
                }`} />

                <div className={`bg-slate-900/50 border border-slate-800 p-4 rounded-2xl transition-colors shadow-sm ${
                  item.type === 'posponed' ? 'hover:border-purple-500/30' : 'hover:border-blue-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      item.type === 'posponed' 
                        ? 'text-purple-400 bg-purple-500/10' 
                        : 'text-blue-400 bg-blue-500/10'
                    }`}>
                      {item.type === 'posponed' ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pospuesta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CalendarRange className="w-3 h-3" /> Reprogramada
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      {item.created_at ? format(parseISO(item.created_at), "d MMM, h:mm a", { locale: es }) : ""}
                    </span>
                  </div>

                  {item.type === 'posponed' ? (
                    <p className="text-sm text-slate-200 leading-relaxed italic">
                      "{item.note || "Sin nota descriptiva"}"
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">
                        De <span className="text-slate-300 font-medium">{format(parseISO(item.previous_date), "d 'de' MMMM", { locale: es })}</span> a <span className="text-blue-300 font-medium">{format(parseISO(item.new_date), "d 'de' MMMM", { locale: es })}</span>
                      </p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        <span className="text-slate-500 text-xs italic">Motivo:</span> {item.reason || "Sin motivo especificado"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-12 h-12 text-slate-700/50 mb-3" />
              <p className="text-slate-400 text-sm">No hay historial registrado para esta tarea.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl px-6"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
