import { Calendar, Trash2, ClipboardList, Plus, ListTodo } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";

export interface Subtarea {
  id: number;
  nombre: string;
  fechaObjetivo: string;
  horas: string;
}

interface SubtaskFormProps {
  subtareas: Subtarea[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof Subtarea, value: string) => void;
}

const SubtaskForm = ({ subtareas, onAdd, onRemove, onUpdate }: SubtaskFormProps) => {
  return (
    <div className="rounded-xl border border-border bg-[#1E293B] p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center">
              Plan de estudio / Subtareas
              <InfoTooltip text="Divide la actividad en tareas más manejables para organizarte mejor." />
            </h2>
            <p className="text-xs text-muted-foreground">
              Divide la actividad en tareas más manejables.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          style={{
            backgroundColor: '#3B82F6',
            border: '1px solidrgb(79, 138, 232)',
            color: 'white'
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir subtarea
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_160px_100px_48px] gap-3 items-center px-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <InfoTooltip text="Escribe un nombre descriptivo para una tarea concreta que te ayude a completar la actividad." />
          Nombre subtarea <span className="text-primary">*</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <InfoTooltip text="Fecha objetivo para completar esta subtarea." />
          Fecha objetivo <span className="text-primary">*</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
          <InfoTooltip text="Horas estimadas para completar esta subtarea." />
          Est. Horas <span className="text-primary">*</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Acción
        </span>
      </div>

      {/* Subtarea rows */}
      <div className="space-y-2">
        {subtareas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="mb-3">
              <ListTodo className="h-10 w-10 text-[#3B82F6]" />
            </div>
            <p className="text-muted-foreground text-sm">
              Añade subtareas para organizar mejor tu actividad.
              <br />
              oprime el botón <span className="text-[#3B82F6] font-medium">"Añadir subtarea"</span>
            </p>
          </div>
        ) : (
          subtareas.map((sub) => (
            <div
              key={sub.id}
              className="grid grid-cols-[1fr_160px_100px_48px] gap-3 items-center bg-[#111827] rounded-lg px-2 py-1.5"
            >
              <input
                type="text"
                value={sub.nombre}
                onChange={(e) => onUpdate(sub.id, "nombre", e.target.value)}
                placeholder="ej. Revisar apuntes de clase"
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-2 py-1.5"
              />
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={sub.fechaObjetivo}
                  onChange={(e) => onUpdate(sub.id, "fechaObjetivo", e.target.value)}
                  className="w-full bg-[#111827] rounded-md text-sm text-foreground pl-7 pr-2 py-1.5 focus:outline-none border border-border [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={sub.horas}
                  onChange={(e) => onUpdate(sub.id, "horas", e.target.value)}
                  className="w-full bg-[#111827] rounded-md text-sm text-foreground text-center py-1.5 focus:outline-none border border-border pr-7"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  hr
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(sub.id)}
                className="group flex items-center justify-center h-8 w-8 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubtaskForm;
