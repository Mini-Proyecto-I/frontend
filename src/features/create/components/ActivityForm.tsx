import { useState } from "react";
import { Calendar, ChevronDown, ClipboardList, Save } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import SubtaskForm, { Subtarea } from "@/features/create/components/SubtaskForm";

const ActivityForm = () => {
  const [titulo, setTitulo] = useState("");
  const [curso, setCurso] = useState("");
  const [tipo, setTipo] = useState("Examen");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
  
  // Tipos de actividad disponibles
  const activityTypes = ["Examen", "Tarea", "Proyecto"];

  const addSubtarea = () => {
    setSubtareas([
      ...subtareas,
      { id: Date.now(), nombre: "", fechaObjetivo: "", horas: "" },
    ]);
  };

  const removeSubtarea = (id: number) => {
    setSubtareas(subtareas.filter((s) => s.id !== id));
  };

  const updateSubtarea = (id: number, field: keyof Subtarea, value: string) => {
    setSubtareas(subtareas.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const inputClass =
    "w-full rounded-lg bg-[#111827] border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <div className="flex-1 min-h-screen overflow-y-auto bg-[#111827]">
      <div className="max-w-[880px] mx-auto px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Dashboard</span>
          <span>›</span>
          <span>Actividades</span>
          <span>›</span>
          <span className="text-foreground font-medium">Nueva actividad</span>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground">Crear nueva actividad</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          Añade un nuevo examen, tarea, o proyecto a tu plan de estudio.
        </p>

        {/* Detalles de la actividad */}
        <div className="rounded-xl border border-border bg-[#1E293B] p-6 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center">
                Detalles de la actividad
                <InfoTooltip text="Información general sobre la tarea o evento." />
              </h2>
              <p className="text-xs text-muted-foreground">
                Información general sobre la tarea o evento.
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Título:</span> <span className="text-[#9CA3AF]">¿Qué tienes que hacer?</span> <span className="text-primary">*</span>
              <InfoTooltip text="Escribe un título descriptivo para identificar la actividad rápidamente." />
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="e.j. Examen final de cálculo"
              className={inputClass}
            />
          </div>

          {/* Curso + Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Curso:</span> <span className="text-[#9CA3AF]">¿A qué curso pertenece?</span> <span className="text-primary">*</span>
                <InfoTooltip text="Selecciona el curso al que pertenece esta actividad." />
              </label>
              <div className="relative">
                <select
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Selecciona un curso</option>
                  <option value="calculo">Cálculo</option>
                  <option value="algebra">Álgebra</option>
                  <option value="fisica">Física</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Tipo:</span> <span className="text-[#9CA3AF]">¿Qué tipo de actividad es?</span> <span className="text-primary">*</span>
                <InfoTooltip text="Selecciona si es un examen, tarea o proyecto." />
              </label>
              <div className="flex items-center gap-5 mt-3">
                {activityTypes.map((t) => (
                  <label 
                    key={t} 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setTipo(t)}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={t}
                      checked={tipo === t}
                      onChange={(e) => setTipo(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        tipo === t
                          ? "border-[#3B82F6] bg-[#3B82F6]"
                          : "border-muted-foreground"
                      }`}
                    >
                      {tipo === t && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="mt-5.5">
              <label className="block text-sm font-medium mb-1">
                <span className="text-white">Fecha de entrega:</span> <span className="text-[#9CA3AF]">¿Cuándo la tienes que entregar?</span> <span className="text-primary">*</span>
                <InfoTooltip text="Indica la fecha máxima o límite de entrega de esta actividad." />
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  placeholder="mm/dd/yyyy"
                  className={`${inputClass} pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Fecha del evento:</span> <span className="text-[#9CA3AF]">¿Cuándo es el evento asociado?</span>
                <InfoTooltip text="Úsala cuando exista una fecha concreta en la que sucede el evento, por ejemplo un examen o presentación." />
              </label>
              <div className="text-[#9CA3AF] text-xs mb-1">(Opcional)</div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  placeholder="mm/dd/yyyy"
                  className={`${inputClass} pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Descripción</span> <span className="text-[#9CA3AF] text-xs">(Opcional)</span>
              <InfoTooltip text="Añade notas o detalles específicos sobre esta actividad." />
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Añade detalles específicos o notas sobre esta actividad..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Plan de estudio / Subtareas */}
        <SubtaskForm
          subtareas={subtareas}
          onAdd={addSubtarea}
          onRemove={removeSubtarea}
          onUpdate={updateSubtarea}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg bg-[#1E293B] border border-border text-muted-foreground text-sm font-medium hover:bg-[#1E293B]/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Guardar actividad
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;
