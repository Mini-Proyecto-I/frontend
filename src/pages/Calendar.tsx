import React, { useState, useMemo, useEffect } from "react";
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
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Loader2, CalendarRange, CalendarCheck, Move, CirclePlus, X, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/button";
import { useHoy } from "@/features/today/hooks/useHoy";
import { patchSubtask, deleteSubtask } from "@/api/services/subtack";
import { queryCache } from "@/lib/queryCache";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Calendar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [selectedSubtask, setSelectedSubtask] = useState<any | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [overriddenDates, setOverriddenDates] = useState<Record<string, string>>({});
    // Estado local para actualizaciones optimistas del conflicto
    const [conflictOverrides, setConflictOverrides] = useState<Record<string, boolean>>({});
    // Picker de semanas tipo "Mes" (mini calendario)
    const [showWeekPicker, setShowWeekPicker] = useState(false);
    const [weekPickerDate, setWeekPickerDate] = useState<Date>(new Date());

    const { vencidas, para_hoy, proximas, loading, refetch } = useHoy({ days_ahead: 30 });

    const returnTo = useMemo(() => {
        const state = location.state as any;
        return state?.returnTo as string | undefined;
    }, [location.state]);

    const conflictDateKeyFromState = useMemo(() => {
        const state = location.state as any;
        return state?.conflictDateKey as string | undefined;
    }, [location.state]);

    // Si venimos desde algún flujo externo (Hoy / Detalle) con tarea a reprogramar,
    // enfocamos la semana de la tarea y activamos directamente el modo reubicación.
    useEffect(() => {
        const state = location.state as any;
        const focusDate = state?.focusDate as string | undefined;
        const incomingSubtask = state?.reprogramSubtask as
            | {
                  id: string;
                  activityId: string;
                  title: string;
                  deadline?: string;
                  dateKey?: string;
                  durationNum?: number;
              }
            | undefined;

        if (focusDate) {
            try {
                setCurrentDate(startOfDay(parseISO(focusDate)));
            } catch {
                // Ignorar si llega un valor inválido
            }
        }

        if (incomingSubtask) {
            const dateKey = incomingSubtask.dateKey;
            const date = dateKey ? startOfDay(parseISO(dateKey)) : null;
            setSelectedSubtask({
                ...incomingSubtask,
                date,
            });
            setIsMoving(true);
        }

        // Limpiamos el state para que no re-aplique en futuros re-renders o navegaciones internas.
        navigate(location.pathname, { replace: true, state: {} });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const studyLimitHours = useMemo(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    }, []);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    const handleOpenWeekPicker = () => {
        setWeekPickerDate(currentDate);
        setShowWeekPicker(true);
    };

    const handleCloseWeekPicker = () => {
        setShowWeekPicker(false);
    };

    const handleGoToToday = () => {
        const today = startOfDay(new Date());
        setCurrentDate(today);
        setWeekPickerDate(today);
        setShowWeekPicker(false);
    };

    const toggleDayExpansion = (dayKey: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayKey]: !prev[dayKey]
        }));
    };

    // Combine all tasks from useHoy and normalize them
    const allActivities = useMemo(() => {
        const combined: any[] = [...(vencidas || []), ...(para_hoy || []), ...(proximas || [])];
        return combined.map(item => {
            const overridenDate = overriddenDates[item.id];
            const dateStr = overridenDate || item.target_date;
            
            // Usar el override de conflicto si existe, sino el valor del backend
            const hasConflictOverride = item.id in conflictOverrides;
            const isConflicted = hasConflictOverride ? conflictOverrides[item.id] : item.is_conflicted;

            return {
                id: item.id,
                date: dateStr ? startOfDay(parseISO(dateStr)) : null,
                dateKey: dateStr,
                course: item.activity?.course?.name || "Actividad",
                title: item.title,
                duration: item.estimated_hours ? `${item.estimated_hours} h` : "0 h",
                durationNum: parseFloat(item.estimated_hours || 0),
                status: item.status,
                courseId: item.activity?.course?.id,
                activityId: item.activity?.id,
                deadline: item.activity?.deadline,
                isConflicted: isConflicted
            };
        });
    }, [vencidas, para_hoy, proximas, overriddenDates, conflictOverrides]);

    // Calculate hours used per day
    const dayStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allActivities.forEach(act => {
            if (act.dateKey) {
                const key = act.dateKey;
                stats[key] = (stats[key] || 0) + act.durationNum;
            }
        });
        return stats;
    }, [allActivities]);

    const getActivitiesForDay = (day: Date) => {
        return allActivities.filter(a => a.date && isSameDay(a.date, day));
    };

    // Semanas que se muestran dentro del mini picker (por mes), igual que en el botón "Mes" de subtareas
    const weekPickerWeeks = useMemo(() => {
        const monthStart = startOfMonth(weekPickerDate);
        const monthEnd = endOfMonth(weekPickerDate);
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
    }, [weekPickerDate]);

    const handleSelectWeekFromPicker = (weekStart: Date) => {
        // Sincronizar semana mostrada en /calendario con la semana elegida en el mini calendario
        setCurrentDate(weekStart);
        setWeekPickerDate(weekStart);
        setShowWeekPicker(false);
    };

    const handleSelectForMove = (activity: any) => {
        setSelectedSubtask(activity);
        setIsMoving(true);
    };

    const handleCancelMove = () => {
        setSelectedSubtask(null);
        setIsMoving(false);
    };

    const handleConfirmMove = async (day: Date) => {
        if (!selectedSubtask) return;

        // Verify deadline
        if (selectedSubtask.deadline) {
            const deadlineDate = startOfDay(parseISO(selectedSubtask.deadline));
            if (day > deadlineDate) {
                alert(`No puedes mover esta tarea después de su fecha límite (${format(deadlineDate, "d 'de' MMMM", { locale: es })}).`);
                return;
            }
        }

        const newDateKey = format(day, "yyyy-MM-dd");
        const subtaskId = selectedSubtask.id;
        const activityId = selectedSubtask.activityId;
        const subtaskHours = selectedSubtask.durationNum;

        // Calcular horas del nuevo día (optimista)
        // dayStats ya incluye esta tarea en su día actual, así que:
        // - Si se mueve a otro día: nuevo día = horas actuales + horas de esta tarea
        // - Si se mueve al mismo día: no hay cambio
        const oldDateKey = selectedSubtask.dateKey;
        let currentHoursNewDay = dayStats[newDateKey] || 0;
        
        if (oldDateKey !== newDateKey) {
            // Si se mueve a un día diferente, agregar las horas de esta tarea al nuevo día
            currentHoursNewDay = currentHoursNewDay + subtaskHours;
        }
        
        const willHaveConflict = currentHoursNewDay > studyLimitHours;

        // Calcular también el estado del día "origen" (donde estaba la subtarea) tras quitarla
        // para poder informar a Hoy si el conflicto se resolvió.
        const conflictDateKey = conflictDateKeyFromState || oldDateKey;
        const oldDayHoursBefore = conflictDateKey ? (dayStats[conflictDateKey] || 0) : 0;
        const oldDayHoursAfter =
            conflictDateKey && oldDateKey === conflictDateKey && oldDateKey !== newDateKey
                ? Math.max(0, oldDayHoursBefore - subtaskHours)
                : oldDayHoursBefore;

        const availableOldDay = Math.max(0, studyLimitHours - oldDayHoursAfter);
        const overworkOldDay = Math.max(0, oldDayHoursAfter - studyLimitHours);
        const resolvedOldDay = oldDayHoursAfter <= studyLimitHours;

        // Actualización optimista: fecha y conflicto
        setOverriddenDates(prev => ({
            ...prev,
            [subtaskId]: newDateKey
        }));
        
        // Actualizar estado de conflicto optimista solo para esta tarjeta
        setConflictOverrides(prev => ({
            ...prev,
            [subtaskId]: willHaveConflict
        }));

        handleCancelMove();

        try {
            await patchSubtask(activityId, subtaskId, {
                target_date: newDateKey
            });
            
            // Refrescar datos en segundo plano sin bloquear la UI
            queryCache.invalidate('activities');
            Promise.resolve(refetch()).then(() => {
                // Limpiar el override después de que el refetch termine
                // El backend ahora tiene el valor correcto
                setConflictOverrides(prev => {
                    const next = { ...prev };
                    delete next[subtaskId];
                    return next;
                });
            }).catch(() => {
                // Si falla, mantener el override optimista
            });

            // Si venimos desde Hoy por conflicto, volver a Hoy con un resultado para mostrar modal.
            if (returnTo === "hoy" && conflictDateKey) {
                navigate("/hoy", {
                    state: {
                        conflictOutcome: {
                            dateKey: conflictDateKey,
                            usedHours: oldDayHoursAfter,
                            limitHours: studyLimitHours,
                            availableHours: availableOldDay,
                            overworkHours: overworkOldDay,
                            resolved: resolvedOldDay,
                        },
                    },
                });
            }
        } catch (error) {
            console.error("Error al reprogramar:", error);
            // Revertir cambios optimistas en caso de error
            setOverriddenDates(prev => {
                const next = { ...prev };
                delete next[subtaskId];
                return next;
            });
            setConflictOverrides(prev => {
                const next = { ...prev };
                delete next[subtaskId];
                return next;
            });
            // Refrescar para obtener el estado correcto del backend
            refetch();
        }
    };

    const handleDelete = async (activityId: any, subtaskId: any) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarea?")) return;
        try {
            await deleteSubtask(activityId, subtaskId);
            refetch();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setMenuOpenId(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    // Helper to get consistent colors based on courseId or Name
    const getCourseTheme = (courseId: any) => {
        const themes = [
            { border: "border-blue-500", text: "text-blue-400", bg: "hover:bg-blue-500/5", ring: "ring-blue-500/60 shadow-blue-500/40", glow: "" },
            { border: "border-emerald-500", text: "text-emerald-400", bg: "hover:bg-emerald-500/5", ring: "ring-emerald-500/60 shadow-emerald-500/40", glow: "" },
            { border: "border-amber-500", text: "text-amber-400", bg: "hover:bg-amber-500/5", ring: "ring-amber-500/60 shadow-amber-500/40", glow: "" },
            { border: "border-rose-500", text: "text-rose-400", bg: "hover:bg-rose-500/5", ring: "ring-rose-500/60 shadow-rose-500/40", glow: "" },
            { border: "border-violet-500", text: "text-violet-400", bg: "hover:bg-violet-500/5", ring: "ring-violet-500/60 shadow-violet-500/40", glow: "" },
            { border: "border-cyan-500", text: "text-cyan-400", bg: "hover:bg-cyan-500/5", ring: "ring-cyan-500/60 shadow-cyan-500/40", glow: "" },
        ];
        const index = typeof courseId === 'number' ? courseId % themes.length : (courseId ? courseId.length % themes.length : 0);
        return themes[index];
    };

    const weekRangeLabel = (() => {
        const endDate = addDays(startDate, 6);
        const startMonth = format(startDate, "MMMM", { locale: es });
        const endMonth = format(endDate, "MMMM", { locale: es });
        const year = format(startDate, "yyyy", { locale: es });

        if (startMonth === endMonth) {
            // Mismo mes: Semana del 10 al 16 de marzo, 2026
            return `Semana del ${format(startDate, "d")} al ${format(
                endDate,
                "d 'de' MMMM, yyyy",
                { locale: es }
            )}`;
        }

        // Mes distinto: Semana del 28 de febrero al 3 de marzo, 2026
        return `Semana del ${format(startDate, "d 'de' MMMM", {
            locale: es,
        })} al ${format(endDate, "d 'de' MMMM", {
            locale: es,
        })}, ${year}`;
    })();
    const today = useMemo(() => startOfDay(new Date()), []);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Cargando calendario...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-in fade-in duration-500">
            {/* Relocation Mode Banner */}
            {isMoving && selectedSubtask && (
                <div className="flex flex-col md:flex-row items-center justify-between p-5 mb-8 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-in slide-in-from-top duration-300 gap-4">
                    <div className="flex items-center gap-4 text-blue-500">
                        <div className="bg-blue-500 text-white p-2 rounded-lg shrink-0">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Modo Reubicación Activo</span>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Selecciona un espacio antes del <span className="text-white font-bold">{selectedSubtask.deadline ? format(parseISO(selectedSubtask.deadline), "d 'de' MMMM", { locale: es }) : 'límite'}</span> para mover <span className="text-white font-bold">'{selectedSubtask.title}'</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {selectedSubtask.deadline && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                    Límite: {format(parseISO(selectedSubtask.deadline), "d 'de' MMM", { locale: es })}
                                </span>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleCancelMove}
                            className="px-6 py-2 text-xs font-black uppercase tracking-widest text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition-all rounded-xl"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    {!isMoving && (
                        <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20 text-blue-500">
                            <CalendarRange className="w-8 h-8" />
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <h2 className="text-3xl font-black text-white tracking-tight">
                            {weekRangeLabel}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                            Usa el selector para saltar a semanas de otros meses sin mover este calendario.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrevWeek}
                        className="rounded-xl bg-slate-800/50 border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextWeek}
                        className="rounded-xl bg-slate-800/50 border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleOpenWeekPicker}
                        className="rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60 transition-all px-4 py-2"
                    >
                        Elegir semana
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleGoToToday}
                        className="rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60 transition-all px-4 py-2"
                    >
                        Hoy
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5 h-full overflow-visible items-start mt-2">
                {weekDays.map((day, index) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayActivities = getActivitiesForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isPastDay = day < today;
                    const isWeekend = index >= 5;
                    const isExpanded = expandedDays[dayKey];

                    const visibleActivities = isExpanded ? dayActivities : dayActivities.slice(0, 2);
                    const hasMore = dayActivities.length > 2;

                    // Calculate availability
                    const currentHours = dayStats[dayKey] || 0;
                    const availableHours = Math.max(0, studyLimitHours - currentHours);

                    const isAfterDeadline = selectedSubtask?.deadline && day > startOfDay(parseISO(selectedSubtask.deadline));
                    const isDeadlineDay = selectedSubtask?.deadline && isSameDay(day, parseISO(selectedSubtask.deadline));
                    const canFitSelected = selectedSubtask && !isSameDay(day, selectedSubtask.date) && availableHours >= selectedSubtask.durationNum && !isAfterDeadline;

                    return (
                        <div key={day.toString()} className="flex flex-col gap-5 min-h-[450px]">
                            <div
                                onDragOver={(e) => {
                                    if (!isMoving || isPastDay) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                    if (!isMoving || isPastDay) return;
                                    e.preventDefault();
                                    handleConfirmMove(day);
                                }}
                                className={`flex flex-col items-center p-4 rounded-2xl border-t-4 transition-all 
                                    ${isPastDay ? "opacity-40 pointer-events-none" : ""}
                                    ${isToday
                                        ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/5"
                                        : "bg-slate-800/30 border-slate-800"
                                    } 
                                 ${isWeekend ? "opacity-90" : ""} 
                                 ${isMoving && canFitSelected ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''}
                                 ${isMoving && isAfterDeadline ? 'opacity-20 pointer-events-none grayscale' : ''}
                                 ${isMoving && isDeadlineDay ? 'ring-2 ring-amber-500 bg-amber-500/10 animate-pulse transition-all scale-[1.02] z-10' : ''}`}
                            >
                                {isMoving && isDeadlineDay && (
                                    <div className="absolute -top-3 px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-lg z-20">
                                        FECHA LÍMITE
                                    </div>
                                )}
                                <span className={`text-xs font-black uppercase tracking-wider ${isToday ? "text-blue-500" : isMoving && isDeadlineDay ? "text-amber-500" : "text-slate-400"
                                    }`}>
                                    {format(day, "EEEE d", { locale: es })}
                                </span>
                                <span className={`text-[10px] mt-2 font-black uppercase tracking-widest ${canFitSelected ? 'text-emerald-400' : isMoving && isDeadlineDay ? 'text-amber-400' : 'text-slate-500'}`}>
                                    {isMoving && isAfterDeadline ? 'BLOQUEADO' : `Disponibilidad: ${availableHours % 1 === 0 ? availableHours : availableHours.toFixed(1)}h`}
                                </span>
                            </div>

                            <div className="flex-1 space-y-4">
                                {dayActivities.length > 0 ? (
                                    <>
                                        <div className="space-y-4">
                                            {visibleActivities.map((activity) => {
                                                const theme = getCourseTheme(activity.courseId || activity.course);
                                                const isDone = activity.status === "DONE";
                                                const isSelected = selectedSubtask && selectedSubtask.id === activity.id;
                                                const shouldDim = isMoving && !isSelected;
                                                const isMenuOpen = menuOpenId === activity.id;
                                                const isConflicted = activity.isConflicted;

                                                const conflictTheme = {
                                                    border: "border-[#F59E0B]",
                                                    text: "text-[#F59E0B]",
                                                    bg: "hover:bg-[#F59E0B]/5",
                                                    ring: "ring-[#F59E0B]/60 shadow-[#F59E0B]/40",
                                                    glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                                };

                                                const activeTheme = isConflicted ? conflictTheme : theme;

                                                return (
                                                    <div
                                                        key={activity.id}
                                                        draggable={!isMoving}
                                                        onDragStart={(e) => {
                                                            if (isMoving) return;
                                                            e.dataTransfer.setData("activityId", activity.id);
                                                            handleSelectForMove(activity);
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isMoving) {
                                                                if (isSelected) handleCancelMove();
                                                                return;
                                                            }
                                                            setSelectedSubtask(activity);
                                                            setIsMoving(true);
                                                        }}
                                                        className={`relative p-5 rounded-2xl bg-[#111827] border border-slate-800/80 shadow-xl shadow-black/20 group border-l-4 ${activeTheme.border} transition-all duration-300 cursor-grab active:cursor-grabbing
                                                            ${isConflicted ? activeTheme.glow : ''}
                                                            ${isSelected ? `ring-4 ${activeTheme.ring} translate-y-[-4px] scale-[1.02] z-20` : 'hover:translate-y-[-2px]'} 
                                                            ${shouldDim ? 'opacity-40 grayscale-[0.5]' : ''}
                                                            ${isDone && !isSelected ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                                                    >
                                                        {isConflicted && !isSelected && (
                                                            <div className="absolute top-2 left-2 flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Conflicto</span>
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className={`absolute -top-3 -right-2 px-3 py-1 font-black text-[10px] tracking-widest uppercase rounded-full bg-blue-500 text-white shadow-lg z-30 animate-bounce`}>
                                                                SELECCIONADO
                                                            </div>
                                                        )}

                                                        <div className="absolute top-4 right-3 z-30">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setMenuOpenId(isMenuOpen ? null : activity.id);
                                                                }}
                                                                className="text-slate-500 hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </button>

                                                            {isMenuOpen && (
                                                                <div
                                                                    className="absolute right-0 mt-2 w-48 bg-[#1f2937] border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Link to={`/actividad/${activity.activityId}`} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-700/30">
                                                                        <Eye className="w-4 h-4 text-blue-400" />
                                                                        Ver detalle
                                                                    </Link>
                                                                    <button
                                                                        onClick={() => navigate(`/actividad/${activity.activityId}`)}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-700/30"
                                                                    >
                                                                        <Pencil className="w-4 h-4 text-emerald-400" />
                                                                        Editar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(activity.activityId, activity.id)}
                                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-rose-500" />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${activeTheme.text}`}>
                                                            {activity.course}
                                                        </span>
                                                        <h3 className={`text-white font-bold text-sm mt-1.5 leading-tight ${isDone ? 'line-through opacity-50' : ''}`}>
                                                            {activity.title}
                                                        </h3>
                                                        <div className="text-slate-400 text-xs mt-4 flex items-center justify-between font-medium">
                                                            <div className="flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                                <span className={isSelected ? 'bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-black' : ''}>
                                                                    {activity.duration}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {hasMore && !isMoving && (
                                            <button
                                                onClick={() => toggleDayExpansion(dayKey)}
                                                className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-800/30 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-slate-800/60 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        Ver menos
                                                        <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Mostrar todo ({dayActivities.length - 2} más)
                                                        <ChevronLeft className="w-3.5 h-3.5 -rotate-90 group-hover/btn:translate-y-0.5 transition-transform" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    !isMoving && (
                                        <div className="h-full min-h-[150px] flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/10 transition-all hover:bg-blue-500/5 hover:border-blue-500/30 group/empty">
                                            <div className="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center mb-4 group-hover/empty:scale-110 transition-transform border border-slate-700/30 group-hover/empty:border-blue-500/30">
                                                <CalendarCheck className="w-24 h-24 text-blue-500 drop-shadow-2xl" strokeWidth={1.5} />
                                            </div>
                                            <span className="text-slate-200 text-xs italic text-center font-bold tracking-widest uppercase group-hover/empty:text-blue-200 transition-colors">
                                                Sin actividades
                                            </span>
                                        </div>
                                    )
                                )}

                                {isMoving && canFitSelected && !isPastDay && (
                                    <button
                                        onClick={() => handleConfirmMove(day)}
                                        className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-500/50 bg-blue-500/5 rounded-2xl group cursor-pointer hover:bg-blue-500/10 transition-all animate-pulse"
                                    >
                                        <CirclePlus className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-blue-500 text-xs font-black uppercase tracking-widest">Mover aquí</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Modal para elegir semana: mini calendario tipo "Mes" del WeeklyDatePicker */}
            {showWeekPicker && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseWeekPicker();
                    }}
                >
                    <div
                        className="w-full max-w-[680px] bg-transparent border-none shadow-none animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Copia del overlay de "Mes" del WeeklyDatePicker */}
                        <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="relative bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 pt-5">
                                {/* Botón cerrar arriba a la derecha, dentro del contenedor */}
                                <button
                                    type="button"
                                    onClick={handleCloseWeekPicker}
                                    className="absolute right-3 top-3 inline-flex items-center justify-center h-7 w-7 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                                    aria-label="Cerrar selector de semana"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Month nav */}
                                <div className="flex items-center justify-between mb-3 pr-6">
                                    <button
                                        type="button"
                                        onClick={() => setWeekPickerDate(subMonths(weekPickerDate, 1))}
                                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-bold text-white capitalize">
                                        {format(weekPickerDate, "MMMM yyyy", { locale: es })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setWeekPickerDate(addMonths(weekPickerDate, 1))}
                                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                                        <div
                                            key={d}
                                            className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1"
                                        >
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Week rows - clickable */}
                                {weekPickerWeeks.map((week, wi) => {
                                    const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
                                    const isCurrentWeek = weekDays.some((wd) =>
                                        isSameDay(wd, week[0])
                                    );
                                    return (
                                        <button
                                            key={wi}
                                            type="button"
                                            onClick={() => handleSelectWeekFromPicker(weekStart)}
                                            className={`grid grid-cols-7 gap-1 w-full rounded-xl py-1 transition-all cursor-pointer ${
                                                isCurrentWeek
                                                    ? "bg-blue-500/15 border border-blue-500/30"
                                                    : "hover:bg-slate-800/60 border border-transparent"
                                            }`}
                                        >
                                            {week.map((day, di) => {
                                                const isInMonth =
                                                    day.getMonth() === weekPickerDate.getMonth();
                                                const isToday2 = isSameDay(
                                                    day,
                                                    startOfDay(new Date())
                                                );
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
                        {/* Espacio inferior para que el modal respire visualmente */}
                        <div className="h-2" />
                    </div>
                </div>
            )}
        </div>
    );
}
