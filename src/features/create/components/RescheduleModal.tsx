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
    CalendarRange,
    AlertTriangle,
} from "lucide-react";
import { useHoy } from "@/features/today/hooks/useHoy";
import { patchSubtask } from "@/api/services/subtask";
import { queryCache } from "@/lib/queryCache";
import type { ExistingTask } from "./ConflictResolutionModal";
import UnifiedCalendarModal, { type UnifiedCalendarDay } from "./UnifiedCalendarModal";

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

    const days: UnifiedCalendarDay[] = weekDays.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayActivities = getActivitiesForDay(day);
        const disabled = isDateDisabled(day);
        const isSelected = !!selectedDate && isSameDay(day, selectedDate);
        const hoursUsed = dayStats[dayKey] || 0;
        const availableHours = Math.max(0, studyLimitHours - hoursUsed);
        const wouldExceed = hoursUsed + task.hours > studyLimitHours;
        const isTaskCurrentDay = dayActivities.some((a) => String(a.id) === String(task.id));

        return {
            key: dayKey,
            date: day,
            disabled,
            isToday: isSameDay(day, today),
            isSelected,
            availabilityHours: availableHours,
            actionLabel: disabled ? undefined : isSelected ? "Seleccionado" : wouldExceed ? "Excede el límite" : "Mover aquí",
            emphasize: isTaskCurrentDay ? "currentTask" : wouldExceed ? "warning" : isSameDay(day, today) ? "today" : undefined,
            tasks: dayActivities.map((act) => {
                const isTheTask = String(act.id) === String(task.id);
                return {
                    id: act.id,
                    title: act.title,
                    hoursLabel: `${act.durationNum}h`,
                    muted: act.status === "DONE",
                    highlighted: isTheTask,
                    highlightLabel: isTheTask ? "Mover esta tarea" : undefined,
                };
            }),
        };
    });

    return (
        <UnifiedCalendarModal
            open
            onClose={onClose}
            title="Reprogramar tarea"
            subtitle={
                moveError
                    ? `No se puede mover a ese día: ${moveError}`
                    : "Selecciona un nuevo día con disponibilidad."
            }
            topBanner={
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
                                Mueve{" "}
                                <span className="text-white font-bold">"{task.title}"</span>{" "}
                                ({task.hours.toFixed(1)}h)
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
                    {moveError && (
                        <div className="mt-3 md:mt-0 md:ml-4 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-[11px] text-red-400 font-medium">{moveError}</p>
                        </div>
                    )}
                </div>
            }
            loading={loading}
            weekRangeLabel={weekRangeLabel}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onGoToToday={handleGoToToday}
            showMonthPicker={showMonthPicker}
            onToggleMonthPicker={() => setShowMonthPicker((prev) => !prev)}
            monthPickerDate={monthPickerDate}
            onPrevMonth={() => setMonthPickerDate(subMonths(monthPickerDate, 1))}
            onNextMonth={() => setMonthPickerDate(addMonths(monthPickerDate, 1))}
            monthPickerWeeks={monthPickerWeeks}
            onSelectMonthWeek={handleMonthPickerSelectWeek}
            days={days}
            onSelectDay={handleSelectDay}
            selectedDateLabel={
                selectedDate
                    ? `Mover a: ${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}`
                    : undefined
            }
            onConfirm={handleConfirmMove}
            confirmDisabled={!selectedDate || isMoving}
            confirmLabel="Confirmar movimiento"
            confirmLoading={isMoving}
            confirmLoadingLabel="Moviendo..."
            zIndexClassName="z-[100]"
        />
    );
}
