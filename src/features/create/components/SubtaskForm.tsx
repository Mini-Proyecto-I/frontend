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
    errors?: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } };
    onClearError?: (subtaskId: number, field: string) => void;
    fechaEntrega?: string; // Fecha de entrega de la actividad para validar
}

const SubtaskForm = ({ subtareas, onAdd, onRemove, onUpdate, errors, onClearError, fechaEntrega }: SubtaskFormProps) => {
    // Función helper para obtener la fecha de hoy en formato YYYY-MM-DD
    const getTodayDate = (): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString().split('T')[0];
    };

    // Función helper para obtener la fecha máxima (fecha de entrega o hoy)
    const getMaxDate = (): string => {
        if (fechaEntrega) {
            return fechaEntrega;
        }
        return getTodayDate();
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
                        const hasErrors = Object.keys(subErrors).length > 0;
                        return (
                            <div key={sub.id} className="space-y-2">
                                <div
                                    className="grid grid-cols-[1fr_160px_100px_48px] gap-3 bg-[#1F2937]/50 border border-slate-700/50 rounded-xl px-3 py-2"
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
                                        <div className="relative">
                                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none z-10" />
                                            <input
                                                type="date"
                                                value={sub.fechaObjetivo}
                                                min={getTodayDate()}
                                                max={getMaxDate()}
                                                onChange={(e) => {
                                                    onUpdate(sub.id, "fechaObjetivo", e.target.value);
                                                    onClearError?.(sub.id, "fechaObjetivo");
                                                }}
                                                className={`w-full h-10 rounded-lg text-sm pl-7 pr-2 py-1.5 focus:outline-none border transition-colors bg-[#1F2937]/50 border-slate-700/50 text-slate-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${subErrors.fechaObjetivo ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                                            />
                                        </div>
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
                                    </div>
                                    <div className="flex flex-col py-1.5">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={sub.horas}
                                                onChange={(e) => {
                                                    onUpdate(sub.id, "horas", e.target.value);
                                                    onClearError?.(sub.id, "horas");
                                                }}
                                                className={`w-full h-10 rounded-lg text-sm text-center py-1.5 focus:outline-none border pr-7 transition-colors bg-[#1F2937]/50 border-slate-700/50 text-slate-200 ${subErrors.horas ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                                hr
                                            </span>
                                        </div>
                                        {subErrors.horas && (
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
                                                <p className="text-xs text-red-500 font-medium leading-tight">{subErrors.horas}</p>
                                            </div>
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
