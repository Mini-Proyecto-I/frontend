import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import SubtaskItem from "./SubtaskItem";
import AddSubtaskDialog from "./AddSubtaskDialog";

type FilterOption = "mostrar" | "fecha";

interface Subtask {
  id: string;
  activityId: string;
  title: string;
  date: string;
  dateOriginal?: string; // Fecha original en formato YYYY-MM-DD para el modal de edición
  hours: string;
  completed?: boolean;
  isActive?: boolean;
  todayBadge?: boolean;
}

interface StudyPlanSectionProps {
  subtasks?: Subtask[];
  activityId: string;
  onSubtaskStatusChange?: (subtaskId: string, newStatus: boolean) => void;
  onSubtaskUpdated?: () => void; // Callback para refrescar todas las subtareas después de editar
}

export default function StudyPlanSection({ 
  subtasks = [], 
  activityId,
  onSubtaskStatusChange,
  onSubtaskUpdated,
}: StudyPlanSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("mostrar");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Asegurar que subtasks sea siempre un array
  const validSubtasks = Array.isArray(subtasks) ? subtasks : [];

  // Filtrar y ordenar subtareas según el filtro activo
  const filteredSubtasks = useMemo(() => {
    if (validSubtasks.length === 0) {
      return [];
    }

    if (activeFilter === "fecha") {
      // Ordenar por fecha (las fechas vienen en formato "DD MMM")
      return [...validSubtasks].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        
        // Intentar parsear la fecha (formato: "10 nov")
        const parseDate = (dateStr: string): Date => {
          const months: { [key: string]: number } = {
            ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
            jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
          };
          const parts = dateStr.split(" ");
          if (parts.length === 2) {
            const day = parseInt(parts[0]);
            const month = months[parts[1].toLowerCase()];
            if (!isNaN(day) && month !== undefined) {
              const currentYear = new Date().getFullYear();
              return new Date(currentYear, month, day);
            }
          }
          return new Date(0);
        };
        
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    }
    return validSubtasks;
  }, [validSubtasks, activeFilter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Plan de estudio
        </h3>
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveFilter("mostrar")}
            className={`cursor-pointer transition-colors ${
              activeFilter === "mostrar"
                ? "text-blue-500 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Mostrar Todo
          </button>
          <span className="text-slate-500 dark:text-slate-500">|</span>
          <button
            type="button"
            onClick={() => setActiveFilter("fecha")}
            className={`cursor-pointer transition-colors ${
              activeFilter === "fecha"
                ? "text-blue-500 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Ordenar por fecha
          </button>
        </div>
      </div>

      {filteredSubtasks.length === 0 ? (
        <div className="text-center py-12 px-4">  
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            No hay subtareas registradas para esta actividad.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Puedes crear una oprimiendo el botón <span className="font-semibold text-blue-500 dark:text-blue-400">"Añadir Subtarea"</span> que se encuentra más abajo.
          </p>
        </div>
      ) : (
        filteredSubtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            id={subtask.id}
            activityId={subtask.activityId || activityId}
            title={subtask.title}
            date={subtask.date}
            dateOriginal={subtask.dateOriginal}
            hours={subtask.hours}
            completed={subtask.completed}
            isActive={subtask.isActive}
            todayBadge={subtask.todayBadge}
            onStatusChange={onSubtaskStatusChange}
            onSubtaskUpdated={onSubtaskUpdated}
          />
        ))
      )}

      <button
        type="button"
        onClick={() => setShowAddDialog(true)}
        className="cursor-pointer w-full py-3.5 rounded-xl border-2 border-dashed border-slate-500 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2.5 font-semibold"
      >
        <Plus className="size-5" />
        <span>Añadir Subtarea</span>
      </button>

      <AddSubtaskDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        activityId={activityId}
        onSubtaskCreated={() => {
          setShowAddDialog(false);
          if (onSubtaskUpdated) {
            onSubtaskUpdated();
          }
          // Recargar la página después de crear la subtarea
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
      />
    </section>
  );
}
