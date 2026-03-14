import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO, startOfDay, startOfMonth, endOfMonth, addMonths, subMonths, isBefore, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { useHoy } from "@/features/today/hooks/useHoy";
import UnifiedCalendarModal, { type UnifiedCalendarDay } from "./UnifiedCalendarModal";

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

    const handleGoToToday = () => {
        updateWeekAndMonth(today);
    };

    const days: UnifiedCalendarDay[] = useMemo(() => {
        return weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayActivities = getActivitiesForDay(day);
            const disabled = isDateDisabled(day);
            const isSelected = !!selectedDate && isSameDay(day, selectedDate);
            const backendHours = dayStats[dayKey] || 0;
            const plannedHours = plannedDayStats[dayKey] || 0;
            const totalHours = backendHours + plannedHours;
            const availableHours = Math.max(0, studyLimitHours - totalHours);
            const hasAvailability = availableHours > 0;
            const plannedForDay = plannedByDate[dayKey] || [];

            return {
                key: dayKey,
                date: day,
                disabled,
                isToday: isSameDay(day, today),
                isSelected,
                availabilityHours: availableHours,
                actionLabel: disabled ? undefined : isSelected ? "Seleccionado" : hasAvailability ? "Programar aquí" : "Excede el límite",
                tasks: [
                    ...dayActivities.map((act) => ({
                        id: act.id,
                        title: act.title,
                        hoursLabel: `${act.durationNum}h`,
                        muted: act.status === "DONE",
                    })),
                    ...plannedForDay.map((sub) => ({
                        id: `planned-${sub.id}`,
                        title: sub.title || "Subtarea planeada",
                        hoursLabel: `${sub.hours}h (plan)`,
                    })),
                ],
            };
        });
    }, [dayStats, getActivitiesForDay, isDateDisabled, plannedByDate, plannedDayStats, selectedDate, studyLimitHours, today, weekDays]);

    return (
        <UnifiedCalendarModal
            open
            onClose={onClose}
            title="Seleccionar fecha objetivo"
            subtitle="Elige el día en el calendario en el que planeas completar esta subtarea."
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
                    ? `Seleccionado: ${format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}`
                    : undefined
            }
            onConfirm={handleConfirm}
            confirmDisabled={!selectedDate}
            confirmLabel="Aceptar día"
            zIndexClassName="z-[80]"
        />
    );
}
