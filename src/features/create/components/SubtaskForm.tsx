import { useState } from "react";
import { Calendar, Trash2, ClipboardList, Plus, ListTodo } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import WeeklyDatePicker from "@/features/create/components/WeeklyDatePicker";

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
    errors?: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } };
    onClearError?: (subtaskId: number, field: string) => void;
    fechaEntrega?: string; // Fecha de entrega de la actividad para validar
    // Nuevas props para resolución de conflictos
    highlightedSubtasks?: Record<number, "horas" | "fecha">;
    conflictDates?: Set<string>;
}

const SubtaskForm = ({ subtareas, onAdd, onRemove, onUpdate, errors, onClearError, fechaEntrega, highlightedSubtasks = {}, conflictDates = new Set() }: SubtaskFormProps) => {
    // Estado para controlar qué subtarea tiene abierto el date picker
    const [openDatePickerFor, setOpenDatePickerFor] = useState<number | null>(null);

    // Función helper para obtener la fecha de hoy en formato YYYY-MM-DD
    const getTodayDate = (): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString().split('T')[0];
    };

    // Función helper para obtener la fecha máxima (fecha de entrega o hoy)
    const getMaxDate = (): string | undefined => {
        if (fechaEntrega) {
            return fechaEntrega;
        }
        return undefined;
    };

    // Helper para formatear fecha para mostrar al usuario
    const formatDisplayDate = (dateStr: string): string => {
        if (!dateStr) return "";
        try {
            const date = parseISO(dateStr);
            return format(date, "d 'de' MMM, yyyy", { locale: es });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="rounded-3xl border border-slate-800/60 bg-[#111827] p-6 lg:p-8 mb-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center">
                            Plan de estudio / Subtareas
                            <InfoTooltip text="Divide la actividad en tareas más manejables para organizarte mejor." />
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                            Divide la actividad en tareas más manejables.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 bg-blue-600 text-white transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                >
                    <Plus className="h-4 w-4" />
                    Añadir subtarea
                </button>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_160px_100px_48px] gap-3 items-center px-2 mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <InfoTooltip text="Escribe un nombre descriptivo para una tarea concreta que te ayude a completar la actividad." />
                    Nombre subtarea <span className="text-blue-500">*</span>
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <InfoTooltip text="Fecha objetivo para completar esta subtarea." />
                    Fecha objetivo <span className="text-blue-500">*</span>
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                    <InfoTooltip text="Horas estimadas para completar esta subtarea." />
                    Est. Horas <span className="text-blue-500">*</span>
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Acción
                </span>
            </div>

            {/* Subtarea rows */}
            <div className="space-y-3">
                {subtareas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="mb-3">
                            <ListTodo className="h-10 w-10 text-blue-500" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">
                            Añade subtareas para organizar mejor tu actividad.
                            <br />
                            oprime el botón <span className="text-blue-500 font-bold">"Añadir subtarea"</span>
                        </p>
                    </div>
                ) : (
                    subtareas.map((sub) => {
                        const subErrors = errors?.[sub.id] || {};
                        const highlight = highlightedSubtasks[sub.id];
                        const isDateConflicted = sub.fechaObjetivo && conflictDates.has(sub.fechaObjetivo);
                        const highlightHoras = highlight === "horas";
                        const highlightFecha = highlight === "fecha";

                        return (
                            <div key={sub.id} className="space-y-2" data-subtask-id={sub.id}>
                                <div
                                    className={`grid grid-cols-[1fr_160px_100px_48px] gap-3 rounded-xl px-3 py-2 transition-all ${
                                        highlightHoras || highlightFecha
                                            ? "bg-amber-500/5 border border-amber-500/30 ring-1 ring-amber-500/20"
                                            : isDateConflicted
                                            ? "bg-red-500/5 border border-red-500/20"
                                            : "bg-[#1F2937]/50 border border-slate-700/50"
                                    }`}
                                >
                                    <div className="flex flex-col py-1.5">
                                        <input
                                            type="text"
                                            value={sub.nombre}
                                            onChange={(e) => {
                                                onUpdate(sub.id, "nombre", e.target.value);
                                                onClearError?.(sub.id, "nombre");
                                            }}
                                            placeholder="ej. Revisar apuntes de clase"
                                            className={`w-full h-10 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none px-3 py-1.5 border transition-colors bg-[#1F2937]/50 border-slate-700/50 ${subErrors.nombre ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                                        />
                                        {subErrors.nombre && (
                                            <div className="flex items-start gap-1.5 mt-1 px-2">
                                                <svg
                                                    className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <p className="text-xs text-red-500 font-medium leading-tight">{subErrors.nombre}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setOpenDatePickerFor(sub.id)}
                                            className={`relative w-full h-10 rounded-lg text-sm pl-7 pr-2 py-1.5 border transition-colors bg-[#1F2937]/50 text-left cursor-pointer hover:border-blue-500/50 hover:bg-[#1F2937]/70 ${
                                                highlightFecha
                                                    ? 'border-amber-500 ring-2 ring-amber-500/40 animate-pulse'
                                                    : subErrors.fechaObjetivo
                                                    ? 'border-red-500'
                                                    : isDateConflicted
                                                    ? 'border-red-500/50'
                                                    : sub.fechaObjetivo
                                                    ? 'border-blue-500/40 text-slate-200'
                                                    : 'border-slate-700/50 text-slate-500'
                                            }`}
                                        >
                                            <Calendar className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 ${highlightFecha ? 'text-amber-400' : 'text-slate-500'}`} />
                                            <span className={sub.fechaObjetivo ? 'text-slate-200' : 'text-slate-500'}>
                                                {sub.fechaObjetivo
                                                    ? formatDisplayDate(sub.fechaObjetivo)
                                                    : 'Seleccionar fecha'}
                                            </span>
                                        </button>
                                        {highlightFecha && (
                                            <p className="text-xs text-amber-400 font-medium mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                Cambia la fecha para resolver el conflicto
                                            </p>
                                        )}
                                        {subErrors.fechaObjetivo && (
                                            <div className="flex items-start gap-1.5 mt-1">
                                                <svg
                                                    className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <p className="text-xs text-red-500 font-medium leading-tight">{subErrors.fechaObjetivo}</p>
                                            </div>
                                        )}
                                        {openDatePickerFor === sub.id && (
                                            <WeeklyDatePicker
                                                value={sub.fechaObjetivo}
                                                onChange={(date) => {
                                                    onUpdate(sub.id, "fechaObjetivo", date);
                                                    onClearError?.(sub.id, "fechaObjetivo");
                                                }}
                                                minDate={getTodayDate()}
                                                maxDate={getMaxDate()}
                                                plannedSubtasks={subtareas
                                                    .filter(
                                                        (s) =>
                                                            s.id !== sub.id &&
                                                            s.fechaObjetivo &&
                                                            s.horas &&
                                                            parseFloat(s.horas) > 0
                                                    )
                                                    .map((s) => ({
                                                        id: s.id,
                                                        title: s.nombre || "Subtarea",
                                                        hours: parseFloat(s.horas),
                                                        date: s.fechaObjetivo,
                                                    }))}
                                                onClose={() => setOpenDatePickerFor(null)}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col py-1.5">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                value={sub.horas}
                                                onChange={(e) => {
                                                    onUpdate(sub.id, "horas", e.target.value);
                                                    onClearError?.(sub.id, "horas");
                                                }}
                                                className={`w-full h-10 rounded-lg text-sm text-center py-1.5 focus:outline-none border pr-7 transition-colors bg-[#1F2937]/50 text-slate-200 ${
                                                    highlightHoras
                                                        ? 'border-amber-500 ring-2 ring-amber-500/40 animate-pulse'
                                                        : subErrors.horas
                                                        ? 'border-red-500 focus:ring-red-500'
                                                        : 'border-slate-700/50 focus:ring-blue-500 focus:border-blue-500'
                                                }`}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                                hr
                                            </span>
                                        </div>
                                        {highlightHoras && (
                                            <p className="text-xs text-amber-400 font-medium mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                Reduce las horas
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-start py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => onRemove(sub.id)}
                                            className="group flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SubtaskForm;
