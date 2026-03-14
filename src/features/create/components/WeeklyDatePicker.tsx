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
} from "lucide-react";
import { useHoy } from "@/features/today/hooks/useHoy";

interface PlannedSubtaskPreview {
    id: number | string;
    title: string;
    hours: number;
    date: string; // YYYY-MM-DD
}

interface WeeklyDatePickerProps {
    value: string; // YYYY-MM-DD de la subtarea actual
    onChange: (date: string) => void;
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
    onClose: () => void;
    // Subtareas que se planean añadir (aún no guardadas en backend),
    // para que afecten disponibilidad y se vean en azul.
    plannedSubtasks?: PlannedSubtaskPreview[];
}

export default function WeeklyDatePicker({
    value,
    onChange,
    minDate,
    maxDate,
    onClose,
    plannedSubtasks = [],
}: WeeklyDatePickerProps) {
    // Determinar la fecha inicial para centrar la semana:
    // 1) fecha ya seleccionada de esta subtarea
    // 2) última subtarea planeada
    // 3) hoy
    const lastPlannedDate =
        plannedSubtasks.length > 0
            ? plannedSubtasks[plannedSubtasks.length - 1].date
            : null;
    const initialDate = value
        ? startOfDay(parseISO(value))
        : lastPlannedDate
        ? startOfDay(parseISO(lastPlannedDate))
        : startOfDay(new Date());
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedDate, setSelectedDate] = useState<Date | null>(
        value ? startOfDay(parseISO(value)) : null
    );
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [monthPickerDate, setMonthPickerDate] = useState(new Date());

    // Fetch tasks (30 days of look-ahead for broad coverage)
    const { vencidas, para_hoy, proximas, loading } = useHoy({ days_ahead: 60 });

    const studyLimitHours = useMemo(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    }, []);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const updateWeekAndMonth = (newDate: Date) => {
        setCurrentDate(newDate);
        // Si el visor mensual está abierto, sincronizamos también el mes mostrado
        if (showMonthPicker) {
            setMonthPickerDate(newDate);
        }
    };

    const handlePrevWeek = () => {
        const newDate = subWeeks(currentDate, 1);
        updateWeekAndMonth(newDate);
    };

    const handleNextWeek = () => {
        const newDate = addWeeks(currentDate, 1);
        updateWeekAndMonth(newDate);
    };

    const today = useMemo(() => startOfDay(new Date()), []);

    // Combine all tasks and normalize
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
            };
        });
    }, [vencidas, para_hoy, proximas]);

    // Calculate hours used per día (backend)
    const dayStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allActivities.forEach((act) => {
            if (act.dateKey) {
                stats[act.dateKey] = (stats[act.dateKey] || 0) + act.durationNum;
            }
        });
        return stats;
    }, [allActivities]);

    // Horas de subtareas que se planean añadir (solo frontend)
    const plannedDayStats = useMemo(() => {
        const stats: Record<string, number> = {};
        plannedSubtasks.forEach((sub) => {
            if (sub.date && sub.hours > 0) {
                stats[sub.date] = (stats[sub.date] || 0) + sub.hours;
            }
        });
        return stats;
    }, [plannedSubtasks]);

    // Subtareas planeadas agrupadas por día para mostrarlas en la lista
    const plannedByDate = useMemo(() => {
        const map: Record<string, PlannedSubtaskPreview[]> = {};
        plannedSubtasks.forEach((sub) => {
            if (!sub.date) return;
            if (!map[sub.date]) map[sub.date] = [];
            map[sub.date].push(sub);
        });
        return map;
    }, [plannedSubtasks]);

    const getActivitiesForDay = (day: Date) => {
        return allActivities.filter((a) => a.date && isSameDay(a.date, day));
    };

    const isDateDisabled = (day: Date) => {
        if (minDate && isBefore(day, startOfDay(parseISO(minDate)))) return true;
        if (maxDate && isAfter(day, startOfDay(parseISO(maxDate)))) return true;
        return false;
    };

    const handleSelectDay = (day: Date) => {
        if (isDateDisabled(day)) return;
        setSelectedDate(day);
    };

    const handleConfirm = () => {
        if (selectedDate) {
            onChange(format(selectedDate, "yyyy-MM-dd"));
            onClose();
        }
    };

    // Month picker modal: generate weeks for display
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

    // Close on Escape key
    useEffect(() => {
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
    }, [onClose, showMonthPicker]);

    const handleGoToToday = () => {
        updateWeekAndMonth(today);
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-[820px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                        {/* Month picker toggle */}
                        <button
                            type="button"
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
                                showMonthPicker
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20"
                            }`}
                            title="Explorar por mes"
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

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Month Picker Overlay */}
                {showMonthPicker && (
                    <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4">
                            {/* Month nav */}
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

                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                                    (d) => (
                                        <div
                                            key={d}
                                            className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1"
                                        >
                                            {d}
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Week rows - clickable */}
                            {monthPickerWeeks.map((week, wi) => {
                                const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
                                const isCurrentWeek = weekDays.some((wd) =>
                                    isSameDay(wd, week[0])
                                );
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
                                            const isInMonth =
                                                day.getMonth() === monthPickerDate.getMonth();
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

                                const backendHours = dayStats[dayKey] || 0;
                                const plannedHours = plannedDayStats[dayKey] || 0;
                                const totalHours = backendHours + plannedHours;
                                const availableHours = Math.max(
                                    0,
                                    studyLimitHours - totalHours
                                );
                                const isOverloaded = totalHours > studyLimitHours;

                                const plannedForDay = plannedByDate[dayKey] || [];

                                return (
                                    <div key={dayKey} className="flex flex-col">
                                        {/* Day header - clickable */}
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDay(day)}
                                            disabled={disabled}
                                            className={`flex flex-col items-center p-2.5 rounded-xl border-t-[3px] transition-all ${
                                                disabled
                                                    ? "opacity-30 cursor-not-allowed border-slate-800 bg-slate-800/20"
                                                    : isSelected
                                                    ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]"
                                                    : isToday2
                                                    ? "bg-blue-500/10 border-blue-500/60 hover:bg-blue-500/15 cursor-pointer"
                                                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 cursor-pointer"
                                            }`}
                                        >
                                            <span
                                                className={`text-[10px] font-black uppercase tracking-wider ${
                                                    isSelected
                                                        ? "text-blue-400"
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
                                                        : isToday2
                                                        ? "text-blue-300"
                                                        : "text-slate-200"
                                                }`}
                                            >
                                                {format(day, "d")}
                                            </span>
                                            {/* Availability */}
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
                                            {isSelected && (
                                                <div className="mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                </div>
                                            )}
                                        </button>

                                        {/* Tasks list for the day (backend + planeadas) */}
                                        <div className="mt-1.5 flex-1 min-h-[90px] max-h-[140px] overflow-y-auto rounded-xl bg-slate-900/40 border border-slate-800/40 p-1.5 custom-scrollbar">
                                            {dayActivities.length > 0 || plannedForDay.length > 0 ? (
                                                <div className="space-y-1">
                                                    {dayActivities.map((act) => (
                                                        <div
                                                            key={act.id}
                                                            className={`px-2 py-1.5 rounded-lg text-[10px] leading-tight transition-colors ${
                                                                act.status === "DONE"
                                                                    ? "bg-slate-800/30 text-slate-500 line-through"
                                                                    : "bg-slate-800/50 text-slate-300"
                                                            }`}
                                                            title={`${act.title} (${act.durationNum}h)`}
                                                        >
                                                            <span className="font-semibold line-clamp-2">
                                                                {act.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {plannedForDay.map((sub) => (
                                                        <div
                                                            key={`planned-${sub.id}`}
                                                            className="px-2 py-1.5 rounded-lg text-[10px] leading-tight bg-blue-900/40 text-blue-100 border border-blue-500/40 transition-colors"
                                                            title={`${sub.title} (${sub.hours}h planeadas)`}
                                                        >
                                                            <span className="font-semibold line-clamp-2">
                                                                {sub.title || "Subtarea planeada"}
                                                            </span>
                                                            <span className="block text-[9px] text-blue-300 mt-0.5">
                                                                {sub.hours}h (plan)
                                                            </span>
                                                        </div>
                                                    ))}
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

                {/* Footer with actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60">
                    <div className="text-xs text-slate-400">
                        {selectedDate ? (
                            <span>
                                Seleccionado:{" "}
                                <span className="text-white font-bold capitalize">
                                    {format(selectedDate, "EEEE d 'de' MMMM, yyyy", {
                                        locale: es,
                                    })}
                                </span>
                            </span>
                        ) : (
                            <span className="italic">Selecciona un día en el calendario</span>
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
                            onClick={handleConfirm}
                            disabled={!selectedDate}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                selectedDate
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer"
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                            }`}
                        >
                            <Check className="w-3.5 h-3.5" />
                            Aceptar día
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom scrollbar styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #334155 transparent;
                }
            `}</style>
        </div>
    );
}
