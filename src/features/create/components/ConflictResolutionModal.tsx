import { useState, useEffect } from "react";
import {
    format,
    parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    Timer,
    Pencil,
    Move,
    X,
    ChevronRight,
    ArrowLeft,
    Users,
} from "lucide-react";

// Tipos
export interface ConflictInfo {
    date: string; // YYYY-MM-DD
    totalHours: number; // horas totales (existentes + planeadas)
    limitHours: number;
    excessHours: number;
    existingTasks: ExistingTask[];
    plannedTasks: PlannedTask[];
}

export interface ExistingTask {
    id: string | number;
    activityId: string | number;
    title: string;
    hours: number;
    course: string;
    status: string;
    deadline?: string;
}

export interface PlannedTask {
    subtaskId: number;
    title: string;
    hours: number;
}

interface ConflictResolutionModalProps {
    open: boolean;
    onClose: () => void;
    conflict: ConflictInfo | null;
    onReduceCurrentHours: (subtaskId: number) => void;
    onMoveCurrentDate: (subtaskId: number) => void;
    onChangeExistingHours: (
        task: ExistingTask,
        newHours: number
    ) => Promise<boolean>; // returns success
    onMoveExistingTask: (task: ExistingTask) => void;
}

const formatDateLabel = (dateStr: string): string => {
    try {
        const date = parseISO(dateStr);
        return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
        return dateStr;
    }
};

type ModalView = "main" | "modify_current" | "modify_existing" | "select_existing_task" | "change_hours_existing";

export default function ConflictResolutionModal({
    open,
    onClose,
    conflict,
    onReduceCurrentHours,
    onMoveCurrentDate,
    onChangeExistingHours,
    onMoveExistingTask,
}: ConflictResolutionModalProps) {
    const [view, setView] = useState<ModalView>("main");
    const [selectedExistingTask, setSelectedExistingTask] = useState<ExistingTask | null>(null);
    const [newHoursValue, setNewHoursValue] = useState("");
    const [hoursError, setHoursError] = useState<string | null>(null);
    const [isSavingHours, setIsSavingHours] = useState(false);
    // Para seleccionar cuál subtarea planeada modificar cuando hay varias
    const [selectedPlannedSubtaskId, setSelectedPlannedSubtaskId] = useState<number | null>(null);

    // Reset state when conflict changes or modal opens/closes
    useEffect(() => {
        if (open && conflict) {
            setView("main");
            setSelectedExistingTask(null);
            setNewHoursValue("");
            setHoursError(null);
            setIsSavingHours(false);
            // Si solo hay una subtarea planeada, seleccionarla por defecto
            if (conflict.plannedTasks.length === 1) {
                setSelectedPlannedSubtaskId(conflict.plannedTasks[0].subtaskId);
            } else {
                setSelectedPlannedSubtaskId(null);
            }
        }
    }, [open, conflict]);

    // Escape key
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (view !== "main") {
                    setView("main");
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, view, onClose]);

    if (!open || !conflict) return null;

    const handleBack = () => {
        if (view === "change_hours_existing") {
            setView("select_existing_task");
            setNewHoursValue("");
            setHoursError(null);
        } else if (view === "select_existing_task") {
            setView("main");
        } else if (view === "modify_current" || view === "modify_existing") {
            setView("main");
        } else {
            onClose();
        }
    };

    const handleReduceCurrent = () => {
        if (selectedPlannedSubtaskId !== null) {
            onReduceCurrentHours(selectedPlannedSubtaskId);
            onClose();
        }
    };

    const handleMoveCurrent = () => {
        if (selectedPlannedSubtaskId !== null) {
            onMoveCurrentDate(selectedPlannedSubtaskId);
            onClose();
        }
    };

    const handleSelectExistingTask = (task: ExistingTask) => {
        setSelectedExistingTask(task);
        setNewHoursValue(task.hours.toString());
        setHoursError(null);
    };

    const handleSaveExistingHours = async () => {
        if (!selectedExistingTask) return;
        setHoursError(null);

        const newH = parseFloat(newHoursValue);
        if (!Number.isFinite(newH) || newH <= 0) {
            setHoursError("Ingresa un número válido mayor a 0.");
            return;
        }
        if (newH >= selectedExistingTask.hours) {
            setHoursError(
                `Debe ser menor a ${selectedExistingTask.hours}h para liberar espacio.`
            );
            return;
        }

        setIsSavingHours(true);
        try {
            const success = await onChangeExistingHours(selectedExistingTask, newH);
            if (success) {
                onClose();
            } else {
                setHoursError("No se pudo actualizar. Intenta de nuevo.");
            }
        } catch {
            setHoursError("Error al actualizar las horas. Intenta de nuevo.");
        } finally {
            setIsSavingHours(false);
        }
    };

    const handleMoveExisting = () => {
        if (selectedExistingTask) {
            onMoveExistingTask(selectedExistingTask);
            onClose();
        }
    };

    // Calculate how much space is freed by the changed hours
    const freedHours = selectedExistingTask
        ? selectedExistingTask.hours - (parseFloat(newHoursValue) || 0)
        : 0;

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-[640px] bg-[#111827] border border-amber-500/30 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ============ Header ============ */}
                <div className="relative px-6 pt-6 pb-4">
                    {view !== "main" && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="absolute left-5 top-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-5 top-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-white tracking-tight">
                                {view === "main" && "Conflicto de horas detectado"}
                                {view === "modify_current" && "Modificar tu tarea actual"}
                                {view === "modify_existing" && "Modificar tareas anteriores"}
                                {view === "select_existing_task" && "Seleccionar tarea a modificar"}
                                {view === "change_hours_existing" && "Cambiar horas"}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1 capitalize">
                                {formatDateLabel(conflict.date)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ============ Content ============ */}
                <div className="px-6 pb-6">
                    {/* ── MAIN VIEW ── */}
                    {view === "main" && (
                        <>
                            {/* Conflict summary */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-white">Resumen del conflicto</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-red-400">
                                            {conflict.totalHours.toFixed(1)}h
                                        </span>
                                        <span className="text-slate-500">/</span>
                                        <span className="text-sm font-bold text-slate-300">
                                            {conflict.limitHours.toFixed(1)}h límite
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                (conflict.totalHours / conflict.limitHours) * 100
                                            )}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-red-400 mt-2 font-medium">
                                    Exceso de{" "}
                                    <span className="font-black">
                                        +{conflict.excessHours.toFixed(1)}h
                                    </span>{" "}
                                    sobre el límite diario de estudio.
                                </p>
                            </div>

                            {/* Tasks on this day */}
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Tareas programadas este día
                                </p>
                                <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1 custom-scrollbar-conflict">
                                    {conflict.existingTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                                <span className="text-slate-300 truncate">{task.title}</span>
                                            </div>
                                            <span className="text-slate-400 text-xs font-bold shrink-0 ml-2">
                                                {task.hours.toFixed(1)}h
                                            </span>
                                        </div>
                                    ))}
                                    {conflict.plannedTasks.map((task) => (
                                        <div
                                            key={`plan-${task.subtaskId}`}
                                            className="flex items-center justify-between px-3 py-2 bg-blue-900/30 border border-blue-500/30 rounded-xl text-sm"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                                <span className="text-blue-200 truncate">
                                                    {task.title || "Nueva subtarea"}
                                                </span>
                                                <span className="text-[10px] text-blue-400 font-bold px-1.5 py-0.5 bg-blue-500/10 rounded-md shrink-0">
                                                    Nueva
                                                </span>
                                            </div>
                                            <span className="text-blue-300 text-xs font-bold shrink-0 ml-2">
                                                {task.hours.toFixed(1)}h
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* If multiple planned tasks, let user select which one to modify */}
                            {conflict.plannedTasks.length > 1 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        ¿Cuál subtarea nueva quieres ajustar?
                                    </p>
                                    <div className="space-y-1.5">
                                        {conflict.plannedTasks.map((task) => (
                                            <button
                                                key={task.subtaskId}
                                                type="button"
                                                onClick={() => setSelectedPlannedSubtaskId(task.subtaskId)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                                                    selectedPlannedSubtaskId === task.subtaskId
                                                        ? "bg-blue-600/20 border border-blue-500/40 text-blue-200"
                                                        : "bg-slate-800/30 border border-slate-700/50 text-slate-300 hover:border-slate-600"
                                                }`}
                                            >
                                                <span className="truncate">
                                                    {task.title || "Nueva subtarea"}
                                                </span>
                                                <span className="text-xs font-bold shrink-0 ml-2">
                                                    {task.hours.toFixed(1)}h
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution options */}
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                ¿Cómo deseas resolver el conflicto?
                            </p>
                            <div className="space-y-2.5">
                                {/* Option 1: Modify current task */}
                                <button
                                    type="button"
                                    onClick={() => setView("modify_current")}
                                    disabled={selectedPlannedSubtaskId === null}
                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all text-left group ${
                                        selectedPlannedSubtaskId !== null
                                            ? "bg-blue-600/5 border-blue-500/20 hover:bg-blue-600/10 hover:border-blue-500/40 cursor-pointer"
                                            : "bg-slate-800/20 border-slate-700/30 opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/20">
                                        <Pencil className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">
                                            Ajustar mi tarea nueva
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Reducir horas o cambiar la fecha de tu subtarea.
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0" />
                                </button>

                                {/* Option 2: Modify existing tasks */}
                                {conflict.existingTasks.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setView("select_existing_task")}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 cursor-pointer transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20">
                                            <Users className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white">
                                                Modificar tareas anteriores
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Cambiar horas o mover las tareas que ya tenías programadas.
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Close button */}
                            <div className="mt-5 flex justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-slate-300 transition-colors"
                                >
                                    Resolver después
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── MODIFY CURRENT VIEW ── */}
                    {view === "modify_current" && (
                        <>
                            <p className="text-sm text-slate-300 mb-5">
                                Elige cómo quieres ajustar tu subtarea nueva para resolver el conflicto del{" "}
                                <span className="text-white font-bold capitalize">
                                    {formatDateLabel(conflict.date)}
                                </span>
                                .
                            </p>

                            <div className="space-y-3">
                                {/* Reduce hours */}
                                <button
                                    type="button"
                                    onClick={handleReduceCurrent}
                                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20">
                                        <Timer className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">
                                            Reducir horas estimadas
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Volverás al formulario para cambiar las horas de esta subtarea.
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                                </button>

                                {/* Move date */}
                                <button
                                    type="button"
                                    onClick={handleMoveCurrent}
                                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border bg-violet-500/5 border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-500/40 cursor-pointer transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20">
                                        <CalendarDays className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">
                                            Mover a otra fecha
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Volverás al formulario para elegir una fecha diferente.
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 shrink-0" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── SELECT EXISTING TASK VIEW ── */}
                    {view === "select_existing_task" && (
                        <>
                            <p className="text-sm text-slate-300 mb-4">
                                Selecciona la tarea anterior que deseas modificar para liberar espacio:
                            </p>

                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar-conflict mb-5">
                                {conflict.existingTasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => handleSelectExistingTask(task)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                                            selectedExistingTask?.id === task.id
                                                ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20"
                                                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {task.course} · {task.hours.toFixed(1)}h
                                            </p>
                                        </div>
                                        {selectedExistingTask?.id === task.id && (
                                            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-2" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Actions for selected task */}
                            {selectedExistingTask && (
                                <div className="space-y-2.5">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        ¿Qué quieres hacer con "{selectedExistingTask.title}"?
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView("change_hours_existing");
                                            setNewHoursValue(selectedExistingTask.hours.toString());
                                            setHoursError(null);
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Timer className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">Cambiar horas estimadas</p>
                                            <p className="text-xs text-slate-400">Reducir las horas de esta tarea.</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleMoveExisting}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl border bg-violet-500/5 border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-500/40 cursor-pointer transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                                            <Move className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">Mover a otro día</p>
                                            <p className="text-xs text-slate-400">Reprogramar esta tarea en el calendario.</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CHANGE HOURS EXISTING VIEW ── */}
                    {view === "change_hours_existing" && selectedExistingTask && (
                        <>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-5">
                                <p className="text-sm font-bold text-white mb-1">
                                    {selectedExistingTask.title}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {selectedExistingTask.course} · Horas actuales:{" "}
                                    <span className="text-white font-bold">
                                        {selectedExistingTask.hours.toFixed(1)}h
                                    </span>
                                </p>
                            </div>

                            <p className="text-sm text-slate-300 mb-4">
                                Reduce las horas estimadas para liberar espacio:
                            </p>

                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                        Nuevas horas
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            max={selectedExistingTask.hours}
                                            value={newHoursValue}
                                            onChange={(e) => {
                                                setNewHoursValue(e.target.value);
                                                setHoursError(null);
                                            }}
                                            className={`w-full h-11 rounded-xl bg-[#1F2937]/50 border text-sm text-center text-slate-200 focus:outline-none focus:ring-2 transition-colors pr-8 ${
                                                hoursError
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : "border-slate-700/50 focus:ring-blue-500 focus:border-blue-500"
                                            }`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                            hr
                                        </span>
                                    </div>
                                </div>
                                {freedHours > 0 && (
                                    <div className="pt-5">
                                        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <p className="text-xs font-bold text-emerald-400">
                                                Liberas {freedHours.toFixed(1)}h
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hoursError && (
                                <div className="flex items-center gap-2 mb-4 text-red-400">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <p className="text-xs font-medium">{hoursError}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mt-5">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex-1 h-11 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-slate-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveExistingHours}
                                    disabled={isSavingHours}
                                    className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                                >
                                    {isSavingHours ? "Guardando..." : "Guardar cambio"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar-conflict::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar-conflict::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-conflict::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar-conflict {
                    scrollbar-width: thin;
                    scrollbar-color: #334155 transparent;
                }
            `}</style>
        </div>
    );
}
