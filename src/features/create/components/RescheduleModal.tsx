import { useState, useMemo, useEffect } from "react";
import {
    format,
    startOfWeek,
    addDays,
    subWeeks,
    addWeeks,
    isSameDay,
    parseISO,
    startOfDay,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isBefore,
    isAfter,
} from "date-fns";
import { es } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    X,
    Check,
    Loader2,
    CalendarRange,
    Move,
    AlertTriangle,
} from "lucide-react";
import { useHoy } from "@/features/today/hooks/useHoy";
import { patchSubtask } from "@/api/services/subtack";
import { queryCache } from "@/lib/queryCache";
import type { ExistingTask } from "./ConflictResolutionModal";

interface RescheduleModalProps {
    open: boolean;
    onClose: () => void;
    task: ExistingTask | null;
    onRescheduleComplete: () => void; // callback after successful reschedule
}

export default function RescheduleModal({
    open,
    task,
    onClose,
    onRescheduleComplete,
}: RescheduleModalProps) {
    const initialDate = task
        ? startOfDay(new Date()) // Start on today's week
        : startOfDay(new Date());

    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [monthPickerDate, setMonthPickerDate] = useState(new Date());
    const [isMoving, setIsMoving] = useState(false);
    const [moveError, setMoveError] = useState<string | null>(null);

    const { vencidas, para_hoy, proximas, loading, refetch } = useHoy({ days_ahead: 60 });

    const studyLimitHours = useMemo(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    }, []);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
    const today = useMemo(() => startOfDay(new Date()), []);

    // Reset when task or open state changes
    useEffect(() => {
        if (open && task) {
            setSelectedDate(null);
            setMoveError(null);
            setIsMoving(false);
            setCurrentDate(startOfDay(new Date()));
            setMonthPickerDate(new Date());
        }
    }, [open, task]);

    // Combine all tasks
    const allActivities = useMemo(() => {
        const combined: any[] = [
            ...(vencidas || []),
            ...(para_hoy || []),
            ...(proximas || []),
        ];
        return combined.map((item) => {
            const dateStr = item.target_date;
            return {
                id: item.id,
                date: dateStr ? startOfDay(parseISO(dateStr)) : null,
                dateKey: dateStr,
                title: item.title,
                course: item.activity?.course?.name || "Actividad",
                durationNum: parseFloat(item.estimated_hours || 0),
                status: item.status,
                activityId: item.activity?.id,
            };
        });
    }, [vencidas, para_hoy, proximas]);

    const dayStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allActivities.forEach((act) => {
            if (act.dateKey) {
                stats[act.dateKey] = (stats[act.dateKey] || 0) + act.durationNum;
            }
        });
        return stats;
    }, [allActivities]);

    const getActivitiesForDay = (day: Date) => {
        return allActivities.filter((a) => a.date && isSameDay(a.date, day));
    };

    const updateWeekAndMonth = (newDate: Date) => {
        setCurrentDate(newDate);
        if (showMonthPicker) setMonthPickerDate(newDate);
    };

    const handlePrevWeek = () => updateWeekAndMonth(subWeeks(currentDate, 1));
    const handleNextWeek = () => updateWeekAndMonth(addWeeks(currentDate, 1));
    const handleGoToToday = () => updateWeekAndMonth(today);

    const isDateDisabled = (day: Date) => {
        // Can't move to the past
        if (isBefore(day, today)) return true;
        // Can't move past deadline
        if (task?.deadline) {
            try {
                const deadline = startOfDay(parseISO(task.deadline));
                if (isAfter(day, deadline)) return true;
            } catch { /* ignore */ }
        }
        return false;
    };

    const handleSelectDay = (day: Date) => {
        if (isDateDisabled(day)) return;
        setSelectedDate(day);
        setMoveError(null);
    };

    const handleConfirmMove = async () => {
        if (!selectedDate || !task) return;
        setMoveError(null);
        setIsMoving(true);

        const newDateKey = format(selectedDate, "yyyy-MM-dd");

        // Check if target day would exceed limit
        const currentHoursNewDay = dayStats[newDateKey] || 0;
        const taskHours = task.hours;
        // Exclude the task's own hours from its current day if moving
        const newTotal = currentHoursNewDay + taskHours;

        if (newTotal > studyLimitHours) {
            setMoveError(
                `Ese día ya tiene ${currentHoursNewDay.toFixed(1)}h programadas. Agregar ${taskHours.toFixed(1)}h excedería tu límite de ${studyLimitHours.toFixed(1)}h.`
            );
            setIsMoving(false);
            return;
        }

        try {
            await patchSubtask(task.activityId, task.id, {
                target_date: newDateKey,
            });
            // Invalidate cache and refetch
            queryCache.invalidateByPrefix("hoy:");
            queryCache.invalidate("activities");
            await refetch();
            onRescheduleComplete();
        } catch (error: any) {
            console.error("Error al mover tarea:", error);
            setMoveError("No se pudo mover la tarea. Intenta de nuevo.");
        } finally {
            setIsMoving(false);
        }
    };

    // Month picker weeks
    const monthPickerWeeks = useMemo(() => {
        const monthStart = startOfMonth(monthPickerDate);
        const monthEnd = endOfMonth(monthPickerDate);
        const startW = startOfWeek(monthStart, { weekStartsOn: 1 });
        const weeks: Date[][] = [];
        let day = startW;
        while (day <= monthEnd || weeks.length < 6) {
            const week: Date[] = [];
            for (let i = 0; i < 7; i++) {
                week.push(day);
                day = addDays(day, 1);
            }
            weeks.push(week);
            if (day > monthEnd && weeks.length >= 4) break;
        }
        return weeks;
    }, [monthPickerDate]);

    const handleMonthPickerSelectWeek = (weekStart: Date) => {
        setCurrentDate(weekStart);
        setMonthPickerDate(weekStart);
        setShowMonthPicker(false);
    };

    const weekRangeLabel = `${format(startDate, "d")} – ${format(
        addDays(startDate, 6),
        "d MMM yyyy",
        { locale: es }
    )}`;

    // Escape key
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (showMonthPicker) {
                    setShowMonthPicker(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onClose, showMonthPicker]);

    if (!open || !task) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-[950px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Reprogramming Mode Banner */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-blue-500/10 border-b border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black text-xs text-blue-400 uppercase tracking-[0.15em]">
                                Modo Reprogramación
                            </span>
                            <p className="text-slate-300 text-sm mt-0.5">
                                Debes mover{" "}
                                <span className="text-white font-bold">
                                    "{task.title}"
                                </span>{" "}
                                ({task.hours.toFixed(1)}h) a un nuevo día
                                {task.deadline && (
                                    <>
                                        {" "}antes del{" "}
                                        <span className="text-amber-400 font-bold">
                                            {format(parseISO(task.deadline), "d 'de' MMM", { locale: es })}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-2 md:mt-0 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 rounded-xl transition-all shrink-0"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
                                showMonthPicker
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20"
                            }`}
                        >
                            <CalendarIcon className="w-4 h-4" />
                            Mes
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePrevWeek}
                                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleGoToToday}
                                className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400 text-[10px] font-bold uppercase tracking-wider"
                            >
                                Hoy
                            </button>
                            <button
                                type="button"
                                onClick={handleNextWeek}
                                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <span className="text-sm font-bold text-white ml-1 capitalize">
                            {weekRangeLabel}
                        </span>
                    </div>
                </div>

                {/* Month Picker */}
                {showMonthPicker && (
                    <div className="px-6 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    type="button"
                                    onClick={() => setMonthPickerDate(subMonths(monthPickerDate, 1))}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold text-white capitalize">
                                    {format(monthPickerDate, "MMMM yyyy", { locale: es })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMonthPickerDate(addMonths(monthPickerDate, 1))}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {monthPickerWeeks.map((week, wi) => {
                                const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
                                const isCurrentWeek = weekDays.some((wd) => isSameDay(wd, week[0]));
                                return (
                                    <button
                                        key={wi}
                                        type="button"
                                        onClick={() => handleMonthPickerSelectWeek(weekStart)}
                                        className={`grid grid-cols-7 gap-1 w-full rounded-xl py-1 transition-all cursor-pointer ${
                                            isCurrentWeek
                                                ? "bg-blue-500/15 border border-blue-500/30"
                                                : "hover:bg-slate-800/60 border border-transparent"
                                        }`}
                                    >
                                        {week.map((day, di) => {
                                            const isInMonth = day.getMonth() === monthPickerDate.getMonth();
                                            const isToday2 = isSameDay(day, today);
                                            return (
                                                <div
                                                    key={di}
                                                    className={`text-center text-xs py-1 rounded-lg ${
                                                        isToday2
                                                            ? "bg-blue-600 text-white font-bold"
                                                            : isInMonth
                                                            ? "text-slate-300"
                                                            : "text-slate-600"
                                                    }`}
                                                >
                                                    {format(day, "d")}
                                                </div>
                                            );
                                        })}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Week View */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Cargando calendario...
                        </p>
                    </div>
                ) : (
                    <div className="px-4 pb-2">
                        <div className="grid grid-cols-7 gap-2">
                            {weekDays.map((day) => {
                                const dayKey = format(day, "yyyy-MM-dd");
                                const dayActivities = getActivitiesForDay(day);
                                const isToday2 = isSameDay(day, today);
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const disabled = isDateDisabled(day);

                                const hoursUsed = dayStats[dayKey] || 0;
                                // If the task is currently on this day, subtract it (it would move away)
                                const adjustedHours = hoursUsed;
                                const availableHours = Math.max(0, studyLimitHours - adjustedHours);
                                const isOverloaded = adjustedHours > studyLimitHours;
                                const wouldExceed = adjustedHours + task.hours > studyLimitHours;

                                // Highlight the task being moved
                                const isTaskCurrentDay = dayActivities.some(
                                    (a) => String(a.id) === String(task.id)
                                );

                                return (
                                    <div key={dayKey} className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDay(day)}
                                            disabled={disabled}
                                            className={`flex flex-col items-center p-2.5 rounded-xl border-t-[3px] transition-all ${
                                                disabled
                                                    ? "opacity-30 cursor-not-allowed border-slate-800 bg-slate-800/20"
                                                    : isSelected
                                                    ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]"
                                                    : isTaskCurrentDay
                                                    ? "bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/15 cursor-pointer"
                                                    : wouldExceed
                                                    ? "bg-red-500/5 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
                                                    : isToday2
                                                    ? "bg-blue-500/10 border-blue-500/60 hover:bg-blue-500/15 cursor-pointer"
                                                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 cursor-pointer"
                                            }`}
                                        >
                                            <span
                                                className={`text-[10px] font-black uppercase tracking-wider ${
                                                    isSelected
                                                        ? "text-blue-400"
                                                        : isTaskCurrentDay
                                                        ? "text-amber-400"
                                                        : isToday2
                                                        ? "text-blue-400"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {format(day, "EEE", { locale: es })}
                                            </span>
                                            <span
                                                className={`text-lg font-black mt-0.5 ${
                                                    isSelected
                                                        ? "text-white"
                                                        : isTaskCurrentDay
                                                        ? "text-amber-300"
                                                        : isToday2
                                                        ? "text-blue-300"
                                                        : "text-slate-200"
                                                }`}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock
                                                    className={`w-3 h-3 ${
                                                        isOverloaded
                                                            ? "text-red-400"
                                                            : availableHours > 2
                                                            ? "text-emerald-400"
                                                            : "text-amber-400"
                                                    }`}
                                                />
                                                <span
                                                    className={`text-[9px] font-bold ${
                                                        isOverloaded
                                                            ? "text-red-400"
                                                            : availableHours > 2
                                                            ? "text-emerald-400"
                                                            : "text-amber-400"
                                                    }`}
                                                >
                                                    {availableHours % 1 === 0
                                                        ? availableHours
                                                        : availableHours.toFixed(1)}
                                                    h disp.
                                                </span>
                                            </div>
                                            {isTaskCurrentDay && (
                                                <span className="text-[8px] font-bold text-amber-400 mt-0.5">
                                                    Día actual
                                                </span>
                                            )}
                                            {isSelected && (
                                                <div className="mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                </div>
                                            )}
                                        </button>

                                        {/* Tasks for this day */}
                                        <div className="mt-1.5 flex-1 min-h-[100px] max-h-[160px] overflow-y-auto rounded-xl bg-slate-900/40 border border-slate-800/40 p-1.5 custom-scrollbar-reschedule">
                                            {dayActivities.length > 0 ? (
                                                <div className="space-y-1">
                                                    {dayActivities.map((act) => {
                                                        const isTheTask = String(act.id) === String(task.id);
                                                        return (
                                                            <div
                                                                key={act.id}
                                                                className={`px-2 py-1.5 rounded-lg text-[10px] leading-tight transition-colors ${
                                                                    isTheTask
                                                                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-200"
                                                                        : act.status === "DONE"
                                                                        ? "bg-slate-800/30 text-slate-500 line-through"
                                                                        : "bg-slate-800/50 text-slate-300"
                                                                }`}
                                                                title={`${act.title} (${act.durationNum}h)`}
                                                            >
                                                                <span className="font-semibold line-clamp-2">
                                                                    {isTheTask && (
                                                                        <Move className="w-3 h-3 inline mr-1 text-amber-400" />
                                                                    )}
                                                                    {act.title}
                                                                </span>
                                                                {isTheTask && (
                                                                    <span className="block text-[9px] text-amber-400 mt-0.5 font-bold">
                                                                        Mover esta tarea
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <span className="text-[9px] text-slate-600 font-medium italic">
                                                        Sin tareas
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Error message */}
                {moveError && (
                    <div className="mx-6 mb-2 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-xs text-red-400 font-medium">{moveError}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60">
                    <div className="text-xs text-slate-400">
                        {selectedDate ? (
                            <span>
                                Mover a:{" "}
                                <span className="text-white font-bold capitalize">
                                    {format(selectedDate, "EEEE d 'de' MMMM", {
                                        locale: es,
                                    })}
                                </span>
                            </span>
                        ) : (
                            <span className="italic">Selecciona un nuevo día para esta tarea</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmMove}
                            disabled={!selectedDate || isMoving}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                selectedDate && !isMoving
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer"
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                            }`}
                        >
                            {isMoving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Moviendo...
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Confirmar movimiento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar-reschedule::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar-reschedule::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-reschedule::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar-reschedule {
                    scrollbar-width: thin;
                    scrollbar-color: #334155 transparent;
                }
            `}</style>
        </div>
    );
}
